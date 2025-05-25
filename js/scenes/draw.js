import * as cg from "../render/core/cg.js";
import { G3 } from "../util/g3.js";
import { matchCurves } from "../render/core/matchCurves.js";

export const init = async model => {

   let drawing = [], strokeAtCursor = {}, strokeBeingDrawn = {}, P0 = {};

   // RENDER THE 3D DRAWING FOR THIS CLIENT.

   let g3 = new G3(model, draw => {
      if (drawing) {
         draw.color('#ff00ff');
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

   // FIND WHICH STROKE (IF ANY) IS AT THE CURSOR.

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

         // START BY UNHILIGHTING ALL STROKES.

	 for (let i = 0 ; i < drawing.length ; i++)
	    drawing[i].hilit = 0;

         // FOR EACH HAND OF EVERY CLIENT:

         for (let i = 0 ; i < clients.length ; i++)
            for (let hand in {left:{},right:{}}) {

	       // FIND THE 3D CURSOR, IF ANY.

               let thumb = clientState.finger(clients[i], hand, 0);
	       if (thumb == null)
	          continue;
               let P = cg.mix(thumb, clientState.finger(clients[i], hand, 1), .5);

	       // PROVIDE A UNIQUE ID FOR THIS HAND OF THIS CLIENT.

	       let id = clients[i] + hand;

	       // DO VARIOUS ACTIONS THAT DEPEND ON THE STATE OF THE HAND OR CONTROLLER:

               switch (clientState.pinchState(clients[i], hand, 1)) {

	       // IF IN up STATE: SEE WHICH STROKE IS AT THE CURSOR, IF ANY.

               case 'up':
	          strokeAtCursor[id] = findStroke(P);
		  if (strokeAtCursor[id]) {
		     strokeAtCursor[id].hilit = 1;
		     strokeAtCursor[id].count = 0;
                  }
	          break;

               // ON press EVENT: IF NO STROKE IS AT THE CURSOR, START DRAWING ONE.

               case 'press':
	          if (! strokeAtCursor[id]) {
                     strokeBeingDrawn[id] = { p:[P], hilit: 0, selected: 0, count: 0 };
                     drawing.push(strokeBeingDrawn[id]);
                  }
	          break;

               // IF IN down STATE: IF DRAWING, KEEP DRAWING. ELSE DRAG SELECTED STROKE.

               case 'down':
	          if (! strokeAtCursor[id])
                     strokeBeingDrawn[id].p.push(P);
                  else {
		     let stroke = strokeAtCursor[id];
		     stroke.hilit = 1;
		     stroke.count++;
	             let d = cg.subtract(P, P0[id]);
	             for (let i = 0 ; i < stroke.p.length ; i++)
	                stroke.p[i] = cg.add(stroke.p[i], d);
	          }
	          break;

               // ON release EVENT: IF LEFT  UP-CLICK ON A STROKE, DELETE THE STROKE.
               //                   IF RIGHT UP-CLICK ON A STROKE, TOGGLE SELECTION.

               case 'release':
	          if (strokeAtCursor[id] && strokeAtCursor[id].count < 10) {
		     if (id.indexOf('right') >= 0) {
		        let p = strokeAtCursor[id].p;
			let z = p.reduce((sum,v) => sum + v[2], 0) / p.length;
		        strokeAtCursor[id].p = matchCurves.recognize([p])[1][0].map(v=>[v[0],v[1],z]);
                     }
		     else
		        for (let i = 0 ; i < drawing.length ; i++)
		           if (strokeAtCursor[id] == drawing[i]) {
			      drawing.splice(i, 1);
			      strokeAtCursor[id] = null;
			      break;
			   }
	          }
	          break;
               }
               P0[id] = P; // REMEMBER PREVIOUS CURSOR POSITION, FOR DRAGGING.
            }
         return drawing;
      });
      g3.update();
   });
}

