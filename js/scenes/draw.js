import * as cg from "../render/core/cg.js";
import { G3 } from "../util/g3.js";
import { matchCurves } from "../render/core/matchCurves3D.js";

export const init = async model => {

   let addThing = (name,proc) => matchCurves.addGlyphFromCurves(name, proc(0),
      (time,T) => matchCurves.animate(time => proc(time), cg.mIdentity(), time, T));

   addThing('bird', time => {
      let theta1 = Math.sin(4 * time - 2.8) * .4 - .6;
      let theta2 = Math.cos(4 * time - 2.8) * .8;
      let C1 = .7 * Math.cos(theta1), S1 = .7 * Math.sin(theta1);
      let C2 = .7 * Math.cos(theta2), S2 = .7 * Math.sin(theta2);
      let c = [ 0, .1 + .5 * S1, 0 ];
      let b = [ c[0] - C1, c[1] - S1, 0 ];
      let a = [ b[0] - C2, b[1] + S2, 0 ];
      let d = [ c[0] + C1, c[1] - S1, 0 ];
      let e = [ d[0] + C2, d[1] + S2, 0 ];
      return [ [ a, b, c, d, e ] ];
   });

   let drawing = [],            // SHARED STATE BETWEEN CLIENTS
       strokeAtCursor = {},     // STROKE AT CURSOR FOR EACH HAND OF EVERY CLIENT
       strokeBeingDrawn = {},   // STROKE CURRENTLY BEING DRAWN FOR EACH HAND OF EVERY CLIENT
       P0 = {};                 // PREVIOUS CURSOR POSITION FOR EACH HAND OF EVERY CLIENT

   // RENDER THE 3D DRAWING FOR THIS CLIENT.

   let g3 = new G3(model, draw => {
      draw.color('#ff00ff');
      if (drawing) {
         for (let n = 0 ; n < drawing.length ; n++) {
            let stroke = drawing[n];
            draw.lineWidth(stroke.hilit ? .006 : .003);
            for (let i = 0 ; i < stroke.p.length - 1 ; i++)
               draw.line(stroke.p[i], stroke.p[i+1]);
         }
      }
   });

   // CHECK WHETHER A POINT IS ON A LINE.

   let isOnLine = (p, a, b) => {
      let d = cg.distance(a,b);
      for (let t = 0 ; t < d ; t += .02)
         if (cg.distance(p, cg.mix(a, b, t/d)) < .02)
	    return true;
      return false;
   }

   // RETURN THE STROKE (IF ANY) THAT IS AT THE CURSOR.

   let findStroke = p => {
      for (let n = 0 ; n < drawing.length ; n++) {
	 let stroke = drawing[n];
         for (let i = 0 ; i < stroke.p.length - 1 ; i++)
	    if (isOnLine(p, stroke.p[i], stroke.p[i+1]))
	       return stroke;
      }
      return null;
   }

   model.animate(() => {

      // COMPUTE THE VALUE OF THE SHARED STATE VARIABLE FOR THIS ANIMATION FRAME.

      drawing = shared(() => {

         // START BY UN-HILIGHTING ALL STROKES.

	 for (let n = 0 ; n < drawing.length ; n++)
	    drawing[n].hilit = 0;

         // LOOP THROUGH BOTH HANDS OF EVERY CLIENT:

         for (let i = 0 ; i < clients.length ; i++)
            for (let hand in {left:{},right:{}}) {

	       // FIND THE 3D CURSOR, IF ANY.

               let thumb = clientState.finger(clients[i], hand, 0);
	       if (thumb == null)
	          continue;
               let P = cg.mix(thumb, clientState.finger(clients[i], hand, 1), .5);

	       // PROVIDE A UNIQUE ID STRING FOR THIS HAND OF THIS CLIENT.

	       let id = clients[i] + hand;

	       // ACTIONS DEPEND ON THE CURRENT STATE OF THE HAND OR CONTROLLER:

               switch (clientState.pinchState(clients[i], hand, 1)) {

	       // IF IN up STATE: SEE WHICH STROKE IS AT THE CURSOR, IF ANY.

               case 'up':
	          strokeAtCursor[id] = findStroke(P);
		  if (strokeAtCursor[id]) {
		     strokeAtCursor[id].hilit = 1;
		     strokeAtCursor[id].count = 0;
                  }
	          break;

               // ON press EVENT: IF NO STROKE IS AT THE CURSOR, THEN START DRAWING ONE.

               case 'press':
	          if (! strokeAtCursor[id]) {
                     strokeBeingDrawn[id] = { p:[P], hilit: 0, count: 0 };
                     drawing.push(strokeBeingDrawn[id]);
                  }
	          break;

               // IF IN down STATE: IF DRAWING A STROKE, KEEP DRAWING. ELSE DRAG THE SELECTED STROKE.

               case 'down':
	          if (! strokeAtCursor[id])
                     strokeBeingDrawn[id].p.push(P);
                  else {
		     let stroke = strokeAtCursor[id];
		     stroke.hilit = 1;
		     stroke.count++;
	             let d = cg.subtract(P, P0[id]);
		     if (stroke.m)
		        for (let i = 0 ; i < 3 ; i++)
	                   stroke.m[12 + i] += d[i];
		     else
	                for (let i = 0 ; i < stroke.p.length ; i++)
	                   stroke.p[i] = cg.add(stroke.p[i], d);
	          }
	          break;

               // ON release EVENT:

               case 'release':

                  // UP-CLICKING ON A STROKE:

	          if (strokeAtCursor[id] && strokeAtCursor[id].count < 10) {

                     // IF RIGHT UP-CLICK:

		     if (id.indexOf('right') > 0) {
		        let fm = cg.mMultiply(clay.inverseRootMatrix, clay.root().inverseViewMatrix(0));
		        let im = cg.mInverse(fm);
			let p = [];
			for (let i = 0 ; i < strokeAtCursor[id].p.length ; i++)
			   p.push(cg.mTransform(im, strokeAtCursor[id].p[i]));
		        let ST = matchCurves.recognize([p]);
			for (let k = 0 ; k <= 1 ; k++)
			for (let i = 0 ; i < ST[k][0].length ; i++)
			   ST[k][0][i] = cg.mTransform(fm, ST[k][0][i]);
		        strokeAtCursor[id].m = fm;
		        strokeAtCursor[id].ST = ST;
		        strokeAtCursor[id].timer = 0;
                     }

	             // IF LEFT UP-CLICK, DELETE THE STROKE.

		     else
		        for (let n = 0 ; n < drawing.length ; n++)
		           if (strokeAtCursor[id] == drawing[n]) {
			      drawing.splice(n, 1);
			      strokeAtCursor[id] = null;
			      break;
			   }
	          }
	          break;
               }
               P0[id] = P; // REMEMBER THE PREVIOUS CURSOR POSITION. THIS IS NEEDED FOR DRAGGING.
            }

         // UPDATE STROKES THAT HAVE GLYPHS.

	 for (let n = 0 ; n < drawing.length ; n++) {
	    let stroke = drawing[n];
	    if (stroke.ST)

	       // STILL MORPHING FROM A STROKE TO ITS MATCHING GLYPH

	       if (stroke.timer < 1) {
	          stroke.timer = Math.min(1, stroke.timer + 1.8 * model.deltaTime);
	          let strokes = matchCurves.mix(stroke.ST[0], stroke.ST[1], cg.ease(stroke.timer));
	          stroke.p = strokes[0];
	       }

               // UPDATING A FULLY MORPHED GLYPH

	       else {
	          let glyph = matchCurves.glyph(stroke.ST[2]);
		  if (glyph.code) {
	             stroke.timer += model.deltaTime;
		     let strokes = glyph.code(stroke.timer - 1, stroke.ST[3]);
		     let fm = cg.mMultiply(clay.inverseRootMatrix, clay.root().inverseViewMatrix(0));
	             stroke.p = strokes[0];
		     for (let i = 0 ; i < stroke.p.length ; i++)
			stroke.p[i] = cg.mTransform(stroke.m, stroke.p[i]);
		  }
	       }
	 }

         return drawing;
      });
      g3.update();
   });
}

