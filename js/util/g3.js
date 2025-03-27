import * as cg from "../render/core/cg.js";
import { G2} from "./g2.js";

let pz = .75;
let frameCount = 0;

let Projected = function() {
   let mp, mi, ex, ey, ez, mm;
   this.getMatrix = () => mm;
   this.getScale = p => .5 * pz / (pz - (mi[2]*p[0] + mi[6]*p[1] + mi[10]*p[2] + mi[14]));
   this.projectPoint = p => {
      let X = ex-p[0], Y = ey-p[1], Z = ez-p[2];
      let z = -(mi[2]*ex + mi[6]*ey + mi[10]*ez + mi[14]) / (mi[2]*X + mi[6]*Y + mi[10]*Z);
      return z > 0 ? null : [z*(mi[0]*X+mi[4]*Y+mi[8]*Z), mi[1]*(z*X+ex)+mi[5]*(z*Y+ey)+mi[9]*(z*Z+ez)+mi[13], -z];
   }
   this.update = view => {
      let eyeMatrix = cg.mMultiply(clay.inverseRootMatrix, clay.root().inverseViewMatrix(view));
      ex = eyeMatrix[12];
      ey = eyeMatrix[13];
      ez = eyeMatrix[14];
      mp = cg.mMultiply(clay.root().inverseViewMatrix(view), cg.mTranslate([0,-.22,-pz]));
      mi = cg.mInverse(mp);
      mm = cg.mMultiply(clay.inverseRootMatrix, mp);
      this.tilt = Math.atan2(mm[1], Math.sqrt(mm[0]*mm[0]+mm[2]*mm[2]));
   }
}

let projected = new Projected();

export let G3 = function(model, callback) {
   const DRAW = 0, FILL = 1, IMAGE = 2, LINE = 3, TEXT = 4;

   let color = '#000000',
       distance = z => 0.4 / z,
       draw = this,
       displayList = [],
       font = 'Helvetica',
       g2 = [],
       lineWidth = .01,
       nd = 0,
       screen = [],
       textHeight = .1;

   for (let view = 0 ; view <= 1 ; view++) {
      g2[view] = new G2(false, 2040);
      screen[view] = model.add();
      screen[view].add('square').setTxtr(g2[view].getCanvas()).view(view).move(0,.177,.6).scale(.2);
      g2[view].render = function() { callback(draw); }
   }

   let p_path, p_z, p_scale;

   let projectPath = path => {
      let P = [], p;
      for (let n = 0 ; n < path.length ; n++)
         if (p = projected.projectPoint(path[n]))
            P.push(p);
      if (P.length == 0)
         return false;

      p_path = P;
      p_z    = P.reduce((a,b) => a+b[2], 0) / P.length;
      return true;
   }

   let projectPath2D = (path,center,width) => {
      let p = projected.projectPoint(center);
      if (! p)
         return false;

      let sin = Math.sin(projected.tilt);
      let cos = Math.cos(projected.tilt);

      let scale = projected.getScale(center);
      let size = cg.def(width, 1) * scale;

      let path2D = [];
      for (let n = 0 ; n < path.length ; n++) {
         let x = size * path[n][0];
         let y = size * path[n][1];
         path2D.push([ p[0] + cos * x + sin * y,
                       p[1] - sin * x + cos * y ]);
      }

      p_path  = path2D;
      p_z     = p[2];
      p_scale = scale;
      return true;
   }

   this.color = c => { color = c; return this; }
   this.draw = path => {
      if (projectPath(path)) {
         let c = [0,0,0], np = path.length;
         for (let n = 0 ; n < np ; n++)
            for (let i = 0 ; i < 3 ; i++)
               c += path[n][i];
         let scale = projected.getScale([c[0]/np, c[1]/np, c[2]/np]);
	 if (! displayList[nd]) displayList[nd] = []; let dl = displayList[nd++];
         dl[0] = p_z;
         dl[1] = DRAW;
         dl[2] = color;
         dl[3] = lineWidth * scale;
         dl[4] = p_path;
	 return distance(p_z);
      }
      return null;
   }
   this.draw2D = (path,center,width) => {
      if (projectPath2D(path, center, width)) {
	 if (! displayList[nd]) displayList[nd] = []; let dl = displayList[nd++];
         dl[0] = p_z;
         dl[1] = DRAW;
         dl[2] = color;
         dl[3] = p_path;
         dl[4] = lineWidth * p_scale;
	 return distance(p_z);
      }
      return null;
   }
   this.fill = path => {
      if (projectPath(path)) {
	 if (! displayList[nd]) displayList[nd] = []; let dl = displayList[nd];
         dl[0] = p_z;
         dl[1] = FILL;
         dl[2] = color;
         dl[3] = p_path;
	 nd++;
	 return distance(p_z);
      }
      return null;
   }
   this.fill2D = (path,center,width) => {
      if (projectPath2D(path, center, width)) {
	 if (! displayList[nd]) displayList[nd] = []; let dl = displayList[nd++];
         dl[0] = p_z;
         dl[1] = FILL;
         dl[2] = color;
         dl[3] = p_path;
	 return distance(p_z);
      }
      return null;
   }
   this.font = f => font = f;
   this.image = (image,center,width,height,sx,sy,sw,sh) => {
      if ((width || height) && image.width) {
         let p = projected.projectPoint(center);
         if (p) {
            if (! height)
               height = width * image.height / image.width;
            else if (! width)
               width = height * image.width / image.height;
            let scale = projected.getScale(center);
	    if (! displayList[nd]) displayList[nd] = []; let dl = displayList[nd++];
            dl[0] = p[2];
            dl[1] = IMAGE;
            dl[2] = image;
            dl[3] = p[0];
            dl[4] = p[1];
            dl[5] = 2 * width * scale;
            dl[6] = 2 * height * scale;
            dl[7] = -projected.tilt / (Math.PI/2);
            dl[8] = sx;
            dl[9] = sy;
            dl[10] = sw;
            dl[11] = sh;
	    return distance(p[2]);
         }
      }
      return null;
   }
   this.line = (a,b) => {
      let scale = projected.getScale([ (a[0]+b[0])/2, (a[1]+b[1])/2, (a[2]+b[2])/2 ]);
      a = projected.projectPoint(a);
      b = projected.projectPoint(b);
      if (a && b) {
	 if (! displayList[nd]) displayList[nd] = []; let dl = displayList[nd++];
         dl[0] = (a[2] + b[2]) / 2;
         dl[1] = LINE;
         dl[2] = color;
         dl[3] = lineWidth * scale;
         dl[4] = a;
         dl[5] = b;
         return distance((a[2] + b[2]) / 2);
      }
      return null;
   }
   this.lineWidth = lw => { lineWidth = lw; return this; }
   this.text = (text,center,alignment,rotation) => {
      let p = projected.projectPoint(center);
      if (p) {
         let scale = projected.getScale(center);
	 if (! displayList[nd]) displayList[nd] = []; let dl = displayList[nd++];
         dl[0] = p[2];
         dl[1] = TEXT;
         dl[2] = color;
         dl[3] = font;
         dl[4] = textHeight * scale;
         dl[5] = text;
         dl[6] = p[0];
         dl[7] = p[1];
         dl[8] = cg.def(alignment, 'center');
         dl[9] = cg.def(rotation,0) - projected.tilt / (Math.PI/2);
	 return distance(p[2]);
      }
      return null;
   }
   this.textHeight = th => { textHeight = th; return this; }

   this.update = () => {
      for (let view = 0 ; view <= 1 ; view++) {
         projected.update(view);
         screen[view].setMatrix(projected.getMatrix());

	 nd = 0;
         g2[view].update();

	 let sortedDisplayList = [];
         for (let n = 0 ; n < nd ; n++)
	    sortedDisplayList.push(displayList[n]);
         sortedDisplayList.sort((a,b) => a[0] - b[0]);

         for (let n = 0 ; n < nd ; n++) {
            let item = sortedDisplayList[n];
            switch (item[1]) {
            case DRAW:
               g2[view].setColor (item[2]);
               g2[view].lineWidth(item[3]);
               g2[view].drawPath (item[4]);
               break;
            case FILL:
               g2[view].setColor(item[2]);
               g2[view].fillPath(item[3]);
               break;
            case IMAGE:
               g2[view].drawImage(item[2],item[3],item[4],item[ 5],item[ 6],
                                  item[7],item[8],item[9],item[10],item[11]);
               break;
            case LINE:
               g2[view].setColor (item[2]);
               g2[view].lineWidth(item[3]);
               g2[view].line     (item[4],item[5]);
               break;
            case TEXT:
               g2[view].setColor  (item[2]);
               g2[view].setFont   (item[3]);
               g2[view].textHeight(item[4]);
               g2[view].text      (item[5],item[6],item[7],item[8],item[9]);
               break;
            }
         }
      }
      frameCount++;
   }
}

