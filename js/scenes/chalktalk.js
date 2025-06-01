import * as cg from "../render/core/cg.js";
import { G3 } from "../util/g3.js";
import { matchCurves } from "../render/core/matchCurves3D.js";

/*
	Instead of the scene consisting of an array of strokes,
	we are now changing it to consist of an array of things.

	A special case of a thing is a sketch -- an array
	of hand drawn strokes -- which can be converted
	by right-clicking to a procedurally defined thing.

	Around every thing we should place a 3D bounding box,
	which should always be kept up to date.
	This bounding box can be used to see whether a new
	hand drawn stroke should be added to an existing sketch,
	and to determine whether input events should be directed
	toward a particular thing.

	What we have implemented so far:

	Individual strokes have now been replaced by
	things of the form { type: name, strokes: [], ... }.
*/

export const init = async model => {

   let info = '---'; // IN CASE WE NEED TO SHOW DEBUG INFO IN THE SCENE.

   let addThingType = (name, ThingType) => {
      let thing = new ThingType();
      thing.name = name;
      matchCurves.addGlyphFromCurves(name, thing.update(0), thing);
   }

   addThingType('bird', function() {
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

   addThingType('testThing', function() {
      let t = 1;
      this.onClick = p => t = 1;
      this.onDrag = p => t = p[1];
      this.update = time => [ [ [-t,.5,0], [0,.5,0], [0,-.5,0], [t,-.5,0] ] ];
      this.setState = s => t = s;
      this.getState = () => t;
   });

   let things = [],            // THINGS SHARED BETWEEN CLIENTS
       clickCount = {},        // NUMBER OF CLICKS IN A ROW FOR EACH HAND OF EVERY CLIENT
       thingAtCursor = {},     // THING AT CURSOR FOR EACH HAND OF EVERY CLIENT
       thingBeingDrawn = {},   // THING CURRENTLY BEING DRAWN FOR EACH HAND OF EVERY CLIENT
       P0 = {};                // PREVIOUS CURSOR POSITION FOR EACH HAND OF EVERY CLIENT

   // DELETE A THING FROM THE SCENE.

   let deleteThing = thing => {
      for (let n = 0 ; n < things.length ; n++)
         if (thing == things[n]) {
            things.splice(n, 1);
	    break;
         }
   }

   // RENDER THE SCENE FOR THIS CLIENT.

   let g3 = new G3(model, draw => {
      draw.color('#ff00ff');
      if (things) {
         for (let n = 0 ; n < things.length ; n++) {
	    let thing = things[n];
            draw.lineWidth(thing.hilit ? .006 : .003);
            let strokes = thing.strokes;
	    for (let n = 0 ; n < strokes.length ; n++) {
	       let stroke = strokes[n];
               for (let i = 0 ; i < stroke.length - 1 ; i++)
                  draw.line(stroke[i], stroke[i+1]);
            }
         }
      }
      draw.color('#ff00ff').text(info, [0,1.2,0]);
   });

   // RETURN THE THING (IF ANY) THAT IS AT THE CURSOR.

   let findThingAtPoint = p => {

      // WHICH REQUIRES DETERMINING WHETHER A POINT IS ON A LINE.

      let isOnLine = (p, a, b) => {
         let d = cg.distance(a,b);
         for (let t = 0 ; t < d ; t += .02)
            if (cg.distance(p, cg.mix(a, b, t/d)) < .02)
	       return true;
         return false;
      }

      for (let n = 0 ; n < things.length ; n++) {
	 let thing = things[n];
	 let strokes = thing.strokes;
	 for (let n = 0 ; n < strokes.length ; n++) {
	    let stroke = strokes[n];
            for (let i = 0 ; i < stroke.length - 1 ; i++)
	       if (isOnLine(p, stroke[i], stroke[i+1]))
	          return thing;
         }
      }
      return null;
   }

   model.animate(() => {

      info = '0';

      // COMPUTE THE SHARED VALUE OF THINGS IN THE SCENE FOR THIS ANIMATION FRAME.

      things = shared(() => {

         // START BY UN-HILIGHTING ALL THINGS.

	 for (let n = 0 ; n < things.length ; n++)
	    things[n].hilit = 0;

         // LOOP THROUGH BOTH HANDS OF EVERY CLIENT:

         for (let I = 0 ; I < clients.length ; I++)
            for (let hand in {left:{},right:{}}) {

	       // FIND THE 3D CURSOR, IF ANY.

               let thumb = clientState.finger(clients[I], hand, 0);
	       if (thumb == null)
	          continue;
               let P = cg.mix(thumb, clientState.finger(clients[I], hand, 1), .5);

	       // PROVIDE A UNIQUE ID STRING FOR THIS HAND OF THIS CLIENT.

	       let id = clients[I] + hand;
	       if (clickCount[id] === undefined)
	          clickCount[id] = 0;

	       // ACTIONS DEPEND ON THE CURRENT STATE OF THE HAND OR CONTROLLER:

               switch (clientState.pinchState(clients[I], hand, 1)) {

	       // up EVENT: SEE WHICH THING IS AT THE CURSOR, IF ANY.

               case 'up':
	          thingAtCursor[id] = findThingAtPoint(P);
		  if (thingAtCursor[id]) {
		     thingAtCursor[id].hilit = 1;
		     thingAtCursor[id].dragCount = 0;
                  }
	          break;

               // press EVENT:

               case 'press':
	          switch (hand) {

                  // press left EVENT: IF A THING IS AT THE CURSOR, START COUNTING DRAG EVENTS.

		  case 'left':
		     if (thingAtCursor[id]) {
		        thingAtCursor[id].hilit = 1;
		        thingAtCursor[id].dragCount = 0;
                     }
		     break;

                  // press right EVENT: IF NO NON-SKETCH THING IS AT THE CURSOR, THEN START DRAWING A STROKE.

	          case 'right':

                     thingBeingDrawn[id] = null;
	             if (! thingAtCursor[id] || thingAtCursor[id].type == 'sketch') {
                        thingBeingDrawn[id] = { type: 'sketch', strokes: [ [P] ], hilit: 0, dragCount: 0 };
                        things.push(thingBeingDrawn[id]);
                     }
		     break;
                  }
	          break;

               // down EVENT:

               case 'down':
	          switch (hand) {

                  // down left EVENT: BEGIN DELETE OR MOVE OR SCALE OR SPIN.

		  case 'left':

		     let thing = thingAtCursor[id];
		     if (thing) {
		        thing.hilit = 1;
		        thing.dragCount++;

	                let d = cg.subtract(P, P0[id]);

                        // LEFT CLICK THEN DRAG ON A THING:

		        if (clickCount[id] == 1 && thing.dragCount >= 10) {
			   let center = [0,0,0];
			   let strokes = thing.strokes;

			   // COMPUTE THE CENTER POINT OF THE THING.

			   let count = 0;
			   for (let n = 0 ; n < strokes.length ; n++) {
			      let stroke = strokes[n];
			      for (let i = 0 ; i < stroke.length ; i++, count++)
			         center = cg.add(center, stroke[i]);
                           }
                           center = cg.scale(center, 1 / count);

			   // VERTICAL DRAG: SCALE THE THING ABOUT ITS CENTER POINT.

			   if (d[1] * d[1] > d[0] * d[0] + d[2] * d[2]) {
	                      let s = 1 + 4 * d[1];
			      for (let n = 0 ; n < strokes.length ; n++) {
			         let stroke = strokes[n];
			         for (let i = 0 ; i < stroke.length ; i++)
			            stroke[i] = cg.add(cg.scale(cg.subtract(stroke[i], center), s), center);
                              }
                              if (thing.m) {
		                 for (let j = 0 ; j < 3 ; j++)
	                            thing.m[12 + j] -= center[j];
                                 thing.m = cg.mMultiply(cg.mScale(s), thing.m);
		                 for (let j = 0 ; j < 3 ; j++)
	                            thing.m[12 + j] += center[j];
                              }
			   }

			   // HORIZONTAL DRAG: ROTATE THE THING ABOUT ITS CENTER POINT.

			   else {
			      let fm = clientState.head(clients[I]);
			      let theta = 20 * cg.dot(d, [fm[0],fm[4],fm[8]]);
			      let c = Math.cos(theta), s = Math.sin(theta);
			      for (let n = 0 ; n < strokes.length ; n++) {
			         let stroke = strokes[n];
			         for (let i = 0 ; i < stroke.length ; i++) {
			            let p = cg.subtract(stroke[i], center);
			            let x = p[0], z = p[2];
			            p[0] =  c * x + s * z;
			            p[2] = -s * x + c * z;
			            stroke[i] = cg.add(p, center);
                                 }
                              }
                              if (thing.m) {
                                 for (let j = 0 ; j < 3 ; j++)
                                    thing.m[12 + j] -= center[j];
                                 thing.m = cg.mMultiply(cg.mRotateY(theta), thing.m);
                                 for (let j = 0 ; j < 3 ; j++)
                                    thing.m[12 + j] += center[j];
			      }
			   }
		        }

                        // LEFT DRAG ON A THING: MOVE THE THING.

		        if (clickCount[id] == 0) {
			   let strokes = thing.strokes;
			   for (let n = 0 ; n < strokes.length ; n++) {
			      let stroke = strokes[n];
	                      for (let i = 0 ; i < stroke.length ; i++)
		                 for (let j = 0 ; j < 3 ; j++)
	                            stroke[i][j] += d[j];
                           }
                           if (thing.m)
		              for (let j = 0 ; j < 3 ; j++)
		                 thing.m[12 + j] += d[j];
                        }
                     }
		     break;

                  // down right EVENT: DRAWING A STROKE OR SENDING drag EVENTS TO A THING.

		  case 'right':

                     // RIGHT DRAG WHILE DRAWING: CONTINUE TO DRAW THE STROKE.

	             if (thingBeingDrawn[id])
		        thingBeingDrawn[id].strokes[0].push(P);

                     // RIGHT DRAG ON A NON-SKETCH THING: SEND THE DRAG EVENT TO THE THING.

                     else {
		        let thing = thingAtCursor[id];
			if (++thing.dragCount >= 10) {
	                   let glyph = matchCurves.glyph(thing.ST[2]);
		           if (glyph.code && glyph.code.onDrag) {
			      let p = cg.mTransform(cg.mInverse(thing.m), P);
			      let T = thing.ST[3];
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
	          let isClickOnThing = thingAtCursor[id] && thingAtCursor[id].dragCount < 10;

		  // AFTER A DRAG, RESET THE CLICK COUNT BACK TO ZERO.

		  if (thingAtCursor[id] && thingAtCursor[id].dragCount >= 10)
		     clickCount[id] = 0;

	          switch (hand) {
		  case 'left':

	             // DOUBLE LEFT CLICK ON A THING: DELETE THE THING.

		     if (isClickOnThing && ++clickCount[id] == 2) {
		        deleteThing(thingAtCursor[id]);
		        thingAtCursor[id] = null;
		        clickCount[id] = 0;
                     }
		     break;

		  case 'right':

                     // RIGHT CLICK ON A NON-SKETCH THING: SEND THE EVENT TO THE THING.

                     if (isClickOnThing && thingAtCursor[id].type != 'sketch') {
		        let thing = thingAtCursor[id];
	                let glyph = matchCurves.glyph(thing.ST[2]);
		        if (glyph.code && glyph.code.onClick) {
			   let p = cg.mTransform(cg.mInverse(thing.m), P);
			   let T = thing.ST[3];
			   for (let j = 0 ; j < 3 ; j++)
			      p[j] = (p[j] - T[j]) / T[3];
		           glyph.code.onClick(p);
		        }
		     }

		     // IF THE STROKE THAT WAS JUST DRAWN INTERSECTS AN EXISTING SKETCH:

	             if (thingAtCursor[id] && thingBeingDrawn[id])

                        // IF THE STROKE THAT WAS JUST DRAWN WAS ONLY A CLICK, CONVERT THE SKETCH TO A THING.

	                if (thingBeingDrawn[id].strokes[0].length < 10) {
			   let fm = clientState.head(clients[I]);
		           let im = cg.mInverse(fm);
			   let strokes = thingAtCursor[id].strokes;

			   // FIRST TRANSFORM STROKES INTO THE INTERNAL COORDINATE SYSTEM OF THE THING.

			   let ss = [];
			   for (let n = 0 ; n < strokes.length ; n++) {
			      let s = [];
			      for (let i = 0 ; i < strokes[n].length ; i++)
			         s.push(cg.mTransform(im, strokes[n][i]));
                              ss.push(s);
                           }

			   // THEN RECOGNIZE THE STROKES AND TRANSFORM BACK.

		           let ST = matchCurves.recognize(ss);
			   for (let k = 0 ; k <= 1 ; k++)
			      for (let n = 0 ; n < ST[k].length ; n++)
			         for (let i = 0 ; i < ST[k][n].length ; i++)
			            ST[k][n][i] = cg.mTransform(fm, ST[k][n][i]);

			   // SET THE DATA FIELDS FOR THE (NOW NON-SKETCH) THING.

		           thingAtCursor[id].m = fm;
		           thingAtCursor[id].ST = ST;
		           thingAtCursor[id].type = matchCurves.glyph(ST[2]).name;
		           thingAtCursor[id].timer = 0;
                        }

		        // ELSE ADD THE STROKE THAT WAS JUST DRAWN TO THE EXISTING SKETCH.

		        else {
			   thingAtCursor[id].strokes.push(thingBeingDrawn[id].strokes[0]);
		           deleteThing(thingBeingDrawn[id]);
                        }

                     // ELSE IF THE STROKE THAT WAS JUST DRAWN WAS ONLY A CLICK, DELETE IT.
                     // (LATER WE CAN ADD LOGIC HERE TO RESPOND TO CLICKING ON THE BACKGROUND.)

		     if (thingBeingDrawn[id] && thingBeingDrawn[id].strokes[0].length < 10)
		        deleteThing(thingBeingDrawn[id]);
	          }
		  strokeBeingDrawn[id] = null;
	          break;
               }
               P0[id] = P;
            }

         // UPDATE NON-SKETCH THINGS.

	 for (let n = 0 ; n < things.length ; n++) {
	    let thing = things[n];
	    if (thing.type != 'sketch')

	       // MORPH A NON-SKETCH THING FROM HOW IT HAD APPEARED AS A SKETCH.

	       if (thing.timer < 1) {
	          thing.timer += 1.8 * model.deltaTime;
	          thing.strokes = matchCurves.mix(thing.ST[0], thing.ST[1], cg.ease(thing.timer));
	       }

               // UPDATE A NON-SKETCH THING.

	       else {
	          let glyph = matchCurves.glyph(thing.ST[2]);
		  if (glyph.code) {
	             thing.timer += model.deltaTime;
		     thing.strokes = matchCurves.animate(() => glyph.code.update(thing.timer-1),
		                                         cg.mIdentity(), thing.timer-1, thing.ST[3]);
		     for (let n = 0 ; n < thing.strokes.length ; n++) {
		        let stroke = thing.strokes[n];
		        for (let i = 0 ; i < stroke.length ; i++)
			   stroke[i] = cg.mTransform(thing.m, stroke[i]);
                     }
		  }
	       }
	 }

         return things;
      });
      g3.update();
   });
}

