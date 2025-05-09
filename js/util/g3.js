import * as cg from "../render/core/cg.js";
import { G2 } from "./g2.js";
import { computeHandPose, fingerWidth } from "../render/core/avatars.js";

let pz = .75;

let Projected = function() {
   let em, mf, ex, ey, ez, a,b,c, d,e,f, g,h,i, j,k,l, B, C;
   this.getMatrix = () => mf;
   this.getScale = p => .5 * pz / (pz - (c*p[0] + f*p[1] + i*p[2] + l));
   this.projectPoint = p => {
      let X = p[0] - ex, Y = p[1] - ey, Z = p[2] - ez;
      let z = -C / (c*X + f*Y + i*Z);
      return z < 0 ? null : [z * (a*X + d*Y + g*Z), z * (b*X + e*Y + h*Z) + B, z];
   }
   this.update = view => {
      em = cg.mMultiply(clay.inverseRootMatrix, clay.root().inverseViewMatrix(view));
      this.tilt = Math.atan2(em[1], Math.sqrt(em[0]*em[0]+em[2]*em[2]));
      ex = em[12];
      ey = em[13];
      ez = em[14];
      mf = cg.mMultiply(em, cg.mTranslate([0,-.22,-pz]));
      let m = cg.mInverse(mf);
      a=m[0],b=m[1],c=m[2], d=m[4],e=m[5],f=m[6],g=m[8],h=m[9],i=m[10],j=m[12],k=m[13],l=m[14];
      this.tilt = Math.atan2(d, Math.sqrt(a*a + g*g));
      B = b * ex + e * ey + h * ez + k;
      C = c * ex + f * ey + i * ez + l;
   }
}

let projected = new Projected();

export let G3 = function(model, callback) {
   const DRAW = 0, FILL = 1, IMAGE = 2, LINE = 3, TEXT = 4;

   let color = '#000000',
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

   let projectPath2D = (path,center) => {
      let p = projected.projectPoint(center);
      if (! p)
         return false;

      let scale = projected.getScale(center);
      let sin = scale * Math.sin(projected.tilt);
      let cos = scale * Math.cos(projected.tilt);

      let path2D = [];
      for (let n = 0 ; n < path.length ; n++)
         path2D.push([ p[0] + cos * path[n][0] + sin * path[n][1],
                       p[1] - sin * path[n][0] + cos * path[n][1] ]);

      p_path  = path2D;
      p_z     = p[2];
      p_scale = scale;
      return true;
   }

   this.color = c => { color = c; return this; }
   this.distance = p => {
      p = projected.projectPoint(p);
      return p ? distance(p[2]) : null;
   }
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
         dl[3] = p_path;
         dl[4] = lineWidth * p_scale;
      }
      return this;
   }
   this.draw2D = (path,center,) => {
      if (projectPath2D(path, center)) {
         if (! displayList[nd]) displayList[nd] = []; let dl = displayList[nd++];
         dl[0] = p_z;
         dl[1] = DRAW;
         dl[2] = color;
         dl[3] = p_path;
         dl[4] = lineWidth * p_scale;
      }
      return this;
   }
   this.fill = path => {
      if (projectPath(path)) {
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
            dl[7] = -projected.tilt / (Math.PI/2);
            dl[8] = sx;
            dl[9] = sy;
            dl[10] = sw;
            dl[11] = sh;
         }
      }
      return this;
   }
   this.line = (a,b) => {
      if (! a || ! b)
         return this;
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
   this.text = (text,center,alignment,x,y,rotation) => {
      let p = projected.projectPoint(center);
      if (p) {
         let scale = projected.getScale(center);
         x = cg.def(x,0);
         y = cg.def(y,0);
         if (! displayList[nd]) displayList[nd] = []; let dl = displayList[nd++];
         dl[0] = p[2];
         dl[1] = TEXT;
         dl[2] = color;
         dl[3] = font;
         dl[4] = textHeight * scale;
         dl[5] = text;
         let cos = scale * Math.cos(projected.tilt);
         let sin = scale * Math.sin(projected.tilt);
         dl[6] = p[0] + cos * x + sin * y;
         dl[7] = p[1] - sin * x + cos * y;
         dl[8] = cg.def(alignment, 'center');
         dl[9] = cg.def(rotation,0) - projected.tilt / (Math.PI/2);
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

   let co = [];

   this.update = () => {
      if (! co.length)
         for (let i = 0 ; i < 7 ; i++)
            co.push(cg.rgbToHex(clientState.color(i)));

      for (view = 0 ; view <= 1 ; view++) {
         projected.update(view);
         screen[view].setMatrix(projected.getMatrix());

         nd = 0;
         g2[view].update();

         // IF HAND TRACKING, SHOW TIPS OF FINGERS. USE COLOR TO INDICATE PINCH.

         let isTouching = (a,b) => { let d = cg.distance(a,b); return d > 0 && d < .025; }

         for (let n = 0 ; n < clients.length ; n++) {
            let id = clients[n], m, p;
            if (id != clientID && (m = clientState.head(id))) {
               let face = [];
               for (let i = 0 ; i < faceX.length ; i++)
                  face.push(cg.mTransform(m, [faceX[i],faceY[i],0]));
               this.lineWidth(.01).color(co[0]);
               for (let i = 0 ; i < face.length ; i++)
                  this.line(face[i], face[(i+1) % face.length]);
            }
            for (let hand in {left:0,right:0})
               if (m = clientState.hand(id,hand))
                  if (clientState.isHand(id)) {

		     // DRAW FINGERS OF HAND

		     let handPose = computeHandPose(id, hand);
		     let C = handPose.c;
		     for (let f = 0 ; f < 5 ; f++) {
		        draw.lineWidth(fingerWidth(f));
			let P = handPose.p[f];
		        if (f == 0)
			   draw.color(co[C[0]]).line(P[0],P[0]); // Handle thumb differently.
			else
			   draw.color(co[0]).line(P[0],P[1]).line(P[1],P[2]).color(co[C[f]]).line(P[2],P[3]);
		     }

                     // DRAW PALM OF HAND

                     let m = clientState.hand(id,hand);
                     let s = hand == 'left' ? -1 : 1;
                     let xf = p => cg.mTransform(m, p);
                     let P = [ [-.010*s, .015,-.020],
                               [-.023*s, .015,-.020],
                               [-.029*s, .005,-.058],
                               [-.025*s,-.007,-.094],
                               [-.003*s,-.004,-.093],
                               [ .017*s,-.008,-.086],
                               [ .032*s,-.015,-.075],
                               [ .029*s,-.005,-.048],
                               [ .022*s, .005,-.020],
                               [ .010*s, .011,-.020] ];
                     for (let n = 0 ; n < P.length ; n++)
                        P[n] = xf(P[n]);
                     let a = xf([-.009*s, .010,-.058]);
                     let b = xf([ .013*s, .006,-.055]);
                     this.lineWidth(.02).color(co[0]);
                     for (let n = 0 ; n < P.length ; n++)
                        this.line(P[n], P[(n+1)%P.length]);
                     this.line(P[0],a).line(a,P[4]);
                     this.line(P[9],b).line(b,P[5]);
                     this.line(P[2],a).line(b,P[7]).line(a,b);
                     this.fill(P);
                  }
                  else {

                     // DRAW VIRTUAL PING PONG BALL OF CONTROLLER

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

         let sortedDisplayList = [];
         for (let n = 0 ; n < nd ; n++)
            sortedDisplayList.push(displayList[n]);
         sortedDisplayList.sort((a,b) => a[0] - b[0]);

         for (let n = 0 ; n < nd ; n++) {
            let item = sortedDisplayList[n];
            switch (item[1]) {
            case DRAW:
               g2[view].setColor (item[2]);
               g2[view].drawPath (item[3]);
               g2[view].lineWidth(item[4]);
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
   }
}

