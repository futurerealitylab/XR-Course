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

	We have also replaced strokes touching by 3D bounding box test.
	We now have bounding box logic working properly for merging strokes.

	To do:
	    Add links.
	    Create things with 2D graphics in a plane.
*/

export const init = async model => {

   let info = ''; // IN CASE WE NEED TO SHOW DEBUG INFO IN THE SCENE.

   let addThingType = (name, ThingType) => {
      let thing = new ThingType();
      matchCurves.addGlyphFromCurves(name, thing.sketch(), ThingType);
   }

   addThingType('bird', function() {
      this.sketch = () => [ [ [-1,-.2,0],[-.5,.2,0],[0,-.2,0],[.5,.2,0],[1,-.2,0] ] ];
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

   addThingType('xSlider', function() {
      let t = 0;
      this.onDrag = p => t = Math.max(-1, Math.min(1, p[0]));
      this.onClick = this.onDrag;
      this.sketch = () => [ [ [-1,0,0],[1,0,0] ],
                            [ [t,.2,0],[t,-.2,0] ] ],
      this.update = time => [
         [ [-1,0,0],[1,0,0] ],
	 [ [t,.2,0],[t,-.2,0] ],
	 { text: (50*t+50>>0)/100, p: [1.05,0,0], size: .03, align: 'left' },
      ];
      this.input = _t => t = 2 * _t - 1;
      this.output = () => .5 * t + .5;
   });

   addThingType('ySlider', function() {
      let t = 0;
      this.onDrag = p => t = Math.max(-1, Math.min(1, p[1]));
      this.onClick = this.onDrag;
      this.sketch = () => [ [ [0,1,0],[0,-1,0] ],
                            [ [-.2,t,0],[.2,t,0] ] ],
      this.update = time => [
         [ [0,1,0],[0,-1,0] ],
	 [ [-.2,t,0],[.2,t,0] ],
	 { text: (50*t+50>>0)/100, p: [0,1.15,0], size: .03 },
      ];
      this.input = _t => t = 2 * _t - 1;
      this.output = () => .5 * t + .5;
   });

   let things = [],            // THINGS SHARED BETWEEN CLIENTS
       linkSrc = {},           // THE SOURCE OF THE LINK BEING DRAWN
       clickCount = {},        // NUMBER OF CLICKS IN A ROW FOR EACH HAND OF EVERY CLIENT
       thingAtCursor = {},     // THING AT CURSOR FOR EACH HAND OF EVERY CLIENT
       thingBeingDrawn = {},   // THING CURRENTLY BEING DRAWN FOR EACH HAND OF EVERY CLIENT
       isAfterClickOnBG = {},  // SET TO TRUE AFTER A CLICK ON THE BACKGROUND
       P0 = {};                // PREVIOUS CURSOR POSITION FOR EACH HAND OF EVERY CLIENT

   // DELETE A THING FROM THE SCENE.

   let deleteThing = thing => {
      for (let n = 0 ; n < things.length ; n++)
         if (thing == things[n]) {
            things.splice(n, 1);
	    break;
         }

      // DELETE ANY LINKS TO OR FROM THIS THING.

      let removeLink = links => {
         if (links)
	    for (let i = 0 ; i < links.length ; i++)
	       if (links[i] == thing)
	          links.splice(i, 1);
      }
      for (let n = 0 ; n < things.length ; n++) {
         removeLink(things[n].linkSrc);
         removeLink(things[n].linkDst);
      }
   }

   let isIntersect = (thing1,thing2) => thing1.lo[0] < thing2.hi[0] && thing2.lo[0] < thing1.hi[0]
                                     && thing1.lo[1] < thing2.hi[1] && thing2.lo[1] < thing1.hi[1]
                                     && thing1.lo[2] < thing2.hi[2] && thing2.lo[2] < thing1.hi[2];

   // RENDER THE SCENE FOR THIS CLIENT.

   let g3 = new G3(model, draw => {
      if (things) {
         for (let n = 0 ; n < things.length ; n++) {
	    let thing = things[n];
            draw.color('#ff00ff').lineWidth(thing.hilit ? .006 : .003);
            let strokes = thing.strokes;
	    for (let n = 0 ; n < strokes.length ; n++) {
	       let stroke = strokes[n];
	       if (Array.isArray(stroke))
                  for (let i = 0 ; i < stroke.length - 1 ; i++)
                     draw.line(stroke[i], stroke[i+1]);
               else if (stroke.text !== undefined) {
	          if (stroke.size)
	             draw.textHeight(stroke.size);
	          draw.text(stroke.text, stroke.p, stroke.align ?? 'center', stroke.x ?? 0, stroke.y ?? 0);
               }
            }
	    if (thing.linkDst)
	       for (let i = 0 ; i < thing.linkDst.length ; i++) {
	          let other = thing.linkDst[i];
		  let p1 = cg.mTransform(thing.m, thing.ST[3].slice(0,3));
		  let p2 = cg.mTransform(other.m, other.ST[3].slice(0,3));
                  draw.color('#ffffff').lineWidth(.002).line(p1, p2)
                                       .lineWidth(.008).line(p2, p2);
	       }
         }
      }
      draw.text(info, [0,1.2,0]);
   });

   // RETURN THE THING (IF ANY) THAT IS AT THE CURSOR.

   let isThingAtPoint = (thing, p) => thing.lo && p[0] > thing.lo[0] && p[0] < thing.hi[0] &&
	                                          p[1] > thing.lo[1] && p[1] < thing.hi[1] &&
	                                          p[2] > thing.lo[2] && p[2] < thing.hi[2] ;

   let findThingAtPoint = p => {
      for (let n = 0 ; n < things.length ; n++)
         if (isThingAtPoint(things[n], p))
            return things[n];
      return null;
   }

   model.animate(() => {

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

	       // PROVIDE A UNIQUE ID FOR THIS HAND OF THIS CLIENT.

	       let id = clients[I] + hand;
	       if (clickCount[id] === undefined)
	          clickCount[id] = 0;

	       // ACTIONS DEPEND ON THE CURRENT STATE OF THE HAND OR CONTROLLER:

               let pinchState = clientState.pinchState(clients[I], hand, 1);

               switch (hand) {

	       case 'left':
	          switch (pinchState) {

                  case 'up':
	             thingAtCursor[id] = findThingAtPoint(P);
		     if (thingAtCursor[id]) {
		        thingAtCursor[id].hilit = 1;
		        thingAtCursor[id].dragCount = 0;
                     }
	             break;

                  case 'press':
		     if (thingAtCursor[id]) {
		        thingAtCursor[id].hilit = 1;
		        thingAtCursor[id].dragCount = 0;
                     }
		     break;

                  case 'down':
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
			      if (Array.isArray(stroke))
			         for (let i = 0 ; i < stroke.length ; i++, count++)
			            center = cg.add(center, stroke[i]);
                           }
                           center = cg.scale(center, 1 / count);

			   // VERTICAL DRAG: SCALE THE THING ABOUT ITS CENTER POINT.

			   if (d[1] * d[1] > d[0] * d[0] + d[2] * d[2]) {
	                      let s = 1 + 4 * d[1];
			      let scale = p => cg.add(cg.scale(cg.subtract(p, center), s), center);
			      for (let n = 0 ; n < strokes.length ; n++) {
			         let stroke = strokes[n];
				 if (Array.isArray(stroke))
			            for (let i = 0 ; i < stroke.length ; i++)
			               stroke[i] = scale(stroke[i]);
                                 else if (stroke.p)
			            stroke.p = scale(stroke.p);
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
			      let spin = p => {
			         p = cg.subtract(p, center);
			         let x = p[0], z = p[2];
			         p[0] =  c * x + s * z;
			         p[2] = -s * x + c * z;
			         return cg.add(p, center);
			      }
			      for (let n = 0 ; n < strokes.length ; n++) {
			         let stroke = strokes[n];
				 if (Array.isArray(stroke))
			            for (let i = 0 ; i < stroke.length ; i++)
				       stroke[i] = spin(stroke[i]);
                                 else
				    stroke.p = spin(stroke.p);
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
			      if (Array.isArray(stroke))
	                         for (let i = 0 ; i < stroke.length ; i++)
		                    for (let j = 0 ; j < 3 ; j++)
	                               stroke[i][j] += d[j];
                              else
		                 for (let j = 0 ; j < 3 ; j++)
	                            stroke.p[j] += d[j];
                           }
                           if (thing.m)
		              for (let j = 0 ; j < 3 ; j++)
		                 thing.m[12 + j] += d[j];
                        }
                     }
		     break;

                  case 'release':

                     // IF NOT CLICKING ON ANYTHING, RESET CLICK COUNT.

		     if (! thingAtCursor[id] || thingAtCursor[id] && thingAtCursor[id].dragCount >= 10)
		        clickCount[id] = 0;

	             // DOUBLE LEFT CLICK ON A THING: DELETE THE THING.

		     if (thingAtCursor[id] && thingAtCursor[id].dragCount < 10 && ++clickCount[id] == 2) {
		        deleteThing(thingAtCursor[id]);
		        thingAtCursor[id] = null;
		        clickCount[id] = 0;
                     }
		     break;
                  }
	          break;

	       case 'right':
	          switch (pinchState) {

                  case 'up':
	             thingAtCursor[id] = findThingAtPoint(P);
		     if (thingAtCursor[id]) {
		        thingAtCursor[id].hilit = 1;
		        thingAtCursor[id].dragCount = 0;
                     }
	             break;

                  case 'press':

                     // IF NOT OVER A NON-SKETCH THING, START DRAWING A NEW STROKE.

                     thingBeingDrawn[id] = null;
	             if (! thingAtCursor[id] || thingAtCursor[id].type == 'sketch') {
                        thingBeingDrawn[id] = { type: 'sketch', strokes: [ [P] ], hilit: 0, dragCount: 0 };
                        things.push(thingBeingDrawn[id]);
                     }

		     // PRESS ON A NON-SKETCH THING AFTER CLICKING ON THE BACKGROUND: START DRAWING A LINK.

		     linkSrc[id] = null;
		     if (isAfterClickOnBG[id] && thingAtCursor[id] && thingAtCursor[id].type != 'sketch')
		        linkSrc[id] = thingAtCursor[id];
		     break;

                  case 'down':

                     // RIGHT DRAG WHILE DRAWING: CONTINUE TO DRAW THE STROKE.

	             if (thingBeingDrawn[id]) {
		        thingBeingDrawn[id].strokes[0].push(P);
			for (let n = 0 ; n < things.length ; n++)
			   if (isIntersect(thingBeingDrawn[id], things[n]))
			      things[n].hilit = 1;
                     }

                     // RIGHT DRAG ON A NON-SKETCH THING: SEND THE DRAG EVENT TO THE THING.

		     else {
		        let thing = thingAtCursor[id];
			thing.dragCount++;
                        if (! isAfterClickOnBG[id]) {
			   if (thing.dragCount >= 10) {
		              if (thing.code && thing.code.onDrag) {
			         let p = cg.mTransform(cg.mInverse(thing.m), P);
			         let T = thing.ST[3];
			         for (let j = 0 ; j < 3 ; j++)
			            p[j] = (p[j] - T[j]) / T[3];
		                 thing.code.onDrag(p);
		              }
		           }
		        }
		     } 
		     break;

                  case 'release':

		     isAfterClickOnBG[id] = false;

		     if (thingAtCursor[id] && thingAtCursor[id].dragCount >= 10)
		        clickCount[id] = 0;

                     // FINISHING CREATING A LINK BETWEEN TWO THINGS.

                     if (linkSrc[id]) {
		        let thing1 = linkSrc[id];
		        let thing2 = findThingAtPoint(P);
		        if (thing2 && thing2.type != 'sketch' && thing2 != thing1) {
			   if (! thing1.linkDst) thing1.linkDst = [];
			   if (! thing2.linkSrc) thing2.linkSrc = [];
			   thing1.linkDst.push(thing2);
			   thing2.linkSrc.push(thing1);
			}
		     }

                     // RIGHT CLICK ON A NON-SKETCH THING: SEND THE EVENT TO THE THING.

                     if (! isAfterClickOnBG[id]) {
                        if (thingAtCursor[id] && thingAtCursor[id].dragCount < 10 && thingAtCursor[id].type != 'sketch') {
		           let thing = thingAtCursor[id];
		           if (thing.code && thing.code.onClick) {
			      let p = cg.mTransform(cg.mInverse(thing.m), P);
			      let T = thing.ST[3];
			      for (let j = 0 ; j < 3 ; j++)
			         p[j] = (p[j] - T[j]) / T[3];
		              thing.code.onClick(p);
		           }
		        }
		     }

		     // JUST FINISHED DRAWING A STROKE:

	             if (thingBeingDrawn[id]) {

                        let isClick = thingBeingDrawn[id].strokes[0].length < 10;

		        // DETECT A CLICK ON THE BACKGROUND

			if (isClick) {
		           isAfterClickOnBG[id] = true;
			   for (let n = 0 ; n < things.length ; n++) {
			      if (things[n] != thingBeingDrawn[id] && isThingAtPoint(things[n], P))
			         isAfterClickOnBG[id] = false;
			         break;
                              }
                        }  

		        // IF THE STROKE INTERSECTS AN EXISTING SKETCH:

		        let sketch = null;
			for (let n = 0 ; n < things.length ; n++) {
			   let thing = things[n];
			   if (thing!=thingBeingDrawn[id] && thing.type=='sketch' && isIntersect(thing,thingBeingDrawn[id]))
			      sketch = thing;
                        }
			if (sketch) {

                           // IF THE STROKE WAS ONLY A CLICK, CONVERT THE SKETCH TO A THING.

	                   if (isClick) {
			      let fm = clientState.head(clients[I]);
		              let im = cg.mInverse(fm);
			      let strokes = sketch.strokes;

			      // FIRST TRANSFORM STROKES INTO THE INTERNAL COORDINATE SYSTEM OF THE THING.

			      let ss = [];
			      for (let n = 0 ; n < strokes.length ; n++)
			         if (Array.isArray(strokes[n])) {
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

		              sketch.m = fm;
		              sketch.ST = ST;
		              sketch.type = matchCurves.glyph(ST[2]).name;
		              sketch.timer = 0;
		              sketch.glyph = matchCurves.glyph(ST[2]);
		              sketch.code = new sketch.glyph.code();
                           }

		           // ELSE ADD THE STROKE TO THE EXISTING SKETCH.

		           else {
			      sketch.strokes.push(thingBeingDrawn[id].strokes[0]);
		              deleteThing(thingBeingDrawn[id]);
                           }
                        }

                        // IF THE STROKE WAS ONLY A CLICK, DELETE IT.
                        // (LATER WE CAN ADD LOGIC HERE TO RESPOND TO CLICKING ON THE BACKGROUND.)

                        if (thingBeingDrawn[id] && isClick)
		           deleteThing(thingBeingDrawn[id]);
		        thingBeingDrawn[id] = null;
                     }
	  	     break;
                  }
		  break;
               }
               P0[id] = P;
            }

         // PROPAGATE VALUES ACROSS LINKS.

	 for (let n = 0 ; n < things.length ; n++) {
	    let thing1 = things[n];
	    if (thing1.linkDst)
	    for (let i = 0 ; i < thing1.linkDst.length ; i++) {
	       let thing2 = thing1.linkDst[i];
	       if ( thing1.code && thing1.code.output &&
	            thing2.code && thing2.code.input )
                 thing2.code.input(thing1.code.output());
	    }
         }

         // UPDATE APPEARANCE OF NON-SKETCH THINGS.

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
		  if (thing.code) {
	             thing.timer += model.deltaTime;
		     thing.strokes = matchCurves.animate(() => thing.code.update(thing.timer-1),
		                                         cg.mIdentity(), thing.timer-1, thing.ST[3]);
		     for (let n = 0 ; n < thing.strokes.length ; n++) {
		        let stroke = thing.strokes[n];
			if (Array.isArray(stroke))
		           for (let i = 0 ; i < stroke.length ; i++)
			      stroke[i] = cg.mTransform(thing.m, stroke[i]);
                        else
			   stroke.p = cg.mTransform(thing.m, stroke.p);
                     }
		  }
	       }
	 }

         // COMPUTE BOUNDING BOXES.

	 for (let n = 0 ; n < things.length ; n++) {
	    let thing = things[n];
            thing.lo = [ 1000, 1000, 1000 ];
	    thing.hi = [-1000,-1000,-1000 ];
	    for (let n = 0 ; n < thing.strokes.length ; n++)
	       if (Array.isArray(thing.strokes[n]))
	          for (let i = 0 ; i < thing.strokes[n].length ; i++)
	             for (let j = 0 ; j < 3 ; j++) {
	                thing.lo[j] = Math.min(thing.lo[j], thing.strokes[n][i][j] - .003);
	                thing.hi[j] = Math.max(thing.hi[j], thing.strokes[n][i][j] + .003);
                     }
	 }

         return things;
      });
      g3.update();
   });
}

