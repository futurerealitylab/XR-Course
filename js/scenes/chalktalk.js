import * as cg from "../render/core/cg.js";
import { G3 } from "../util/g3.js";
import { matchCurves } from "../render/core/matchCurves3D.js";

/*
	Add pendulum.
	Add clock (rate controller).
	Add wave generator.
	Add text value box.
	Add voice-controlled text box.
*/

export const init = async model => {

   let info = '';              // IN CASE WE NEED TO SHOW DEBUG INFO IN THE SCENE
   let fm;                     // FORWARD HEAD MATRIX FOR THE CLIENT BEING EVALUATED
   let np = 10;                // NUMBER OF POINTS NEEDED FOR A STROKE TO NOT BE A CLICK

   let prevP = {},             // PREVIOUS CURSOR POSITION FOR EACH HAND OF EVERY CLIENT
       things = [],            // THINGS SHARED BETWEEN CLIENTS
       linkSrc = {},           // THE SOURCE OF THE LINK BEING DRAWN
       thingCode = {},         // CODE FOR THING INSTANCES
       clickCount = {},        // NUMBER OF CLICKS IN A ROW FOR EACH HAND OF EVERY CLIENT
       modifyThing = {},       // SET TO TRUE AFTER A CLICK ON THE BACKGROUND
       thingAtCursor = {},     // THING AT CURSOR FOR EACH HAND OF EVERY CLIENT
       clickPointOnBG = {},    // AFTER A CLICK ON THE BACKGROUND, SET TO CLICK LOCATION
       thingBeingDrawn = {};   // THING CURRENTLY BEING DRAWN FOR EACH HAND OF EVERY CLIENT

   // DEFINE A NEW PROCEDURAL THING TYPE.

   let addThingType = (name, ThingType) => {
      let thing = new ThingType();
      matchCurves.addGlyphFromCurves(name, thing.sketch(), ThingType);
   }

/////////////////////////// PROCEDURAL THING TYPES THAT WE HAVE DEFINED SO FAR:

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
      this.sketch = () => [ [ [-1,0,0],[1,0,0] ], [ [t,.2,0],[t,-.2,0] ] ];
      this.update = time => {
         return [
            [ [-1,0,0],[1,0,0] ],
            [ [t,-.2,0],[t,.2,0] ],
            [ [t,0,-.2],[t,0,.2] ],
            [ [t,.2,0],[t,0,.2],[t,-.2,0],[t,0,-.2],[t,.2,0] ],
            { text: (50*t+50>>0)/100, p: [1.1,0,0], size: .03, align: 'left' },
         ];
      }
      this.input = _t => t = 2 * _t - 1;
      this.output = () => .5 * t + .5;
   });

   addThingType('ySlider', function() {
      let t = 0;
      this.onDrag = p => t = Math.max(-1, Math.min(1, p[1]));
      this.onClick = this.onDrag;
      this.sketch = () => [ [ [0,1,0],[0,-1,0] ], [ [-.2,t,0],[.2,t,0] ] ];
      this.update = time => [
         [ [0,1,0],[0,-1,0] ],
         [ [-.2,t,0],[.2,t,0] ],
         [ [0,t,-.2],[0,t,.2] ],
         [ [.2,t,0],[0,t,.2],[-.2,t,0],[0,t,-.2],[.2,t,0] ],
         { text: (50*t+50>>0)/100, p: [0,1.15,0], size: .03 },
      ];
      this.input = _t => t = 2 * _t - 1;
      this.output = () => .5 * t + .5;
   });

   let circlePoint = t => [ Math.sin(t), Math.cos(t), 0 ];
   let circle = () => {
      let c = [];
      for (let n = 0 ; n <= 24 ; n++)
         c.push(circlePoint(2 * Math.PI * n / 24));
      return c;
   }

   addThingType('timer', function() {
      let rate = 0, t = 0, prevTime;
      this.sketch = () => [ circle(), [ circlePoint(0), [0,0,0] ] ];
      this.update = time => {
         t += rate * (time - (prevTime ?? time));
	 prevTime = time;
         return [ circle(), [ circlePoint(2 * Math.PI * t), [0,0,0] ] ];
      };
      this.input = value => rate = value;
      this.output = () => t;
   });

   addThingType('sinewave', function() {
      let t = 0;
      let wave = t => {
         let s = [];
	 for (let n = 0 ; n <= 24 ; n++)
	    s.push([2 * n/24 - 1, Math.sin(2 * Math.PI * n/24 - t) / Math.PI, 0]);
         return s;
      }
      this.sketch = () => [ wave(0) ];
      this.update = () => [ wave(t) ];
      this.input = value => t = value;
   });

///////////////////////////////////////////////////////////////////////////////

   // DELETE A THING FROM THE SCENE.

   let deleteThing = thing => {
      for (let n = 0 ; n < things.length ; n++)
         if (thing == things[n]) {
            things.splice(n, 1);
            break;
         }

      // ALSO REMOVE ANY LINKS TO OR FROM THE THING.

      let removeLink = links => {
         if (links)
            for (let i = 0 ; i < links.length ; i++)
               if (links[i] == thing.id)
                  links.splice(i, 1);
      }
      for (let n = 0 ; n < things.length ; n++) {
         removeLink(things[n].linkSrc);
         removeLink(things[n].linkDst);
      }
   }

   // FIND A THING, GIVEN ITS UNIQUE ID.

   let findThingFromID = id => {
      for (let n = 0 ; n < things.length ; n++)
         if (id == things[n].id)
            return things[n];
      return null;
   }

   // COMPUTE THE GEOMETRIC CENTER OF A THING.

   let computeThingCenter = thing => {
      let strokes = thing.strokes, center = [0,0,0], count = 0;
      for (let n = 0 ; n < strokes.length ; n++) {
         let stroke = strokes[n];
         if (Array.isArray(stroke))
            for (let i = 0 ; i < stroke.length ; i++, count++)
               center = cg.add(center, stroke[i]);
      }
      return cg.scale(center, 1 / count);
   }

   // MOVE THE POSITION OF A THING.

   let moveThing = (thing, d) => {
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

   // SCALE A THING ABOUT ITS CENTER.

   let scaleThing = (thing, d) => {
      let s = 1 + 4 * d[1];
      let center = computeThingCenter(thing);
      let strokes = thing.strokes;
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

   // SPIN A THING AROUND ITS CENTER.

   let spinThing = (thing, d) => {
      let theta = 20 * cg.dot(d, [fm[0],fm[4],fm[8]]);
      let c = Math.cos(theta), s = Math.sin(theta);
      let center = computeThingCenter(thing);
      let spin = p => {
         p = cg.subtract(p, center);
         let x = p[0], z = p[2];
         p[0] =  c * x + s * z;
         p[2] = -s * x + c * z;
         return cg.add(p, center);
      }
      let strokes = thing.strokes;
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

   // DETERMINE WHETHER THE BOUNDING BOXES OF TWO THINGS INTERSECT.

   let isIntersect = (thing1,thing2) => thing1.lo[0] < thing2.hi[0] && thing2.lo[0] < thing1.hi[0]
                                     && thing1.lo[1] < thing2.hi[1] && thing2.lo[1] < thing1.hi[1]
                                     && thing1.lo[2] < thing2.hi[2] && thing2.lo[2] < thing1.hi[2];

   // RENDER THE SCENE FOR THIS CLIENT.

   let g3 = new G3(model, draw => {
      if (things) {
         let hm = clientState.head(clientID);
	 let eye = hm ? hm.slice(12,15) : null;
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

	    // IF A THING IS HIGHLIGHTED, SHOW ITS BOUNDING BOX.

	    if (thing.hilit) {
	       let x0 = thing.lo[0], y0 = thing.lo[1], z0 = thing.lo[2];
	       let x1 = thing.hi[0], y1 = thing.hi[1], z1 = thing.hi[2];
	       draw.color('#ffffff').lineWidth(.0007)
	           .line([x0,y0,z0],[x1,y0,z0]).line([x0,y1,z0],[x1,y1,z0])
	           .line([x0,y0,z1],[x1,y0,z1]).line([x0,y1,z1],[x1,y1,z1])
	           .line([x0,y0,z0],[x0,y1,z0]).line([x1,y0,z0],[x1,y1,z0])
	           .line([x0,y0,z1],[x0,y1,z1]).line([x1,y0,z1],[x1,y1,z1])
	           .line([x0,y0,z0],[x0,y0,z1]).line([x1,y0,z0],[x1,y0,z1])
	           .line([x0,y1,z0],[x0,y1,z1]).line([x1,y1,z0],[x1,y1,z1]);
	    }

	    // SHOW LINKS BETWEEN THINGS.

            if (thing.linkDst)
               for (let i = 0 ; i < thing.linkDst.length ; i++) {
                  let other = findThingFromID(thing.linkDst[i]);
                  let p1 = cg.mTransform(thing.m, thing.ST[3].slice(0,3));
                  let p2 = cg.mTransform(other.m, other.ST[3].slice(0,3));
		  let p3 = eye ? cg.add(p2, cg.scale(cg.normalize(cg.subtract(eye,p2)), .01)) : p2;
                  draw.color('#ffffff').lineWidth(.002).line(p1, p2)
                                       .lineWidth(.010).line(p2, p3);
               }
         }
      }
      draw.text(info, [0,1.2,0]);
   });

   // DETERMINE WHETHER A THING CONTAINS A 3D POINT.

   let isThingAtPoint = (thing, p) => thing.lo && p[0] > thing.lo[0] && p[0] < thing.hi[0] &&
                                                  p[1] > thing.lo[1] && p[1] < thing.hi[1] &&
                                                  p[2] > thing.lo[2] && p[2] < thing.hi[2] ;

   // RETURN THE THING (IF ANY) THAT IS AT A 3D POINT.

   let findThingAtPoint = p => {
      for (let n = 0 ; n < things.length ; n++)
         if (isThingAtPoint(things[n], p))
            return things[n];
      return null;
   }

   model.animate(() => {

      // COMPUTE THE SHARED STATE OF THINGS IN THE SCENE FOR THIS ANIMATION FRAME.

      things = shared(() => {

         // START BY UN-HILIGHTING ALL THINGS.

         for (let n = 0 ; n < things.length ; n++)
            things[n].hilit = 0;

         // LOOP THROUGH EVERY CLIENT:

         for (let I = 0 ; I < clients.length ; I++) {

            // GET THE HEAD MATRIX FOR THIS CLIENT, FORCING ITS Y AXIS TO BE TRUE VERTICAL.

            fm = clientState.head(clients[I]);
	    if (fm) {
              let X = cg.normalize(cg.cross([0,1,0], [fm[8],fm[9],fm[10]]));
              let Z = cg.normalize(cg.cross(X, [0,1,0]));
	      fm = [ X[0],X[1],X[2],0, 0,1,0,0, Z[0],Z[1],Z[2],0, fm[12],fm[13],fm[14],1 ];
            }

            // LOOP THROUGH BOTH HANDS OF THE CLIENT:

            for (let hand in {left:{},right:{}}) {

               // PROVIDE A UNIQUE ID FOR THIS HAND OF THIS CLIENT.

               let id = clients[I] + hand;
               if (clickCount[id] === undefined)
                  clickCount[id] = 0;

               // FIND THE 3D CURSOR, IF ANY.

               let thumb = clientState.finger(clients[I], hand, 0);
               if (thumb == null)
                  continue;
               let P = cg.mix(thumb, clientState.finger(clients[I], hand, 1), .5);

               // ACTIONS DEPEND ON THE CURRENT STATE OF THE HAND OR CONTROLLER:

               let pinchState = clientState.pinchState(clients[I], hand, 1);

               switch (hand) {

               case 'left':
                  switch (pinchState) {

		  // WHILE NOT LEFT PINCHING, KEEP TRACK OF WHICH THING IS AT THE CURSOR.

                  case 'up':
                     thingAtCursor[id] = findThingAtPoint(P);
                     if (thingAtCursor[id]) {
                        thingAtCursor[id].hilit = 1;
                        thingAtCursor[id].dragCount = 0;
                     }
                     break;

                  // WHEN LEFT PINCH STARTS: HIGHLIGHT THE THING AT THE CURSOR AND SET DRAG COUNT TO ZERO.

                  case 'press':
                     if (thingAtCursor[id]) {
                        thingAtCursor[id].hilit = 1;
                        thingAtCursor[id].dragCount = 0;
                     }
                     break;

                  // LEFT DRAG TO MOVE A THING. CLICK THEN DRAG TO SCALE OR SPIN A THING.

                  case 'down':
                     let thing = thingAtCursor[id];
                     if (thing) {
                        thing.hilit = 1;
                        thing.dragCount++;

                        let d = cg.subtract(P, prevP[id]);
			if (clickCount[id] == 0)
			   moveThing(thing, d);
			else if (d[1]*d[1] > d[0]*d[0] + d[2]*d[2])
			   scaleThing(thing, d);
                        else
			   spinThing(thing, d);
                     }
                     break;

                  // LEFT CLICK TWICE TO DELETE A THING.

                  case 'release':

                     // AFTER CLICKING ON THE BACKGROUND OR DRAGGING: SET THE CLICK COUNT TO ZERO.

                     if (! thingAtCursor[id] || thingAtCursor[id] && thingAtCursor[id].dragCount >= np)
                        clickCount[id] = 0;

                     // DOUBLE LEFT CLICK ON A THING: DELETE THE THING.

                     if (thingAtCursor[id] && thingAtCursor[id].dragCount < np && ++clickCount[id] == 2) {
                        deleteThing(thingAtCursor[id]);
                        thingAtCursor[id] = null;
                        clickCount[id] = 0;
                     }
                     break;
                  }
                  break;

               case 'right':
                  switch (pinchState) {

		  // WHILE NOT RIGHT PINCHING:

                  case 'up':

                     // KEEP TRACK OF THE THING AT THE CURSOR, IF ANY.

                     thingAtCursor[id] = findThingAtPoint(P);
                     if (thingAtCursor[id]) {
                        thingAtCursor[id].hilit = 1;
                        thingAtCursor[id].dragCount = 0;
                     }

		     // IF IN MODIFY MODE: MOVE, SCALE OR SPIN A THING.

		     if (modifyThing[id]) {
		        let thing = modifyThing[id].thing;
			thing.hilit = true;
		        let d = cg.subtract(P, prevP[id]);
		        switch (modifyThing[id].state) {
		        case 'move' : moveThing (thing, d); break;
		        case 'scale': scaleThing(thing, d); break;
		        case 'spin' : spinThing (thing, d); break;
                        }
                     }

                     break;

                  // WHEN STARTING A RIGHT PINCH:

                  case 'press':

                     // IF NOT AT A NON-SKETCH THING AND NOT IN MODIFY MODE: START DRAWING A NEW STROKE.

                     thingBeingDrawn[id] = null;
                     if (! clickPointOnBG[id] && ! modifyThing[id] && (! thingAtCursor[id] || thingAtCursor[id].type=='sketch')) {
                        thingBeingDrawn[id] = { type: 'sketch', strokes: [ [P] ], hilit: 0, dragCount: 0 };
                        things.push(thingBeingDrawn[id]);
                     }

                     // WHEN STARTING A RIGHT PINCH ON A NON-SKETCH THING AFTER CLICKING ON THE BACKGROUND: START DRAWING A LINK.

                     linkSrc[id] = null;
                     if (clickPointOnBG[id] && thingAtCursor[id] && thingAtCursor[id].type != 'sketch')
                        linkSrc[id] = thingAtCursor[id];
                     break;

                  // WHILE RIGHT PINCHING:

                  case 'down':

                     // RIGHT DRAG WHILE DRAWING A STROKE: CONTINUE TO DRAW THE STROKE.

                     if (thingBeingDrawn[id]) {
                        thingBeingDrawn[id].strokes[0].push(P);
                        for (let n = 0 ; n < things.length ; n++)
                           if (isIntersect(thingBeingDrawn[id], things[n]))
                              things[n].hilit = 1;
                     }

                     // RIGHT DRAG ON A NON-SKETCH THING: SEND THE DRAG EVENT TO THE THING.

                     else {
                        let thing = thingAtCursor[id];
			if (thing) {
                           thing.dragCount++;
                           if (! modifyThing[id] && ! clickPointOnBG[id] && thingCode[thing.id] && thingCode[thing.id].onDrag) {
                              let p = cg.mTransform(cg.mInverse(thing.m), P);
                              let T = thing.ST[3];
                              for (let j = 0 ; j < 3 ; j++)
                                 p[j] = (p[j] - T[j]) / T[3];
                              thingCode[thing.id].onDrag(p);
                           }
                        }
                     } 

		     // WHEN RIGHT DRAGGING OVER A THING: HILIGHT THE THING.

                     let thing = findThingAtPoint(P);
		     if (thing)
		        thing.hilit = true;

                     break;

                  // WHEN RELEASING A RIGHT PINCH:

                  case 'release':

		     // IF THIS WAS A DRAG GESTURE: SET THE CLICK COUNT TO ZERO.

                     if (thingAtCursor[id] && thingAtCursor[id].dragCount >= np)
                        clickCount[id] = 0;

                     // IF THIS IS JUST AFTER BEING IN MODIFY MODE: END MODIFY MODE AND DO NOTHING ELSE.

                     if (modifyThing[id]) {
                        modifyThing[id] = null;
			break;
                     }

                     // FINISHING CREATING A LINK BETWEEN TWO THINGS.

                     if (linkSrc[id]) {
                        let thing1 = linkSrc[id];
                        let thing2 = findThingAtPoint(P);
                        if (thing2 && thing2.type != 'sketch' && thing2 != thing1) {
                           if (! thing1.linkDst) thing1.linkDst = [];
                           if (! thing2.linkSrc) thing2.linkSrc = [];
                           thing1.linkDst.push(thing2.id);
                           thing2.linkSrc.push(thing1.id);
                        }
                     }

                     // IF RIGHT CLICK ON A NON-SKETCH THING: SEND THE CLICK EVENT TO THE THING.

                     if (! clickPointOnBG[id]) {
                        if (thingAtCursor[id] && thingAtCursor[id].dragCount < np && thingAtCursor[id].type != 'sketch') {
                           let thing = thingAtCursor[id];
                           if (thingCode[thing.id] && thingCode[thing.id].onClick) {
                              let p = cg.mTransform(cg.mInverse(thing.m), P);
                              let T = thing.ST[3];
                              for (let j = 0 ; j < 3 ; j++)
                                 p[j] = (p[j] - T[j]) / T[3];
                              thingCode[thing.id].onClick(p);
                           }
                        }
                     }

                     // RIGHT CLICK ON A THING AFTER CLICKING ON THE BACKGROUND: ENTER MODIFY MODE.

                     if (clickPointOnBG[id] && thingAtCursor[id] && thingAtCursor[id].dragCount < np) {

                        // MODIFY MODE TYPE DEPENDS ON COMPASS DIRECTION OF BACKGROUND CLICK AROUND THE THING:

                        let x = cg.dot(cg.subtract(clickPointOnBG[id], P), [fm[0],fm[1],fm[2]]);
                        let y = clickPointOnBG[id][1] - P[1];
			modifyThing[id] = { thing: thingAtCursor[id] };
			modifyThing[id].state = x > 0 && x*x > y*y ? 'delete' :         // EAST
			                        y > 0 && x*x < y*y ? 'scale' :          // NORTH
			                        x < 0 && x*x > y*y ? 'move' :           // WEST
						                     'spin' ;           // SOUTH

                        // IF THE RIGHT CLICK ON THE BACKGROUND WAS TO THE RIGHT OF THE THING: DELETE THE THING.

                        if (modifyThing[id] && modifyThing[id].state == 'delete') {
                           deleteThing(thingAtCursor[id]);
                           thingAtCursor[id] = null;
			   modifyThing[id] = null;
                        }
                     }

                     // JUST FINISHED DRAWING A STROKE:

                     clickPointOnBG[id] = null;
                     if (thingBeingDrawn[id]) {
		        let td = thingBeingDrawn[id];

		        // IF THE STROKE IS VERY SMALL OR QUICK, CLASSIFY IT AS A CLICK STROKE.

			let isClickStroke = Math.max(td.hi[0]-td.lo[0],td.hi[1]-td.lo[1],td.hi[2]-td.lo[2]) < .03
                                            || td.strokes[0].length < np;

                        // DETECT A CLICK STROKE ON THE BACKGROUND.

                        if (isClickStroke) {
                           clickPointOnBG[id] = P;
                           for (let n = 0 ; n < things.length ; n++)
                              if (things[n] != td && isThingAtPoint(things[n], P)) {
                                 clickPointOnBG[id] = null;
                                 break;
                              }
                        }  

                        // IF THE STROKE INTERSECTS AN EXISTING SKETCH:

                        let sketch = null;
                        for (let n = 0 ; n < things.length ; n++) {
                           let thing = things[n];
                           if (thing!=td && thing.type=='sketch' && isIntersect(thing,td))
                              sketch = thing;
                        }
                        if (sketch) {

                           // IF A CLICK STROKE ON A SKETCH: CONVERT THE SKETCH TO A THING.

                           if (isClickStroke) {

                              // FIRST TRANSFORM THE SKETCH STROKES INTO THE INTERNAL COORDINATE SYSTEM OF THE THING.

                              let im = cg.mInverse(fm);
                              let strokes = sketch.strokes;
                              let ss = [];
                              for (let n = 0 ; n < strokes.length ; n++)
                                 if (Array.isArray(strokes[n])) {
                                    let s = [];
                                    for (let i = 0 ; i < strokes[n].length ; i++)
                                       s.push(cg.mTransform(im, strokes[n][i]));
                                    ss.push(s);
                                 }

                              // THEN RECOGNIZE THE STROKES, THEN TRANSFORM BACK.

                              let ST = matchCurves.recognize(ss);
                              for (let k = 0 ; k <= 1 ; k++)
                                 for (let n = 0 ; n < ST[k].length ; n++)
                                    for (let i = 0 ; i < ST[k][n].length ; i++)
                                       ST[k][n][i] = cg.mTransform(fm, ST[k][n][i]);

                              // DELETE THE ORIGINAL SKETCH.

                              deleteThing(sketch);

                              // CREATE THE NEW NON-SKETCH THING AND ADD IT TO THE SCENE.

                              let glyph = matchCurves.glyph(ST[2]);
                              things.push( { type: glyph.name, ST: ST, timer: 0, m: fm, id: cg.uniqueID() } );
                           }

                           // ELSE APPEND THIS NEW STROKE TO THE EXISTING SKETCH.

                           else {
                              sketch.strokes.push(td.strokes[0]);
                              deleteThing(td);
                           }
                        }

                        // IF THIS WAS A CLICK STROKE: DELETE IT.

                        if (td && isClickStroke)
                           deleteThing(td);
                        thingBeingDrawn[id] = null;
                     }
                     break;
                  }
                  break;
               }
               prevP[id] = P;
            }
         }

         // PROPAGATE VALUES ACROSS LINKS.

         for (let n = 0 ; n < things.length ; n++) {
            let thing1 = things[n];
            if (thing1.linkDst)
            for (let i = 0 ; i < thing1.linkDst.length ; i++) {
               let thing2 = findThingFromID(thing1.linkDst[i]);
               let code1 = thingCode[thing1.id];
               let code2 = thingCode[thing2.id];
               if (code1 && code1.output && code2 && code2.input)
                 code2.input(code1.output());
            }
         }

         // UPDATE THE APPEARANCE OF NON-SKETCH THINGS.

         for (let n = 0 ; n < things.length ; n++) {
            let thing = things[n];
            if (thing.type != 'sketch') {

	       // MAKE SURE THE THING HAS ASSOCIATED CODE.

	       if (! thingCode[thing.id]) {
                  let glyph = matchCurves.glyph(thing.ST[2]);
                  try {
                     thingCode[thing.id] = new glyph.code();
                  } catch (err) {
                     thingCode[thing.id] = glyph.code;
                  }
               }

               // MORPH A NON-SKETCH THING FROM HOW IT HAD APPEARED AS A SKETCH.

               if (thing.timer < 1) {
                  thing.timer += 1.8 * model.deltaTime;
                  thing.strokes = matchCurves.mix(thing.ST[0], thing.ST[1], cg.ease(thing.timer));
               }

               // UPDATE THE APPEARANCE OF A NON-SKETCH THING.

               else {
                  if (thingCode[thing.id]) {
                     thing.timer += model.deltaTime;
                     thing.strokes = matchCurves.animate(() => thingCode[thing.id].update(thing.timer-1),
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
         }

         // COMPUTE A BOUNDING BOX AROUND EVERY THING.

         for (let n = 0 ; n < things.length ; n++) {
            let thing = things[n];
            thing.lo = [ 1000, 1000, 1000 ];
            thing.hi = [-1000,-1000,-1000 ];
            for (let n = 0 ; n < thing.strokes.length ; n++)
               if (Array.isArray(thing.strokes[n]))
                  for (let i = 0 ; i < thing.strokes[n].length ; i++)
                     for (let j = 0 ; j < 3 ; j++) {
                        thing.lo[j] = Math.min(thing.lo[j], thing.strokes[n][i][j] - .01);
                        thing.hi[j] = Math.max(thing.hi[j], thing.strokes[n][i][j] + .01);
                     }
         }

         return things;
      });
      g3.update();
   });
}

