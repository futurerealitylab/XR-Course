import * as cg from "./cg.js";
import { G2 } from "../../util/g2.js";

export function Diagram(model, center, size, callback) {

   // INITIALIZE THE FLATTENED CUBES CONTAINING THE CANVAS FOR THE USER'S TWO EYES.

   let g2LR = [ new G2(false, 1024), new G2(false, 1024) ];
   model.add('square').color(2,2,2).view(0).setTxtr(g2LR[0].getCanvas());
   model.add('square').color(2,2,2).view(1).setTxtr(g2LR[1].getCanvas());

   // APPLICATION PROGRAMMER'S INTERFACE FOR MATRIX MANIPULATION.

   let matrix = [cg.mMultiply(cg.mTranslate(center),cg.mScale(size))],
       m = value => value ? matrix[matrix.length-1] = value : matrix[matrix.length-1];
   this.save     = ()   => matrix.push(m());
   this.restore  = ()   => matrix.pop();
   this.identity = ()   => { m(cg.mIdentity());                          return this; }
   this.move  = (x,y,z) => { m(cg.mMultiply(m(), cg.mTranslate(x,y,z))); return this; }
   this.turnX =  theta  => { m(cg.mMultiply(m(), cg.mRotateX(theta)));   return this; }
   this.turnY =  theta  => { m(cg.mMultiply(m(), cg.mRotateY(theta)));   return this; }
   this.turnZ =  theta  => { m(cg.mMultiply(m(), cg.mRotateZ(theta)));   return this; }
   this.scale = (x,y,z) => { m(cg.mMultiply(m(), cg.mScale(x,y,z)));     return this; }

   let eye = [0,0,0], objMatrix, items, zc;

   let distanceFromEye = point => cg.norm(cg.subtract(eye, point));

   // CREATE A MATRIX WITH -Z AXIS FROM THE USER'S (LEFT OR RIGHT) EYE TO A GIVEN POINT.

   let createBeamMatrix = (T, aimPoint) => {
      let Z = cg.normalize(cg.subtract(eye, aimPoint));
      let Y = [0,1,0];
      let X = cg.normalize(cg.cross(Y, Z));
      return [X[0],X[1],X[2],0, Y[0],Y[1],Y[2],0, Z[0],Z[1],Z[2],0, T[0],T[1],T[2],1];
   }

   // THE CANVAS NEEDS TO BE SCALED LARGE ENOUGH TO HOLD A 2x2x2 CUBE AT ANY ORIENTATION.

   this.update = () => {
      for (let view = 0 ; view < 2 ; view++) {
         model.child(view).setMatrix(createBeamMatrix(center,center))
                          .scale(size,size,.00013);
      
         // Force a redraw by calling the texture function directly, otherwise we should make sure everything is well-initialized at the start.
         draw(view);
      }
   }

   // PROJECT A 3D POINT ONTO THE CANVAS, AS SEEN FROM THE USER'S (LEFT OR RIGHT) EYE.

   let projectPoint = point => {
      let beamMatrix = cg.mMultiply(worldCoords, createBeamMatrix(eye, point));
      return cg.mHitRect(beamMatrix, objMatrix);
   }

   // TEXT ITEMS ALWAYS FACE THE CAMERA.

   this.text = ({ color='black', text='' }) => {
      let pos = cg.mTransform(m(), [0,0,0]);
      let z = distanceFromEye(pos);
      pos = projectPoint(pos);
      if (! pos)
         return;

      // IF THE ITEM LIES WITHIN THE CANVAS, ADD IT TO THE DISPLAY LIST.

      items.push({
         z     : z,
         type  : 'text',
         color : color,
         text  : text,
         pos   : [pos[0],pos[1]],
         height: cg.norm(m().slice(4,7)) / size * pos[2],
      });
   }

   // FILL AND LINE INTERFACES ARE NEARLY THE SAME, EXCEPT THAT LINE TAKES A lineWidth PARAMTER.

   this.fill = ({ path=[], color='black' }) => curve({ type: 'fill', path: path, color: color });
   this.line = ({ path=[], color='black', lineWidth=.0013 }) => curve({ type     : 'line',
                                                                        path     : path,
                                                                        color    : color,
                                                                        lineWidth: lineWidth });

   // "POINTS" ARE PARTICLES THAT GET WRITTEN DIRECTLY ONTO THE CANVAS AS BLACK PIXELS.

   let imageData = null;
   this.points = ({ points=[] }) => {
      let w = g2.getCanvas().width,
          h = g2.getCanvas().height;
      if (! imageData)
         imageData = new ImageData(w, h);
      let data = imageData.data;

let pattern = [];
for (let u = -4 ; u <= 4 ; u++)
for (let v = -4 ; v <= 4 ; v++)
   if (u*u + v*v <= 4*4)
      pattern.push(u + v*w << 2);

      for (let n = 0 ; n < points.length ; n++) {
         let p = projectPoint(cg.mTransform(m(), points[n]));
	 if (p) {
	    let col = w * p[0] >> 0;
	    let row = h * p[1] >> 0;
	    let i = (row * w + col << 2) + 3;
	    for (let k = 0 ; k < pattern.length ; k++)
	       data[i + pattern[k]] = 255;
	 }
      }
   }

   // A "CURVE" IS A SEQUENCE OF CONNECTED STRAIGHT LINES.

   let curve = ({ type, path=[], color='black', lineWidth=.0013 }) => {
      let zSum = 0;
      for (let i = 0 ; i < path.length ; i++) {
         path[i] = cg.mTransform(m(), path[i]);
         zSum += distanceFromEye(path[i]);
      }
      let clippedPath = [];
      for (let i = 0 ; i < path.length ; i++) {
         let p = projectPoint(path[i]);
         if (p)
	    clippedPath.push(p);
      }

      // IF THE ITEM LIES WITHIN THE CANVAS, ADD IT TO THE DISPLAY LIST.

      items.push({
         z        : zSum / path.length,
         type     : type,
         color    : color,
         lineWidth: lineWidth / cg.norm(m().slice(4,7)),
         path     : clippedPath,
      });
   }

   // DRAW THE 12 EDGES THAT CONSTITUTE THE OUTLINE OF A UNIT CUBE.

   this.cube = ({ color='black', lineWidth=.0013 }) => {
      for (let i = -1 ; i <= 1 ; i += 2)
      for (let j = -1 ; j <= 1 ; j += 2) {
         this.line({ color: color, lineWidth: lineWidth, path: [ [ i, j,-1], [i,j,1] ] });
         this.line({ color: color, lineWidth: lineWidth, path: [ [-1, i, j], [1,i,j] ] });
         this.line({ color: color, lineWidth: lineWidth, path: [ [ j,-1, i], [j,1,i] ] });
      }
   }

   // DRAW THE LONGITUDE AND LATITUDE LINES OF A GLOBE.

   this.globe = ({ color='black', lineWidth=.0013, step=.02 }) => {
      let sph = (u,v) => {
         let theta = 2 * Math.PI * u;
         let phi = Math.PI * (v - .5);
         return [ Math.sin(theta) * Math.cos(phi),
                                    Math.sin(phi),
                  Math.cos(theta) * Math.cos(phi) ];
      }
      for (let u = 0 ; u < 1; u += step)
      for (let v = 0 ; v < 1; v += 2*step) {
         let P  = sph(u,v);
         let Pu = sph(u+step,v);
         let Pv = sph(u,v+2*step);
         this.line({ color: color, lineWidth: lineWidth, path: [ Pu, P, Pv ] });
      }
   }

   let outlineCanvas = true;
   this.outlineCanvas = state => outlineCanvas = state || state === undefined;

   // DRAW EVERYTHING.

   let draw = view => {

      let g2 = g2LR[view];

      // COMPUTE WHERE THE USER'S (LEFT OR RIGHT) EYE IS IN 3D SPACE.

      eye = cg.mTransform(clay.inverseRootMatrix,
                          model.inverseViewMatrix(view).slice(12,15));

      // COMPUTE WHERE THE FLATTENED CUBE CONTAINING THE CANVAS IS IN 3D SPACE.

      objMatrix = model.child(view).getGlobalMatrix();
      zc = cg.norm(cg.subtract(eye, center));

      // BUILD THE DISPLAY LIST, THEN SORT ITS ITEMS BACK TO FRONT.

      items = [];

      imageData = null;
      callback(this);
      if (imageData) {
         g2.getCanvas().getContext('2d').putImageData(imageData,0,0);
	 return;
      }

      items.sort((a,b) => b.z - a.z);

      if (outlineCanvas) {
         g2.setColor([1,1,1,.6]);
         g2.fillRect(0,0,1,1);
      }

      // THEN THEY ARE DRAWN ONTO THE 2D CANVAS.

      g2.clear();
      for (let n = 0 ; n < items.length ; n++) {
         let item = items[n];
         g2.setColor(item.color);
         switch (item.type) {
         case 'text':
            g2.textHeight(item.height / item.z);
            g2.text(item.text, item.pos[0], item.pos[1], 'center');
            break;
         case 'line':
            g2.lineWidth(item.lineWidth);
            g2.drawPath(item.path);
            break;
         case 'fill':
            g2.fillPath(item.path);
            break;
         }
      }
   }
}
