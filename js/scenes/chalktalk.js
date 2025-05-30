import * as cg from "../render/core/cg.js";
import { G3 } from "../util/g3.js";
import { matchCurves } from "../render/core/matchCurves3D.js";

/*
DONE	Right drag: Draw a stroke.
DONE	Right single click on a sketch: Convert the sketch to an object.
DONE	Right click on an object: Send the click event to the object.
DONE	Right drag on an object: Send the drag event to the object.
	Right click on object A while looking at object B: Create a link arrow from A to B.
DONE	Left drag on a sketch or object: Move the sketch or object’s position.
DONE	Left single click on a sketch or object: Do nothing.
DONE	Left double click on a sketch, object or link: Delete the sketch, object or link.
DONE	Left click then drag left/right on an object: Spin object about its vertical axis.
DONE	Left click then drag up/down an object: If dragging up/down: Scale the object.

To do:
	Handle multi-stroke things.
	Handle creating links.
*/

export const init = async model => {

   let info = '';

   let addThing = (name,Thing) => {
      let thing = new Thing();
      matchCurves.addGlyphFromCurves(name, thing.update(0), thing);
   }

   addThing('bird', function() {
      this.update = time => {
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
      }
   });

   addThing('testThing', function() {
      let t = 1;
      this.onDrag = p => t = p[1];
      this.update = time => [ [
         [ -t, .5, 0],
	 [  0, .5, 0],
	 [  0,-.5, 0],
	 [  t,-.5, 0],
      ] ];
   });

   let drawing = [],            // SHARED STATE BETWEEN CLIENTS
       clickCount = {},         // NUMBER OF CLICKS IN A ROW
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
      draw.color('#ff00ff').text(info, [0,1.5,0]);
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
	       if (clickCount[id] === undefined)
	          clickCount[id] = 0;

	       // ACTIONS DEPEND ON THE CURRENT STATE OF THE HAND OR CONTROLLER:

               switch (clientState.pinchState(clients[i], hand, 1)) {

	       // IF IN up STATE: SEE WHICH STROKE IS AT THE CURSOR, IF ANY.

               case 'up':
	          strokeAtCursor[id] = findStroke(P);
		  if (strokeAtCursor[id]) {
		     strokeAtCursor[id].hilit = 1;
		     strokeAtCursor[id].dragCount = 0;
                  }
	          break;

               // ON press EVENT: IF NO STROKE IS AT THE CURSOR, THEN START DRAWING ONE.

               case 'press':
	          switch (hand) {
		  case 'left':
		     if (strokeAtCursor[id]) {
		        strokeAtCursor[id].hilit = 1;
		        strokeAtCursor[id].dragCount = 0;
                     }
		     break;
	          case 'right':
	             if (! strokeAtCursor[id]) {
                        strokeBeingDrawn[id] = { p:[P], hilit: 0, dragCount: 0 };
                        drawing.push(strokeBeingDrawn[id]);
                     }
		     break;
                  }
	          break;

               // IF IN down STATE: IF DRAWING A STROKE, KEEP DRAWING. ELSE DRAG THE SELECTED STROKE.

               case 'down':
	          switch (hand) {

		  case 'left':

		     let stroke = strokeAtCursor[id];
		     if (stroke) {
		        stroke.hilit = 1;
		        stroke.dragCount++;

	                let d = cg.subtract(P, P0[id]);

                        // LEFT CLICK THEN DRAG ON A STROKE: SCALE THE STROKE.

		        if (clickCount[id] == 1 && stroke.dragCount >= 10) {
			   let center = [0,0,0];
			   for (let i = 0 ; i < stroke.p.length ; i++)
			      center = cg.add(center, stroke.p[i]);
                           center = cg.scale(center, 1 / stroke.p.length);

			   // VERTICAL DRAG: SCALE THE STROKE.

			   if (d[1] * d[1] > d[0] * d[0] + d[2] * d[2]) {
	                      let s = 1 + 4 * d[1];
			      for (let i = 0 ; i < stroke.p.length ; i++)
			         stroke.p[i] = cg.add(cg.scale(cg.subtract(stroke.p[i], center), s), center);

                              if (stroke.m) {
		                 for (let j = 0 ; j < 3 ; j++)
	                            stroke.m[12 + j] -= center[j];
                                 stroke.m = cg.mMultiply(cg.mScale(s), stroke.m);
		                 for (let j = 0 ; j < 3 ; j++)
	                            stroke.m[12 + j] += center[j];
			      }
			   }

			   // HORIZONTAL DRAG: ROTATE THE STROKE.

			   else {
		              let fm = cg.mMultiply(clay.inverseRootMatrix, clay.root().inverseViewMatrix(0));
			      let theta = 20 * cg.dot(d, [fm[0],fm[4],fm[8]]);
			      let c = Math.cos(theta), s = Math.sin(theta);
			      for (let i = 0 ; i < stroke.p.length ; i++)
			         stroke.p[i] = cg.subtract(stroke.p[i], center);
			      for (let i = 0 ; i < stroke.p.length ; i++) {
			         let x = stroke.p[i][0], z = stroke.p[i][2];
			         stroke.p[i][0] =  c * x + s * z;
			         stroke.p[i][2] = -s * x + c * z;
                              }
			      for (let i = 0 ; i < stroke.p.length ; i++)
			         stroke.p[i] = cg.add(stroke.p[i], center);
			   }
		        }

                        // LEFT DRAG ON A STROKE: MOVE THE STROKE.

		        if (clickCount[id] == 0) {
	                   for (let i = 0 ; i < stroke.p.length ; i++)
		              for (let j = 0 ; j < 3 ; j++)
	                         stroke.p[i][j] += d[j];
                           if (stroke.m)
		              for (let j = 0 ; j < 3 ; j++)
		                 stroke.m[12 + j] += d[j];
                        }
                     }
		     break;

		  case 'right':

                     // RIGHT DRAG ON A STROKE: CONTINUE TO DRAW THE STROKE.

	             if (strokeBeingDrawn[id])
                        strokeBeingDrawn[id].p.push(P);

                     // IF RIGHT DRAG ON A THING: SEND THE EVENT TO THE THING.

                     if (strokeAtCursor[id] && strokeAtCursor[id].ST) {
		        let stroke = strokeAtCursor[id];
	                let glyph = matchCurves.glyph(stroke.ST[2]);
		        if (glyph.code) {
		           if (glyph.code.onDrag) {
			      let p = cg.mTransform(cg.mInverse(stroke.m), P);
			      let T = stroke.ST[3];
			      for (let j = 0 ; j < 3 ; j++)
			         p[j] = (p[j] - T[j]) / T[3];
		              glyph.code.onDrag(p);
                           }
		        }
		     }

		     break;
                  }
	          break;

               // ON release EVENT:

               case 'release':
	          let isClickOnStroke = strokeAtCursor[id] && strokeAtCursor[id].dragCount < 10;

		  if (strokeAtCursor[id] && strokeAtCursor[id].dragCount >= 10)
		     clickCount[id] = 0;

	          switch (hand) {
		  case 'left':

		     if (isClickOnStroke) {
		        clickCount[id]++;
			info = clickCount[id];

	                // IF DOUBLE LEFT CLICK ON A STROKE, DELETE THE STROKE.

	                if (clickCount[id] == 2) {
		           for (let n = 0 ; n < drawing.length ; n++)
		              if (strokeAtCursor[id] == drawing[n]) {
			         drawing.splice(n, 1);
			         strokeAtCursor[id] = null;
			         break;
			      }
		           clickCount[id] = 0;
		        }
                     }

		     break;

		  case 'right':
		     strokeBeingDrawn[id] = null;

                     // IF RIGHT CLICK ON A THING: SEND THE EVENT TO THE THING.

                     if (isClickOnStroke && strokeAtCursor[id].ST) {
		        let stroke = strokeAtCursor[id];
	                let glyph = matchCurves.glyph(stroke.ST[2]);
		        if (glyph.code) {
		           if (glyph.code.onClick) {
			      let p = cg.mTransform(cg.mInverse(stroke.m), P);
			      let T = stroke.ST[3];
			      for (let j = 0 ; j < 3 ; j++)
			         p[j] = (p[j] - T[j]) / T[3];
		              glyph.code.onClick(p);
                           }
		        }
		     }

                     // IF RIGHT CLICK ON AN UNCONVERTED STROKE: CONVERT THE STROKE TO A THING

	             else if (isClickOnStroke) {
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
		        strokeAtCursor[id].offset = [0,0,0];
                     }
	          }
	          break;
               }
               P0[id] = P;
            }

         // UPDATE STROKES THAT HAVE GLYPHS.

	 for (let n = 0 ; n < drawing.length ; n++) {
	    let stroke = drawing[n];
	    if (stroke.ST)

	       // STILL MORPHING FROM A STROKE TO ITS MATCHING GLYPH

	       if (stroke.timer < 1) {
	          stroke.timer += 1.8 * model.deltaTime;
	          let strokes = matchCurves.mix(stroke.ST[0], stroke.ST[1], cg.ease(stroke.timer));
	          stroke.p = strokes[0];
	       }

               // UPDATING A FULLY MORPHED GLYPH

	       else {
	          let glyph = matchCurves.glyph(stroke.ST[2]);
		  if (glyph.code) {
	             stroke.timer += model.deltaTime;
		     let strokes = matchCurves.animate(() => glyph.code.update(stroke.timer-1), cg.mIdentity(), stroke.timer-1, stroke.ST[3]);
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

