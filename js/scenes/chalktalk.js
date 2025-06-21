import * as cg from "../render/core/cg.js";
import { G3 } from "../util/g3.js";
import { matchCurves } from "../render/core/matchCurves3D.js";

let imageNames = 'car,cup,dog,elephant,fish,horse,house,moose,rhinoceros,shoe,toaster'.split(',');
let images = {};
for (let i = 0 ; i < imageNames.length ; i++) {
   let name = imageNames[i];
   images[name] = new Image();
   images[name].src = 'media/images/' + name + '.png';
}

server.init('chalktalkState', { newClient: 30 });

export const init = async model => {

   let drawColor = '#ff00ff';  // DEFAULT DRAWING COLOR
   let info = '';              // IN CASE WE NEED TO SHOW DEBUG INFO IN THE SCENE
   let isNewClient = true;     // TRUE ONLY WHEN A CLIENT FIRST LOADS
   let fm;                     // FORWARD HEAD MATRIX FOR THE CLIENT BEING EVALUATED
   let np = 10;                // NUMBER OF POINTS NEEDED FOR A STROKE TO NOT BE A CLICK
   let speech = '';            // THE MOST RECENT THING THAT ANYBODY SAID

   let prevP = {},             // PREVIOUS CURSOR POSITION FOR EACH HAND OF EVERY CLIENT
       things = [],            // THINGS SHARED BETWEEN CLIENTS
       linkSrc = {},           // THE SOURCE OF THE LINK BEING DRAWN
       thingCode = {},         // CODE FOR THING INSTANCES
       clickOnBG = {},         // AFTER A CLICK ON THE BACKGROUND, SET CLICK INFO
       clickCount = {},        // NUMBER OF CLICKS IN A ROW FOR EACH HAND OF EVERY CLIENT
       modifyThing = {},       // SET TO TRUE AFTER A CLICK ON THE BACKGROUND
       strokesCache = {},      // STROKES CACHED IN EACH CLIENT
       thingAtCursor = {},     // THING AT CURSOR FOR EACH HAND OF EVERY CLIENT
       thingBeingDrawn = {};   // THING CURRENTLY BEING DRAWN FOR EACH HAND OF EVERY CLIENT

   // KEEP TRACK OF THE MOST RECENT THING THAT ANYBODY SAID.

   window.onSpeech = (_speech, id) => speech = _speech;

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
            { text: (50*t+50>>0)/100, p: [1.1,0,0], size: .03, align: 'left' },
         ];
      }
      this.input = value => t = 2 * value - 1;
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
         { text: (50*t+50>>0)/100, p: [0,1.15,0], size: .03 },
      ];
      this.input = value => t = 2 * value - 1;
      this.output = () => .5 * t + .5;
   });

   let circlePoint = t => [ Math.sin(t), Math.cos(t), 0 ];
   let circle = phase => {
      phase = phase ?? 0;
      let c = [];
      for (let n = 0 ; n <= 24 ; n++)
         c.push(circlePoint(2 * Math.PI * n / 24 + phase));
      return c;
   }

   addThingType('timer', function() {
      let rate = 0, t = 0, prevTime;
      this.sketch = () => [ circle(), [ circlePoint(0), [0,0,0] ] ];
      this.update = time => {
         t += rate * (time - (prevTime ?? time));
         prevTime = time;
         let min = t >> 0;
         let sec = (60 * t % 60) >> 0;
         let text = min + ':' + (sec < 10 ? '0' : '') + sec;
         return [
            circle(),
            [ circlePoint(2 * Math.PI * t), [0,0,0] ],
            { text: text, p: [0,-.5,0], size: .03 },

         ];
      };
      this.input = value => rate = value;
      this.output = () => t;
   });

   addThingType('wave', function() {
      let t = 0;
      let wave = t => {
         let s = [];
         for (let n = 0 ; n <= 24 ; n++)
            s.push([2 * n/24 - 1, Math.sin(2 * Math.PI * (n/24 - t)) / Math.PI, 0]);
         return s;
      }
      this.sketch = () => [ wave(0) ];
      this.update = () => [ wave(t) ];
      this.input = value => t = value;
   });

   let squircle = phase => {
      phase = phase ?? 0;
      let c = [];
      for (let n = 0 ; n <= 24 ; n++) {
         let t = 2 * Math.PI * n / 24 + phase;
         let x = Math.sin(t);
         let y = Math.cos(t);
         let r = Math.pow(x*x*x*x + y*y*y*y, 1/4);
         c.push([x/r, y/r, 0]);
      }
      return c;
   }

   addThingType('speech', function() {
      let text = 'thing', imageName;
      this.onClick = () => {
         imageName = null;
	 for (let i = 0 ; i < imageNames.length ; i++) {
	    let name = imageNames[i];
	    if (speech.toLowerCase().indexOf(name) >= 0)
               imageName = name;
         }
	 text = imageName ? '' : speech;
      }
      this.sketch = () => [ squircle(Math.PI) ];
      this.update = () => {
         let graphics = [ ];
	 if (! imageName)
            graphics.push(squircle(Math.PI));
         if (imageName)
            graphics.push( { image: imageName, p:[0,0,0], size: .15 } );
         if (text)
            graphics.push( { text: text, p:[0,0,0], size:.03 } );
         return graphics;
      }
   });

///////////////////////////////////////////////////////////////////////////////

   let containsLink = (links, thing) => {
      if (links)
         for (let i = 0 ; i < links.length ; i++)
            if (links[i].id == thing.id)
               return true;
      return false;
   }

   let removeLink = (links, thing) => {
      if (links)
         for (let i = 0 ; i < links.length ; i++)
            if (links[i].id == thing.id)
               links.splice(i, 1);
   }

   // DELETE A THING FROM THE SCENE.

   let deleteThing = thing => {
      for (let n = 0 ; n < things.length ; n++)
         if (thing == things[n]) {
            things.splice(n, 1);
            break;
         }

      // ALSO REMOVE ANY LINKS TO THE THING.

      for (let n = 0 ; n < things.length ; n++)
         removeLink(things[n].links, thing);
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
         if (stroke.image !== undefined) {
	    center = stroke.p;
	    count = 1;
	    break;
         }
         else if (Array.isArray(stroke))
            for (let i = 0 ; i < stroke.length ; i++, count++)
               center = cg.add(center, stroke[i]);
      }
      return cg.mTransform(thing.m, cg.scale(center, 1 / count));
   }

   // MOVE THE POSITION OF A THING.

   let moveThing = (thing, d) => {
      if (thing.m)
         for (let j = 0 ; j < 3 ; j++)
            thing.m[12 + j] += d[j];
   }

   // SCALE A THING ABOUT ITS CENTER.

   let scaleThing = (thing, d) => {
      let s = 1 + 4 * d[1];
      let center = computeThingCenter(thing);
      let scale = p => cg.add(cg.scale(cg.subtract(p, center), s), center);
      if (thing.m) {
         for (let j = 0 ; j < 3 ; j++)
            thing.m[12 + j] -= center[j];
         thing.m = cg.mMultiply(cg.mScale(s), thing.m);
         for (let j = 0 ; j < 3 ; j++)
            thing.m[12 + j] += center[j];
      }
   }

   // SPIN A THING AROUND ITS CENTER.

   let spinThing = (thing, d) => spinThingByTheta(thing, 20 * cg.dot(d, [fm[0],fm[4],fm[8]]));

   let spinThingByTheta = (thing, theta) => {
      let center = computeThingCenter(thing);
      for (let j = 0 ; j < 3 ; j++)
         thing.m[12 + j] -= center[j];
      thing.m = cg.mMultiply(cg.mRotateY(theta), thing.m);
      for (let j = 0 ; j < 3 ; j++)
         thing.m[12 + j] += center[j];
   }

   // DETERMINE WHETHER THE BOUNDING BOXES OF TWO THINGS INTERSECT.

   let isIntersect = (thing1,thing2) => thing1.lo[0] < thing2.hi[0] && thing2.lo[0] < thing1.hi[0]
                                     && thing1.lo[1] < thing2.hi[1] && thing2.lo[1] < thing1.hi[1]
                                     && thing1.lo[2] < thing2.hi[2] && thing2.lo[2] < thing1.hi[2];

   // RENDER THE SCENE FOR THIS CLIENT.

   let g3 = new G3(model, draw => {
      if (things) {

         // TURN ANY HUD THING TOWARD EACH CLIENT WHEN DISPLAYING.

         if (draw.view() == 0)
            for (let n = 0 ; n < things.length ; n++) {
               let thing = things[n];
               if (thing.hud && thing.m) {
                  let m = thing.m;
                  let ray = cg.subtract(thing.fp, computeThingCenter(thing));
                  spinThingByTheta(thing, Math.atan2(ray[0], ray[2]) - Math.atan2(m[8], m[10]));
               }
            }

         let hm = clientState.head(clientID);
         let eye = hm && Array.isArray(hm) ? hm.slice(12,15) : null;
         for (let n = 0 ; n < things.length ; n++) {
            let thing = things[n];
            draw.color(drawColor).lineWidth(thing.hilit ? .006 : .003);
	    let m = thing.m;
            let strokes = thing.strokes;
            for (let n = 0 ; n < strokes.length ; n++) {
               let stroke = strokes[n];
               if (Array.isArray(stroke)) {
	          let s = [];
                  for (let i = 0 ; i < stroke.length ; i++)
		     s.push(cg.mTransform(m, stroke[i]));
                  for (let i = 0 ; i < s.length - 1 ; i++)
                     draw.line(s[i], s[i+1]);
               }
               else if (stroke.text !== undefined) {
                  if (stroke.size)
                     draw.textHeight(cg.norm(m.slice(0,3)) * stroke.size);
                  draw.text(stroke.text, cg.mTransform(m, stroke.p), stroke.align ?? 'center', stroke.x ?? 0, stroke.y ?? 0);
               }
               else if (stroke.image !== undefined)
                  draw.image(images[stroke.image], cg.mTransform(m, stroke.p), 0,0, 0,stroke.size);
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

            if (thing.links) {
               let thing1 = thing;
               for (let i = 0 ; i < thing1.links.length ; i++) {
                  let thing2 = findThingFromID(thing1.links[i].id);
                  let p1 = transformOutof(thing1, [0,0,0]);
                  let p2 = transformOutof(thing2, [0,0,0]);
                  let p3 = eye ? cg.add(p2, cg.scale(cg.normalize(cg.subtract(eye,p2)), .01)) : p2;

                  let isHilit = false;
                  for (let id in thing.links[i].at)
                     if (thing.links[i].at[id])
                        isHilit = true;

                  draw.color('#ffffff').lineWidth(.010).line(p2, p3)
                                       .lineWidth(isHilit ? .005 : .002).line(p1, p2);

                  // DRAW A DIRECTIONAL ARROWHEAD IN THE MIDDLE OF EACH LINK.

                  let p = cg.mix(p1, p2, .5);
                  let u = cg.normalize(cg.subtract(p2, p1));
                  let v = cg.normalize(cg.cross(cg.cross(u,[0,1,0]),u));
                  let pa = cg.add(p, cg.add(cg.scale(u,-.01),cg.scale(v, .01)));
                  let pb = cg.add(p, cg.add(cg.scale(u,-.01),cg.scale(v,-.01)));
                  draw.line(pa,p).line(p,pb);
               }
            }
         }
      }
      draw.text(info, [0,.8,0]);
   });

   // DETERMINE WHETHER A THING CONTAINS A 3D POINT.

   let isThingAtPoint = (thing, p) => thing.lo && p[0] > thing.lo[0] && p[0] < thing.hi[0] &&
                                                  p[1] > thing.lo[1] && p[1] < thing.hi[1] &&
                                                  p[2] > thing.lo[2] && p[2] < thing.hi[2] ;

   // RETURN THE THING, IF ANY, THAT IS AT A 3D POINT.

   let findThingAtPoint = p => {
      for (let n = 0 ; n < things.length ; n++)
         if (isThingAtPoint(things[n], p))
            return things[n];
      return null;
   }

   // TRANSFORM A POINT INTO OR OUT OF THE INTERNAL COORDS OF A THING.

   let transformOutof = (thing, p) => {
      let T = thing.ST[3];
      let q = [];
      for (let j = 0 ; j < 3 ; j++)
         q[j] = T[3] * p[j] + T[j];
      return cg.mTransform(thing.m, q);
   }

   let transformInto = (thing, p) => {
      let q = cg.mTransform(cg.mInverse(thing.m), p);
      let T = thing.ST[3];
      for (let j = 0 ; j < 3 ; j++)
         q[j] = (q[j] - T[j]) / T[3];
      return q;
   } 

   model.animate(() => {

      // WHEN A NEW CLIENT JOINS, MAKE SURE IT RECEIVES ALL EXISTING STROKES AT FIRST.

      chalktalkState = server.synchronize('chalktalkState');

      if (isNewClient) {
         chalktalkState.newClient = 30;
	 server.broadcastGlobal('chalktalkState');
	 isNewClient = false;
      }

      // COMPUTE THE SHARED STATE OF THINGS IN THE SCENE FOR THIS ANIMATION FRAME.

      things = shared(() => {

         // START BY UN-HILIGHTING ALL THINGS.

         if (things)
            for (let n = 0 ; n < things.length ; n++) {
               things[n].hilit = 0;
	       things[n].updatedStrokes = false;
            }

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

               switch (clientState.pinchState(clients[I], hand, 1)) {

               // WHILE NOT PINCHING:

               case 'up':

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
                  
                  else {

                     // KEEP TRACK OF THE THING AT THE CURSOR, IF ANY.

                     thingAtCursor[id] = findThingAtPoint(P);
                     if (thingAtCursor[id]) {
                        thingAtCursor[id].hilit = 1;
                        thingAtCursor[id].dragCount = 0;
                     }

                     // CHECK FOR A LINK AT THE CURSOR FOR THIS HAND OF THIS CLIENT.

                     for (let n = 0 ; n < things.length ; n++) {
                        let thing1 = things[n];
                        if (thing1.links)
                           for (let i = 0 ; i < thing1.links.length ; i++) {
                              let thing2 = findThingFromID(thing1.links[i].id);
                              let p = cg.mix(transformOutof(thing1, [0,0,0]),
                                             transformOutof(thing2, [0,0,0]), .5);
                              thing1.links[i].at[id] = cg.distance(p, P) < .02;
                           }
                     }
                  }

                  break;

               // WHEN STARTING A PINCH:

               case 'press':

                  // IF NOT AT A NON-SKETCH THING AND NOT IN MODIFY MODE: START DRAWING A NEW STROKE.

                  thingBeingDrawn[id] = null;
                  if (! clickOnBG[id] && ! modifyThing[id] && (! thingAtCursor[id] || thingAtCursor[id].type=='sketch')) {
                     thingBeingDrawn[id] = { id: cg.uniqueID(),
		                             type: 'sketch',
					     m: cg.mIdentity(),
					     strokes: [ [P] ],
					     hilit: 0,
					     updatedStrokes: true,
					     dragCount: 0 };
                     things.push(thingBeingDrawn[id]);
                  }

                  // CLICK ON BACKGROUND FOLLOWED BY PINCH ON A THING:

                  if (clickOnBG[id] && thingAtCursor[id]) {
                     let center = computeThingCenter(thingAtCursor[id]);
                     let x = cg.dot(cg.subtract(clickOnBG[id].p, center), [fm[0],fm[1],fm[2]]);
                     let y = clickOnBG[id].p[1] - center[1];
                     let dir = ((4 * (Math.atan2(y, x) + Math.PI/8) / Math.PI >> 0) + 8) % 8;
                     clickOnBG[id].dir = (8 + 4 * (Math.atan2(y, x) + Math.PI/8) / Math.PI >> 0) % 8;
                  }

                  // START A PINCH ON A NON-SKETCH THING AFTER CLICK TO ITS LEFT ON THE BACKGROUND: START DRAWING A LINK.

                  linkSrc[id] = null;
                  if (clickOnBG[id] && clickOnBG[id].dir == 4 && thingAtCursor[id].type != 'sketch')
                     linkSrc[id] = thingAtCursor[id];
                  break;

               // WHILE PINCHING:

               case 'down':

                  // DRAG WHILE DRAWING A STROKE: CONTINUE TO DRAW THE STROKE.

                  if (thingBeingDrawn[id]) {
		     thingBeingDrawn[id].updatedStrokes = true;
                     thingBeingDrawn[id].strokes[0].push(P);
                     for (let n = 0 ; n < things.length ; n++)
                        if (isIntersect(thingBeingDrawn[id], things[n]))
                           things[n].hilit = 1;
                  }

                  // DRAG ON A NON-SKETCH THING: SEND THE DRAG EVENT TO THE THING.

                  else {
                     let thing = thingAtCursor[id];
                     if (thing) {
                        thing.dragCount++;
                        if (! modifyThing[id] && ! clickOnBG[id] && thingCode[thing.id] && thingCode[thing.id].onDrag)
                           thingCode[thing.id].onDrag(transformInto(thing, P));
                     }
                  } 

                  // WHEN DRAGGING OVER A THING: HILIGHT THE THING.

                  let thing = findThingAtPoint(P);
                  if (thing)
                     thing.hilit = true;

                  break;

               // WHEN RELEASING A PINCH:

               case 'release':

                  // IF CLICKED ON THE MIDDLE OF A LINK, REMOVE THE LINK.

                  let isLinkRemoved = false;
                  for (let n = 0 ; n < things.length ; n++) {
                     let thing = things[n];
                     if (thing.links) {
                        for (let i = 0 ; i < thing.links.length ; i++) {
                           if (thing.links[i].at[id]) {
                              removeLink(thing.links, findThingFromID(thing.links[i].id));
                              isLinkRemoved = true;
                              break;
                           }
                        }
                     }
                  }

                  // IF A LINK WAS JUST REMOVED, DELETE THE DRAWN STROKE AND DO NOTHING ELSE.

                  if (isLinkRemoved) {
                     deleteThing(thingBeingDrawn[id]);
                     thingBeingDrawn[id] = null;
                     break;
                  }

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
                        if (! thing1.links)
                           thing1.links = [];
                        thing1.links.push( { id: thing2.id, at: {} } );
                     }
                  }

                  // IF WAS CLICKING ON A NON-SKETCH THING: SEND THE CLICK EVENT TO THE THING.

                  if (! clickOnBG[id] && thingAtCursor[id] && thingAtCursor[id].type != 'sketch' && thingAtCursor[id].dragCount < np) {
                     let thing = thingAtCursor[id];
                     if (thingCode[thing.id] && thingCode[thing.id].onClick)
                        thingCode[thing.id].onClick(transformInto(thing, P));
                  }

                  // IF WAS CLICKING ON A THING AFTER CLICKING ON THE BACKGROUND: ENTER MODIFY MODE.

                  if (clickOnBG[id] && thingAtCursor[id] && thingAtCursor[id].dragCount < np) {
                     let thing = thingAtCursor[id];
                     switch (clickOnBG[id].dir) {
                     case 0:
                        deleteThing(thing);
                        thingAtCursor[id] = null;
                        break;
                     case 2: modifyThing[id] = { thing: thing, state: 'scale' } ; break;
                     case 4: modifyThing[id] = { thing: thing, state: 'move'  } ; break;
                     case 6: modifyThing[id] = { thing: thing, state: 'spin'  } ; break;
                     }
                  }

                  if (clickOnBG[id] && thingAtCursor[id] && thingAtCursor[id].dragCount >= np)
                     if (clickOnBG[id].dir == 6)
                        thingAtCursor[id].hud = ! thingAtCursor[id].hud;

                  // IF JUST FINISHED DRAWING A STROKE:

                  clickOnBG[id] = null;
                  if (thingBeingDrawn[id]) {
                     let td = thingBeingDrawn[id];
		     td.updatedStrokes = true;

                     // IF THE STROKE IS VERY SMALL OR QUICK, CLASSIFY IT AS A CLICK STROKE.

                     let isClickStroke = Math.max(td.hi[0]-td.lo[0],td.hi[1]-td.lo[1],td.hi[2]-td.lo[2]) < .03
                                         || td.strokes[0].length < np;

                     // DETECT A CLICK STROKE ON THE BACKGROUND.

                     if (isClickStroke) {
                        clickOnBG[id] = { p: P };
                        for (let n = 0 ; n < things.length ; n++)
                           if (things[n] != td && isThingAtPoint(things[n], P)) {
                              clickOnBG[id] = null;
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

                        // IF THIS WAS A CLICK STROKE ON A SKETCH: CONVERT THE SKETCH TO A THING.

                        if (isClickStroke) {

                           // TRANSFORM THE SKETCH STROKES INTO THE INTERNAL COORDINATE SYSTEM OF THE THING.

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

                           // RECOGNIZE THE STROKES, DELETE THE SKETCH, CREATE THE NEW THING, ADD IT TO THE SCENE.

                           let ST = matchCurves.recognize(ss);
                           deleteThing(sketch);
                           let glyph = matchCurves.glyph(ST[2]);
                           things.push( { type: glyph.name, ST: ST, timer: 0, m: fm, id: cg.uniqueID() } );
                        }

                        // ELSE APPEND THIS NEW STROKE TO THE EXISTING SKETCH.

                        else {
                           sketch.strokes.push(td.strokes[0]);
			   sketch.updatedStrokes = true;
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
               prevP[id] = P;
            }
         }

	 if (! things)
	    return things;

         // PROPAGATE VALUES ACROSS LINKS.

         for (let n = 0 ; n < things.length ; n++) {
            let thing1 = things[n];
            if (thing1.links)
               for (let i = 0 ; i < thing1.links.length ; i++) {
                  let thing2 = findThingFromID(thing1.links[i].id);
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
		  thing.updatedStrokes = true;
                  if (thing.timer >= 1) {
                     thing.ST[0] = null; // AFTER THIS POINT, THESE ARE NO LONGER NEEDED.
                     thing.ST[1] = null; // DELETING THEM SAVES BANDWIDTH BETWEEN CLIENTS.
                  }
               }

               // UPDATE THE APPEARANCE OF A NON-SKETCH THING.

               else {
                  if (thingCode[thing.id]) {
                     thing.timer += model.deltaTime;
                     thing.strokes = matchCurves.animate(() => thingCode[thing.id].update(thing.timer-1),
                                                         cg.mIdentity(), thing.timer-1, thing.ST[3]);
		     thing.updatedStrokes = true;

                     // IF HUD, PREPARE TO TURN THE THING TOWARD EACH CLIENT WHEN DISPLAYING IT.

                     if (thing.hud)
                        thing.fp = fm.slice(12,15);
                  }
               }
            }
         }

         // COMPUTE A BOUNDING BOX AROUND EVERY THING.

         for (let n = 0 ; n < things.length ; n++) {
            let thing = things[n];
	    let m = thing.m;
	    let scale = cg.norm(m.slice(0,3));
            thing.lo = [ 1000, 1000, 1000 ];
            thing.hi = [-1000,-1000,-1000 ];
            for (let n = 0 ; n < thing.strokes.length ; n++) {
	       let stroke = thing.strokes[n];

	       // IF THIS THING HAS STROKES, BUILD A BOUNDING BOX BASED ON ITS STROKES.

               if (Array.isArray(stroke))
                  for (let i = 0 ; i < stroke.length ; i++) {
		     let p = cg.mTransform(m, stroke[i]);
                     for (let j = 0 ; j < 3 ; j++) {
                        thing.lo[j] = Math.min(thing.lo[j], p[j]);
                        thing.hi[j] = Math.max(thing.hi[j], p[j]);
                     }
                  }

               // IF THIS IS AN IMAGE, MAKE ITS BOUNDING BOX A CUBE.

               else if (stroke.image !== undefined) {
		  let p = cg.mTransform(m, stroke.p);
		  let size = scale * stroke.size;
		  for (let j = 0 ; j < 3 ; j++) {
	             thing.lo[j] = Math.min(thing.lo[j], p[j] - size / 2);
	             thing.hi[j] = Math.max(thing.hi[j], p[j] + size / 2);
                  }
	       }
	    }

	    // MAKE THE BOUNDING BOX SLIGHTLY LARGER THAN THE THING ITSELF.

            for (let j = 0 ; j < 3 ; j++) {
               thing.lo[j] -= .01;
               thing.hi[j] += .01;
            }
         }

         // UNLESS A NEW CLIENT HAS RECENTLY JOINED

         if (chalktalkState.newClient > 0) {
            for (let n = 0 ; n < things.length ; n++)
               things[n].updatedStrokes = true;
            chalktalkState.newClient--;
	    server.broadcastGlobal('chalktalkState');
         }

         // RELY ON CACHED STROKES FOR THINGS WHOSE STROKES HAVE NOT CHANGED.

	 else {
            for (let n = 0 ; n < things.length ; n++)
               if (! things[n].updatedStrokes)
                  things[n].strokes = [];
         }

         return things;
      });

      // FOR ANY THING WHOSE STROKES WERE NOT SENT, USED CACHED STROKES.

      if (things)
         for (let n = 0 ; n < things.length ; n++) {
	    let thing = things[n];
	    let id = thing.id;
            if (thing.updatedStrokes)
	       strokesCache[id] = thing.strokes;
            else
	       thing.strokes = strokesCache[id] ?? [];
	 }

      g3.update();
   });
}

