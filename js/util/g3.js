import * as cg from "../render/core/cg.js";
import { G2 } from "./g2.js";
import { computeHandPose, fingerWidth } from "../render/core/avatars.js";

let pz = .75;
let yShift = 0;

let Projected = function() {
   this.setUpright = state => isUpright = state;
   let em, mf, ex, ey, ez, a,b,c, d,e,f, g,h,i, j,k,l, B, C, isUpright = true, cm;
   this.getMatrix = () => mf;
   this.getScale = p => .5 * pz / (pz - (c*p[0] + f*p[1] + i*p[2] + l));
   this.projectZ = p => -c * (p[0] - ex) - i * (p[2] - ez);
   this.projectPoint = p => {
      let X = p[0] - ex, Y = p[1] - ey, Z = p[2] - ez;
      let z = -C / (c*X + i*Z);
      return z < 0 ? null : [z * (a*X + g*Z), z * e*Y + B, z];
   }
   this.update = view => {
      cm = clay.root().inverseViewMatrix(view);
      if (view == 0)
         yShift = isUpright ? (-.1 - 7 * cm[9]) : 0;
      em = cg.mMultiply(clay.inverseRootMatrix, cm);
      if (isUpright) {
         let X = cg.normalize(cg.cross([0,1,0], [em[8],em[9],em[10]]));
         let Z = cg.normalize(cg.cross(X, [0,1,0]));
         em = [ X[0],X[1],X[2],0, 0,1,0,0, Z[0],Z[1],Z[2],0, em[12],em[13],em[14],1 ];
      }
      ex = em[12];
      ey = em[13];
      ez = em[14];
      mf = cg.mMultiply(em, cg.mTranslate([0,-.22,-pz]));
      let m = cg.mInverse(mf);
      a=m[0],b=m[1],c=m[2], d=m[4],e=m[5],f=m[6],g=m[8],h=m[9],i=m[10],j=m[12],k=m[13],l=m[14];

      B = e * ey + k - .005 - .2*yShift;
      C = c * ex + i * ez + l;
   }
}

let projected = new Projected();

export let G3 = function(model, callback) {
   projected.setUpright(true);
   const DRAW = 0, FILL = 1, IMAGE = 2, LINE = 3, POLY = 4, TEXT = 5;

   let color = '#000000',
       blinkTime = {},
       displayList = [],
       distance = z => 0.4 / z,
       draw = this,
       font = 'Helvetica',
       g2 = [],
       handD = 0,
       handP = [0,0,0],
       handY = {left:undefined,right:undefined},
       lineWidth = .01,
       nd = 0,
       screen = [],
       textHeight = .1,
       view;

   for (let view = 0 ; view <= 1 ; view++) {
      g2[view] = new G2(false, 2040);
      screen[view] = model.add();
      screen[view].add('square').setTxtr(g2[view].getCanvas()).view(view).move(0,.177+.039,.6).scale(.2);
      g2[view].render = function() { callback(draw); }
   }

   let clipLine = (a,b) => {
      if (! a || ! b)
         return [-1, a, b];

      let az = projected.projectZ(a);
      let bz = projected.projectZ(b);
      if (az < 0 && bz < 0)
         return [-1, a, b];

      if (az < 0)
         return [ 0, cg.mix(a, b, .0001-az / (bz - az)), b ];
      if (bz < 0)
         return [ 1, a, cg.mix(b, a, .0001-bz / (az - bz)) ];
      return [2, a, b];
   }

   let p_path, p_z, p_scale;

   let projectPath = (path, isFill) => {
      let P = [], np = path.length - (isFill ? 0 : 1);
      for (let n = 0 ; n < np ; n++) {
	 let ab = clipLine(path[n], path[(n+1) % path.length]);
	 if (ab[0] != -1) {
	    P.push(projected.projectPoint(ab[1]));
	    if (ab[1] == 1 || n == np-1)
	       P.push(projected.projectPoint(ab[2]));
	 }
      }
      if (P.length == 0 || P[0] == null)
         return false;

      p_path = P;
      p_z    = P.reduce((a,b) => a+(b==null?0:b[2]), 0) / P.length;
      return true;
   }

   let projectPath2D = (path,center) => {
      let p = projected.projectPoint(center);
      if (! p)
         return false;

      let scale = projected.getScale(center);
      let path2D = [];
      for (let n = 0 ; n < path.length ; n++)
         path2D.push([ p[0] + scale * path[n][0],
                       p[1] - scale * path[n][1] ]);

      p_path  = path2D;
      p_z     = p[2];
      p_scale = scale;
      return true;
   }

   let isSorting = true, isAvatar = true;
   this.disableSort = () => isSorting = false;
   this.disableAvatar = () => isAvatar = false;

   this.color = c => { color = c; return this; }
   this.distance = p => {
      p = projected.projectPoint(p);
      return p ? distance(p[2]) : null;
   }
   this.draw = path => {
      if (projectPath(path)) {
         let c = [0,0,0], np = path.length;
         for (let n = 0 ; n < np ; n++)
            c = cg.add(c, path[n]);
         c = cg.scale(c, 1 / np);
         let scale = projected.getScale(c);
         if (! displayList[nd]) displayList[nd] = []; let dl = displayList[nd++];
         dl[0] = p_z;
         dl[1] = DRAW;
         dl[2] = color;
         dl[3] = lineWidth * scale;
         dl[4] = p_path;
      }
      return this;
   }
   this.drawPoly = (points, edges) => {

      let E = [], z = 0, center = [0,0,0];
      for (let n = 0 ; n < edges.length ; n++) {
         let ab = clipLine(points[edges[n][0]],
	                   points[edges[n][1]]);
	 if (ab[0] != -1) {
	    let a = projected.projectPoint(ab[1]);
	    let b = projected.projectPoint(ab[2]);
	    if (a && b) {
	       E.push([ a, b ]);
	       z += a[2] + b[2];
               center = cg.add(center, ab[1]);
               center = cg.add(center, ab[2]);
            }
         }
      }

      if (E.length == 0)
         return this;

      z /= 2 * E.length;
      let scale = projected.getScale(cg.scale(center, 1 / (2 * E.length)));

      if (! displayList[nd]) displayList[nd] = []; let dl = displayList[nd++];
      dl[0] = z;
      dl[1] = POLY;
      dl[2] = color;
      dl[3] = Math.min(.01, lineWidth * scale);
      dl[4] = E;
      return this;
   }
   this.draw2D = (path,center) => {
      if (projectPath2D(path, center)) {
         if (! displayList[nd]) displayList[nd] = []; let dl = displayList[nd++];
         dl[0] = p_z;
         dl[1] = DRAW;
         dl[2] = color;
         dl[3] = lineWidth * p_scale;
         dl[4] = p_path;
      }
      return this;
   }
   this.fill = path => {
      if (projectPath(path, true)) {
         if (! displayList[nd]) displayList[nd] = []; let dl = displayList[nd++];
         dl[0] = p_z;
         dl[1] = FILL;
         dl[2] = color;
         dl[3] = p_path;
      }
      return this;
   }
   this.fill2D = (path,center) => {
      if (projectPath2D(path, center)) {
         if (! displayList[nd]) displayList[nd] = []; let dl = displayList[nd++];
         dl[0] = p_z;
         dl[1] = FILL;
         dl[2] = color;
         dl[3] = p_path;
      }
      return this;
   }
   this.font = f => { font = f; return this; }
   this.image = (image,center,x,y,w,h,sx,sy,sw,sh) => {
      if ((w || h) && image.width) {
         let p = projected.projectPoint(center);
         if (p) {
            if (! h)
               h = w * image.height / image.width;
            else if (! w)
               w = h * image.width / image.height;
            let scale = projected.getScale(center);
            if (! displayList[nd]) displayList[nd] = []; let dl = displayList[nd++];
            dl[0] = p[2];
            dl[1] = IMAGE;
            dl[2] = image;
            dl[3] = p[0] + x * scale;
            dl[4] = p[1] + y * scale;
            dl[5] = 2 * w * scale;
            dl[6] = 2 * h * scale;
            dl[7] = 0;
            dl[8] = sx;
            dl[9] = sy;
            dl[10] = sw;
            dl[11] = sh;
         }
      }
      return this;
   }

   this.line = (a,b) => {
      let ab = clipLine(a,b);
      if (ab[0] == -1)
        return null;
      a = ab[1];
      b = ab[2];

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
      }
      return this;
   }
   this.lineWidth = lw => { lineWidth = lw; return this; }
   this.setUpright = state => projected.setUpright(state);
   this.slider = (text,center,x,y,callback) => {
      let p = projected.projectPoint(center);
      if (p) {
         this.text(text, center, 'center', x, y);
         let scale = projected.getScale(center);
         g2[0].textHeight(textHeight);
	 x = x ? x : 0;
	 y = y ? y : 0;
         let w = g2[0].getCanvas().context.measureText(text).width / 2040 + .01;
         let h = textHeight + .01;
         let a = [x-w,y-h], b = [x-w,y+h], c = [x+w,y+h], d = [x+w,y-h];
	 let t = callback();
	 t = Math.max(0, Math.min(1, t ?? .5));
	 center = cg.add(center, cg.scale(projected.getMatrix().slice(8,11), -.001));
         this.color('#404040').fill2D([a,b,c,d],center);
         this.color('#808080').fill2D([a,b,cg.mix(b,c,t),cg.mix(a,d,t)],center);
      }
      return this;
   }
   this.text = (text,center,alignment,x,y,rotation) => {
      let p = projected.projectPoint(center);
      if (p) {
         let scale = projected.getScale(center);
         x = x ?? 0;
         y = y ?? 0;
         if (! displayList[nd]) displayList[nd] = []; let dl = displayList[nd++];
         dl[0] = p[2];
         dl[1] = TEXT;
         dl[2] = color;
         dl[3] = font;
         dl[4] = textHeight * scale;
         dl[5] = text;
         dl[6] = p[0] + scale * x;
         dl[7] = p[1] - scale * y;
         dl[8] = 'center';
         dl[9] = 0;
      }
      return this;
   }
   this.textHeight = th => { textHeight = th; return this; }

   this.textWidth = text => {
      g2[0].textHeight(textHeight);
      return g2[0].getCanvas().context.measureText(text).width / 2040;
   }

   this.finger = (hand,i) => clientState.finger(clientID, hand, i);
   this.pinch  = (hand,i) => clientState.pinch (clientID, hand, i);
   this.view   = ()       => view;

   const fw = [.021,.019,.018,.017,.015];
   const faceX = [-.04, .04, .09,.1 ,.05,-.05,-.1 ,-.09];
   const faceY = [-.11,-.11,-.05,.08,.13, .13, .08,-.05];
   const eyeX = [.07,.043,.016,.043];
   const eyeY = [.025,.04,.025,.01];

   let co = [];

   this.update = () => {

      if (! co.length)
         for (let i = 0 ; i < 7 ; i++)
            co.push(cg.rgbToHex(clientState.color(i)));

      for (view = 0 ; view <= 1 ; view++) {
         projected.update(view);
         screen[view].setMatrix(projected.getMatrix());
         screen[view].child(0).identity().view(view).move(0,.177+.04*yShift,.6).scale(.2);

         nd = 0;
         g2[view].update();

         // IF HAND TRACKING, SHOW TIPS OF FINGERS. USE COLOR TO INDICATE PINCH.

         let isTouching = (a,b) => { let d = cg.distance(a,b); return d > 0 && d < .025; }

         if (isAvatar)
         for (let n = 0 ; n < clients.length ; n++) {
            let id = clients[n], p, hm = clientState.head(id);

	    // IF THIS IS AN IMMERSIVE CLIENT:

	    if (hm) {

	       // IF THIS IS NOT ME, THEN DRAW HEAD OF AVATAR.

	       let time = Date.now() / 1000;

               if (id != clientID) {
                  let face = [];
                  for (let i = 0 ; i < faceX.length ; i++)
                     face.push(cg.mTransform(hm, [faceX[i],faceY[i],0]));
                  this.color(co[0]).fill([face[5],face[6],face[7],face[0]]);
                  this.color(co[0]).fill([face[4],face[3],face[2],face[1]]);
                  this.color(co[0]).fill([face[4],face[5],face[0],face[1]]);

		  if (! blinkTime[id])
		     blinkTime[id] = time;

                  if (time < blinkTime[id] - .1) {
                     this.color('#000000');
	             for (let s = -1 ; s <= 1 ; s += 2) {
	                let eye = [];
                        for (let i = 0 ; i < eyeX.length ; i++)
		           eye.push(cg.mTransform(hm, [s*eyeX[i],eyeY[i], .03]));
                        this.fill(eye);
                     }
                  }

                  if (time > blinkTime[id])
		     blinkTime[id] = time + 1 + 5 * Math.random();
               }

	       // DRAW THE HANDS OR CONTROLLERS OF EVERY AVATAR.

               for (let hand in {left:0,right:0}) {
                  let m = clientState.hand(id,hand);
                  if (m) {

                     // IF HAND TRACKING: THE AVATAR CONSISTS OF TRANSPARENT FINGERS.

                     if (clientState.isHand(id)) {
		        let handPose = computeHandPose(id, hand);
		        for (let f = 0 ; f < 5 ; f++)
		           draw.lineWidth(fingerWidth(f))
			       .color(co[handPose.c[0]]+'c0')
			       .draw(handPose.p[f].slice(f==0?1:0),4);
                     }

                     // IF CONTROLLERS: THE AVATAR IS A DISK AT THE CONTROLLER'S VRTUAL PING PONG BALL.

                     else {
                        let p = m.slice(12,15);
                        this.lineWidth(.031).color('black').line(p,p);
                        this.lineWidth(.029).color(co[ clientState.button(id,hand,0) ? 1 :
                                                       clientState.button(id,hand,1) ? 2 :
                                                       clientState.button(id,hand,2) ? 3 :
                                                       clientState.button(id,hand,3) ? 4 :
                                                       clientState.button(id,hand,4) ? 5 :
                                                       clientState.button(id,hand,5) ? 6 : 0 ]).line(p,p);
                     }
                  }
               }
            }
         }

         let sortedDisplayList = [];
	 if (isSorting) {
            for (let n = 0 ; n < nd ; n++)
               sortedDisplayList.push(displayList[n]);
            sortedDisplayList.sort((a,b) => a[0] - b[0]);
         }
	 else
            sortedDisplayList = displayList;

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
            case POLY:
               g2[view].setColor (item[2]);
               g2[view].lineWidth(item[3]);
	       let lines = item[4];
	       for (let n = 0 ; n < lines.length ; n++)
                  g2[view].line(lines[n][0], lines[n][1]);
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
   }
}

