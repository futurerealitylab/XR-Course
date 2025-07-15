import * as cg from "../render/core/cg.js";
import { G3 } from "../util/g3.js";
import { matchCurves } from "../render/core/matchCurves3D.js";

let imageNames = 'apple,bear,car,cup,document,dog,elephant,fish,goat,horse,house,igloo,moose,rhinoceros,shoe,toaster'.split(',');
let images = {};
for (let i = 0 ; i < imageNames.length ; i++) {
   let name = imageNames[i];
   images[name] = new Image();
   images[name].src = 'media/images/' + name + '.png';
}

export const init = async model => {
   let drawColor = '#ff00ff';      // DEFAULT DRAWING COLOR
   let info = '';                  // IN CASE WE NEED TO SHOW DEBUG INFO IN THE SCENE
   let isClearingScene = false;    // FLAG TO CLEAR THE SCENE
   let isNewClient = true;         // TRUE ONLY WHEN A CLIENT FIRST LOADS
   let isOKToProceed = false;      // TRUE ONLY WHEN A CLIENT FIRST LOADS
   let fm;                         // FORWARD HEAD MATRIX FOR THE CLIENT BEING EVALUATED
   let nextSceneID = 'A';
   let np = 10;                    // NUMBER OF POINTS NEEDED FOR A STROKE TO NOT BE A CLICK
   let sceneID = 'A';
   let speech = '';                // THE MOST RECENT THING THAT ANYBODY SAID
   let things = [];
   let who;
   let waitForLoadCounter = false; // COUNTER FOR WAITING AFTER FIRST LOADING THE SCENE

   let timeStamp;
   {
      let date = new Date();
      let Y = date.getFullYear() % 100, M = date.getMonth(), D = date.getDate(),
          h = date.getHours(), m = date.getMinutes(), s = date.getSeconds();
      let pad = n => (n < 10 ? '0' : '') + n;
      timeStamp = pad(Y) + pad(M) + pad(D) + '_' + pad(h) + pad(m) + pad(s);
   }

   let prevP = {},                 // PREVIOUS CURSOR POSITION FOR EACH HAND OF EVERY CLIENT
       linkSrc = {},               // THE SOURCE OF THE LINK CURRENTLY BEING DRAWN
       thingCode = {},             // CODE FOR THING INSTANCES
       clickOnBG = {},             // AFTER A CLICK ON THE BACKGROUND, SET CLICK INFO
       clickCount = {},            // NUMBER OF CLICKS IN A ROW FOR EACH HAND OF EVERY CLIENT
       modifyThing = {},           // SET TO TRUE AFTER A CLICK ON THE BACKGROUND
       strokesCache = {},          // STROKES CACHED IN EACH CLIENT
       thingAtCursor = {},         // THING AT CURSOR FOR EACH HAND OF EVERY CLIENT
       thingBeingDrawn = {};       // THING CURRENTLY BEING DRAWN FOR EACH HAND OF EVERY CLIENT

   // KEEP TRACK OF THE MOST RECENT THING THAT ANYBODY SAID.

   window.onSpeech = (_speech, id) => speech = _speech;

   let actions = [];

   let action = (type, info) => {
      info.type = type;
      info.time = (1000 * model.time + .5) >> 0;
      if (actions.length > 0) {
         let prev = actions[actions.length-1];
	 if (info.type == prev.type && info.p && cg.distance(info.p, prev.p) == 0)
	    return;
      }
      actions.push(info);
      let s = '';
      for (let n = 0 ; n < actions.length ; n++) {
         let info = actions[n];
	 let time = info.time / 1000;
	 s += time < 10 ? '  ' : time < 100 ? ' ' : '';
         s += time + '\t' + who + '\t' + info.type;
	 if (info.id)
	   s += '\t' + info.id;
	 if (info.a)
	   s += '\t' + info.a + '\t' + info.b;
	 if (info.data)
	   s += '\t' + info.data;
	 if (info.p)
	   s += '\t' + cg.roundFloat(4, info.p[0]) + ','
	             + cg.roundFloat(4, info.p[1]) + ','
		     + cg.roundFloat(4, info.p[2]);
         s += '\n';
      }
      server.set('ca' + sceneID + '_' + timeStamp, s, true);
   }

   // DEFINE A NEW PROCEDURAL THING TYPE.

   let addThingType = (name, ThingType) => {
      let thing = new ThingType();
      matchCurves.addGlyphFromCurves(name, thing.sketch(), ThingType);
   }

/////////////////////////// PROCEDURAL THING TYPES THAT WE HAVE DEFINED SO FAR:

   addThingType('clear', function() {
      this.sketch = () => [ [[1,0,0],[-1,0,0]], [[-1,0,0],[1,0,0]] ];
      this.update = () => this.sketch();
      this.onClick = () => { isClearingScene = true; }
   });

   addThingType('scenes', function() {
      let s = [['A','B','C','D','E'],
               ['F','G','H','I','J'],
               ['K','L','M','N','O'],
               ['P','Q','R','S','T'],
               ['U','V','W','X','Y']];
      this.sketch = () => [ [[-1,1,0],[1,1,0]], [[-1,1,0],[-1,-1,0]] ];
      this.update = () => {
         let graphics = [];
         graphics.push([[-1,.9,0],[1,.9,0],[1,-.9,0],[-1,-.9,0],[-1,.9,0]]);
         for (let row = 0 ; row < 5 ; row++)
         for (let col = 0 ; col < 5 ; col++)
            graphics.push({ text: s[row][col], p:[.35*col-.7,.7-.35*row,0], size:.027 });
         return graphics;
      }
      this.onClick = p => {
         let col = Math.max(0, Math.min(4, 5 * (.5 + .5 * p[0]) >> 0));
         let row = Math.max(0, Math.min(4, 5 * (.5 - .5 * p[1]) >> 0));
         nextSceneID = s[row][col];
	 isNewClient = true;
      }
   });

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
      this.state = 0;
      this.onDrag = p => this.state = Math.max(-1, Math.min(1, p[0]));
      this.onClick = this.onDrag;
      this.sketch = () => [ [ [-1,0,0],[1,0,0] ], [ [this.state,.2,0],[this.state,-.2,0] ] ];
      this.update = time => {
         return [
            [ [-1,0,0],[1,0,0] ],
            [ [this.state,-.2,0],[this.state,.2,0] ],
            { text: (50*this.state+50>>0)/100, p: [1.1,0,0], size: .03, align: 'left' },
         ];
      }
      this.input = value => this.state = 2 * value - 1;
      this.output = () => .5 * this.state + .5;
   });

   addThingType('ySlider', function() {
      this.state = 0;
      this.onDrag = p => this.state = Math.max(-1, Math.min(1, p[1]));
      this.onClick = this.onDrag;
      this.sketch = () => [ [ [0,1,0],[0,-1,0] ], [ [-.2,this.state,0],[.2,this.state,0] ] ];
      this.update = time => [
         [ [0,1,0],[0,-1,0] ],
         [ [-.2,this.state,0],[.2,this.state,0] ],
         { text: (50*this.state+50>>0)/100, p: [0,1.15,0], size: .03 },
      ];
      this.input = value => this.state = 2 * value - 1;
      this.output = () => .5 * this.state + .5;
   });

   addThingType('timer', function() {
      let circlePoint = t => [ Math.sin(t), Math.cos(t), 0 ];
      let circle = phase => {
         phase = phase ?? 0;
         let c = [];
         for (let n = 0 ; n <= 24 ; n++)
            c.push(circlePoint(2 * Math.PI * n / 24 + phase));
         return c;
      }
      let prevTime, rate = 0;

      this.state = 0;
      this.sketch = () => [ circle(), [ circlePoint(0), [0,0,0] ] ];
      this.update = time => {
         this.state += rate * (time - (prevTime ?? time));
         prevTime = time;
         let min = this.state >> 0;
         let sec = (60 * this.state % 60) >> 0;
         let text = min + ':' + (sec < 10 ? '0' : '') + sec;
         return [
            circle(),
            [ circlePoint(2 * Math.PI * this.state), [0,0,0] ],
            { text: text, p: [0,-.5,0], size: .03 },

         ];
      };
      this.input = value => rate = value;
      this.output = () => this.state;
   });

   addThingType('wave', function() {
      this.state = 0;
      let wave = t => {
         let s = [];
         for (let n = 0 ; n <= 24 ; n++)
            s.push([2 * n/24 - 1, Math.sin(2 * Math.PI * (n/24 - t)) / Math.PI, 0]);
         return s;
      }
      this.sketch = () => [ wave(0) ];
      this.update = () => [ wave(this.state) ];
      this.input = value => this.state = value;
   });

   addThingType('speech', function() {
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

      this.state = { text: 'thing' };
      this.onClick = () => {
         delete this.state.image;
         for (let i = 0 ; i < imageNames.length ; i++) {
            let name = imageNames[i];
            if (speech.toLowerCase().indexOf(name) >= 0)
               this.state.image = name;
         }
         this.state.text = this.state.image ? '' : speech;
      }
      this.sketch = () => [ squircle(Math.PI) ];
      this.update = () => {
         let graphics = [];
         if (! this.state.image)
            graphics.push(squircle(Math.PI));
         if (this.state.image)
            graphics.push( { image: this.state.image, p:[0,0,0], size: .15 } );
         if (this.state.text)
            graphics.push( { text: this.state.text, p:[0,0,0], size:.03 } );
         return graphics;
      }
   });

///////////////////////////////////////////////////////////////////////////////

   // CREATE A LINK BETWEEN TWO THINGS.

   let createLink = (thing1, thing2) => {
      if (thing2 && thing2.type != 'sketch' && thing2 != thing1) {
         if (! thing1.links)
            thing1.links = [];
         thing1.links.push( { id: thing2.id, at: {} } );
         action('link', { a: thing1.id, b: thing2.id });
      }
   }

   // REMOVE ANY LINK TO A THING FROM A SET OF LINKS.

   let removeLink = (links, thing) => {
      if (links)
         for (let i = 0 ; i < links.length ; i++)
            if (links[i].id == thing.id)
               links.splice(i, 1);
   }

   // DELETE A THING FROM THE SCENE.

   let deleteThing = thing => {
      delete strokesCache[thing.id];

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
      let strokes = getStrokes(thing), center = [0,0,0], count = 0;
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

   // GET THE STROKES OF A THING, USING ITS CACHED STROKES AS A BACKUP.

   let getStrokes = thing => {
      let strokes = thing.strokes;
      if (! strokes || strokes.length == 0)
         strokes = strokesCache[thing.id];
      return strokes;
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

         // ROTATE ANY HUD THING TO FACE EACH CLIENT WHEN DISPLAYING.

         if (draw.view() == 0)
            for (let n = 0 ; n < things.length ; n++) {
               let thing = things[n];
               if (thing.hud && thing.m) {
                  let m = thing.m;
                  let ray = cg.subtract(thing.fp, computeThingCenter(thing));
                  spinThingByTheta(thing, Math.atan2(ray[0], ray[2]) - Math.atan2(m[8], m[10]));
               }
            }

         // DISPLAY THE SCENE

         let hm = clientState.head(clientID);
         let eye = hm && Array.isArray(hm) ? hm.slice(12,15) : null;
         for (let n = 0 ; n < things.length ; n++) {
            let thing = things[n];
            draw.color(drawColor).lineWidth(thing.hilit ? .006 : .003);
            let m = thing.m;
            let scale = cg.norm(m.slice(0,3));
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
                     draw.textHeight(scale * stroke.size);
                  if (stroke.font)
                     draw.font(stroke.font);
                  draw.text(stroke.text, cg.mTransform(m, stroke.p), stroke.align ?? 'center', stroke.x ?? 0, stroke.y ?? 0);
                  draw.font('Helveetica');
               }
               else if (stroke.image !== undefined)
                  draw.image(images[stroke.image], cg.mTransform(m, stroke.p), 0,0, 0, scale * stroke.size);
            }

            // DRAW THE 12 EDGES OF AN AXIS-ALIGNED BOX.

            let box = (x0,y0,z0, x1,y1,z1) => 
               draw.line([x0,y0,z0],[x1,y0,z0]).line([x0,y1,z0],[x1,y1,z0])
                   .line([x0,y0,z1],[x1,y0,z1]).line([x0,y1,z1],[x1,y1,z1])
                   .line([x0,y0,z0],[x0,y1,z0]).line([x1,y0,z0],[x1,y1,z0])
                   .line([x0,y0,z1],[x0,y1,z1]).line([x1,y0,z1],[x1,y1,z1])
                   .line([x0,y0,z0],[x0,y0,z1]).line([x1,y0,z0],[x1,y0,z1])
                   .line([x0,y1,z0],[x0,y1,z1]).line([x1,y1,z0],[x1,y1,z1]);
            
            // IF A THING IS BEING MODIFIED, SHOW ITS MODIFY POINT AND ITS MODIFY TYPE.

            if (thing.modifying) {
               let p = thing.modifying.p, r = .015;
               draw.color('#ffffff').lineWidth(.001);
               box(p[0]-r, p[1]-r, p[2]-r,  p[0]+r, p[1]+r, p[2]+r);
               draw.textHeight(.02).text(thing.modifying.type, cg.add(p,[0,2*r,0]));
            }

            // IF A THING IS HIGHLIGHTED, SHOW ITS BOUNDING BOX.

            if (thing.hilit) {
               draw.color('#ffffff').lineWidth(.0007);
               box(thing.lo[0], thing.lo[1], thing.lo[2],
                   thing.hi[0], thing.hi[1], thing.hi[2]);
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
                  for (let who in thing.links[i].at)
                     if (thing.links[i].at[who])
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

      // DRAW ANY DIAGNOSTIC INFO.

      draw.textHeight(.03).text(info, [0,1.3,0]);
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
      let q = [];
      for (let j = 0 ; j < 3 ; j++)
         q[j] = thing.T[3] * p[j] + thing.T[j];
      return cg.mTransform(thing.m, q);
   }

   let transformInto = (thing, p) => {
      let q = cg.mTransform(cg.mInverse(thing.m), p);
      for (let j = 0 ; j < 3 ; j++)
         q[j] = (q[j] - thing.T[j]) / thing.T[3];
      return q;
   } 

   model.animate(() => {

      if (isNewClient) {
         isNewClient = false;
	 sceneID = nextSceneID;

         server.get('ct' + sceneID, arg => {
            things = arg;

            if (! things)
               things = [];

            // WHEN A NEW CLIENT JOINS, REGENERATE THE STROKES OF ITS STATIC THINGS.

            for (let n = 0 ; n < things.length ; n++) {
               let thing = things[n];
               if (thing.isStatic && (! thing.strokes || thing.strokes.length == 0)) {
                  thing.strokes = matchCurves.generateStrokes(thing.K, thing.T);
                  strokesCache[thing.id] = thing.strokes;
               }
            }

            // WHEN A NEW CLIENT JOINS, FETCH THE STROKES OF SKETCH OBJECTS FROM THE SERVER CACHE.

            server.get('cs' + sceneID, S => {
               if (S)
                  for (let id in S) {
                     let thing = findThingFromID(id);
                     if (thing && thing.type == 'sketch') {
                        thing.strokes = S[id];
                        strokesCache[id] = S[id];
                     }
                  }
            });
         });
      }

      // IN RESPONSE TO CLEAR COMMAND, CLEAR THE ENTIRE SCENE.

      if (isClearingScene) {
         isClearingScene = false;
         things = [];
         linkSrc = {};
         thingCode = {};
         clickOnBG = {};
         clickCount = {};
         modifyThing = {};
         strokesCache = {};
         thingAtCursor = {};
         thingBeingDrawn = {};
      }

      // THE MASTER CLIENT COMPUTES THE SHARED STATE OF THE SCENE FOR EACH ANIMATION FRAME.

      let updateMasterClient = () => {

         // SOMETIMES THE MASTER CLIENT WILL NEED TO UPDATE STROKES ON THE SERVER.

         let saveStrokes = () => {
            let S = {};
            for (let n = 0 ; n < things.length ; n++) {
               let thing = things[n];
               if (thing.type == 'sketch') {
                  let strokes = getStrokes(thing);
                  if (strokes && strokes.length > 0)
                     S[thing.id] = strokes;
               }
            }
            server.set('cs' + sceneID, S);
         }

         // START BY UNSELECTING ALL THINGS.

         if (things && waitForLoadCounter <= 0)
            for (let n = 0 ; n < things.length ; n++) {
               let thing = things[n];
               thing.hilit = 0;
               thing.isUpdatingStrokes = false;
               if (thing.type == 'sketch' && strokesCache[thing.id])
                  thing.strokes = strokesCache[thing.id];
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

               who = clients[I] + hand;
               if (clickCount[who] === undefined)
                  clickCount[who] = 0;

               // FIND THE 3D CURSOR, IF ANY.

               let thumb = clientState.finger(clients[I], hand, 0);
               if (thumb == null)
                  continue;
               let P = cg.mix(thumb, clientState.finger(clients[I], hand, 1), .5);

               // ACTIONS DEPEND ON THE CURRENT STATE OF THE HAND OR CONTROLLER:

               switch (clientState.pinchState(clients[I], hand, 1)) {

               // WHILE NOT PINCHING:

               case 'up':

                  // IF IN MODIFY MODE: DO MOVE, SCALE, SPIN OR LINK.

                  if (modifyThing[who]) {
                     let thing = modifyThing[who].thing;
                     thing.modifying.p = P;
                     thing.hilit = true;
                     let d = cg.subtract(P, prevP[who]);
                     switch (modifyThing[who].state) {
                     case 'move' : moveThing (thing, d); break;
                     case 'scale': scaleThing(thing, d); break;
                     case 'spin' : spinThing (thing, d); break;
                     case 'link' :
                        let target = findThingAtPoint(P);
                        if (target)
                           target.hilit = true;
                        break;
                     }
                  }

                  // OTHERWISE:
                  
                  else {

                     // KEEP TRACK OF THE THING AT THE CURSOR, IF ANY.

                     thingAtCursor[who] = findThingAtPoint(P);
                     if (thingAtCursor[who]) {
                        thingAtCursor[who].hilit = 1;
                        thingAtCursor[who].dragCount = 0;
                     }

                     // CHECK FOR A LINK AT THE CURSOR FOR THIS HAND OF THIS CLIENT.

                     for (let n = 0 ; n < things.length ; n++) {
                        let thing1 = things[n];
                        if (thing1.links)
                           for (let i = 0 ; i < thing1.links.length ; i++) {
                              let thing2 = findThingFromID(thing1.links[i].id);
                              let p = cg.mix(transformOutof(thing1, [0,0,0]),
                                             transformOutof(thing2, [0,0,0]), .5);
                              thing1.links[i].at[who] = cg.distance(p, P) < .04;
                           }
                     }
                  }

                  break;

               // WHEN STARTING A PINCH:

               case 'press':

                  // IF NOT AT A NON-SKETCH THING AND NOT IN MODIFY MODE: START DRAWING A NEW STROKE.

                  thingBeingDrawn[who] = null;
                  if (! clickOnBG[who] && ! modifyThing[who] && (! thingAtCursor[who] || thingAtCursor[who].type=='sketch')) {
                     thingBeingDrawn[who] = { id: cg.uniqueID(),
                                              type: 'sketch',
                                              m: cg.mIdentity(),
                                              strokes: [ [P] ],
                                              hilit: 0,
                                              isUpdatingStrokes: true,
                                              lo: [0,0,0],
                                              hi: [0,0,0],
                                              dragCount: 0 };
                     things.push(thingBeingDrawn[who]);
                     action('create', { id: thingBeingDrawn[who].id });
                  }

                  // START A PINCH AFTER A CLICK ON BG: COMPUTE COMPASS DIRECTION TO THE CLICK ON BG.

                  if (clickOnBG[who]) {
                     if (cg.distance(clickOnBG[who].p, P) < .04)
                        clickOnBG[who].dir = -1;
                     else {
                        let d = cg.subtract(clickOnBG[who].p, P);
                        let x = cg.dot(d, fm.slice(0,3));
                        clickOnBG[who].dir = (8 + 4 * Math.atan2(d[1], x) / Math.PI + 1/8 >> 0) % 8;
                     }
                  }

                  // START A PINCH ON A NON-SKETCH THING AFTER CLICK TO ITS LEFT ON THE BACKGROUND: START DRAWING A LINK.

                  linkSrc[who] = null;
                  if (clickOnBG[who] && clickOnBG[who].dir == 4 && thingAtCursor[who].type != 'sketch')
                     linkSrc[who] = thingAtCursor[who];

                  break;

               // WHILE PINCHING:

               case 'down':

                  // DRAG WHILE DRAWING A STROKE: CONTINUE TO DRAW THE STROKE.

                  if (thingBeingDrawn[who]) {
                     thingBeingDrawn[who].isUpdatingStrokes = true;
                     thingBeingDrawn[who].strokes[0].push(P);
		     action('draw', { id: thingBeingDrawn[who].id, p: P });
                     for (let n = 0 ; n < things.length ; n++)
                        if (isIntersect(thingBeingDrawn[who], things[n]))
                           things[n].hilit = 1;
                  }

                  // DRAG ON A NON-SKETCH THING: SEND THE DRAG EVENT TO THE THING.

                  else {
                     let thing = thingAtCursor[who];
                     if (thing) {
                        thing.dragCount++;
                        if (! modifyThing[who] && ! clickOnBG[who] && thingCode[thing.id] && thingCode[thing.id].onDrag) {
                           let p = transformInto(thing, P);
                           thingCode[thing.id].onDrag(p);
                           action('drag', { id: thing.id, p: cg.roundVec(4, p) });
                        }
                     }
                  } 

                  // WHILE DRAGGING OVER A THING: HILIGHT THE THING.

                  let thing = findThingAtPoint(P);
                  if (thing)
                     thing.hilit = true;

                  break;

               // WHEN RELEASING A PINCH:

               case 'release':

                  // IF CLICKED ON THE MIDDLE OF A LINK, REMOVE THE LINK.

                  let isLinkRemoved = false;
                  for (let n = 0 ; n < things.length ; n++) {
                     let thing1 = things[n];
                     if (thing1.links) {
                        for (let i = 0 ; i < thing1.links.length ; i++) {
                           if (thing1.links[i].at[who]) {
                              let thing2 = findThingFromID(thing1.links[i].id);
                              removeLink(thing1.links, thing2);
                              action('unlink', { a: thing1.id, b: thing2.id });
                              isLinkRemoved = true;
                              break;
                           }
                        }
                     }
                  }

                  // IF A LINK WAS JUST REMOVED, DELETE THE DRAWN STROKE AND DO NOTHING ELSE.

                  if (isLinkRemoved) {
                     deleteThing(thingBeingDrawn[who]);
                     thingBeingDrawn[who] = null;
                     break;
                  }

                  // IF THIS WAS A DRAG GESTURE: SET THE CLICK COUNT TO ZERO.

                  if (thingAtCursor[who] && thingAtCursor[who].dragCount >= np)
                     clickCount[who] = 0;

                  // IF THIS IS JUST AFTER BEING IN MODIFY MODE: END MODIFY MODE.

                  if (modifyThing[who]) {

                     action(modifyThing[who].state + 'E', { id: modifyThing[who].thing.id, p: P });

                     // FINISH CREATING A THREE-CLICKS LINK CREATION GESTURE.

                     if (modifyThing[who].state == 'link')
                        createLink(modifyThing[who].thing, findThingAtPoint(P));

                     delete modifyThing[who].thing.modifying;
                     modifyThing[who] = null;
                     break;
                  }

                  // FINISH CREATING A CLICK-THEN-DRAG LINK CREATION GESTURE.

                  if (linkSrc[who])
                     createLink(linkSrc[who], findThingAtPoint(P));

                  // IF WAS CLICKING ON A NON-SKETCH THING: SEND THE CLICK EVENT TO THE THING.

                  if (! clickOnBG[who] && thingAtCursor[who] && thingAtCursor[who].type != 'sketch' && thingAtCursor[who].dragCount < np) {
                     let thing = thingAtCursor[who];
                     if (thingCode[thing.id] && thingCode[thing.id].onClick) {
                        let p = transformInto(thing, P);
                        thingCode[thing.id].onClick(p);
                        action('click', { id: thing.id, p: cg.roundVec(4, p) });
                     }
                  }

                  // IF WAS CLICKING ON A THING AFTER CLICKING ON THE BACKGROUND: ENTER MODIFY MODE.

                  if (clickOnBG[who] && thingAtCursor[who] && thingAtCursor[who].dragCount < np) {
                     let thing = thingAtCursor[who];
                     let dir = clickOnBG[who].dir;
                     if (! (thing.type == 'sketch' && dir == 5)) {
                        switch (dir) {

                        // GESTURE TO DELETE A THING.

                        case 0:
                           deleteThing(thing);
                           action('delete', { id: thing.id });
                           thingAtCursor[who] = null;
                           saveStrokes();
                           break;

                        // GESTURES TO SCALE, MOVE, LINK OR SPIN A THING.

                        case 2: modifyThing[who] = { thing: thing, state: 'scale' } ; break;
                        case 4: modifyThing[who] = { thing: thing, state: 'move'  } ; break;
                        case 5: modifyThing[who] = { thing: thing, state: 'link'  } ; break;
                        case 6: modifyThing[who] = { thing: thing, state: 'spin'  } ; break;
                        }
                        if (modifyThing[who]) {
			   let type = modifyThing[who].state;
			   action(type + 'B', { id: thing.id, p: P });
                           thing.modifying = { type: type, p: P };
                        }
                     }
                  }

                  // CLICK BELOW A THING THEN DRAG DOWNWARD FROM THE THING TO TOGGLE HEADS-UP-DISPLAY MODE.

                  if (clickOnBG[who] && thingAtCursor[who] && thingAtCursor[who].dragCount >= np)
                     if (clickOnBG[who].dir == 6)
                        thingAtCursor[who].hud = ! thingAtCursor[who].hud;

                  // IF JUST FINISHED DRAWING A STROKE:

                  clickOnBG[who] = null;
                  if (thingBeingDrawn[who]) {
                     let td = thingBeingDrawn[who];
                     td.isUpdatingStrokes = true;

                     // IF THE STROKE IS VERY SMALL OR QUICK, CLASSIFY IT AS A CLICK STROKE.

                     let isClickStroke = Math.max(td.hi[0]-td.lo[0],td.hi[1]-td.lo[1],td.hi[2]-td.lo[2]) < .03
                                         || td.strokes[0].length < np;

                     // DETECT A CLICK STROKE ON THE BACKGROUND.

                     if (isClickStroke) {
                        clickOnBG[who] = { p: P };
                        for (let n = 0 ; n < things.length ; n++)
                           if (things[n] != td && isThingAtPoint(things[n], P)) {
                              clickOnBG[who] = null;
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

                           let st = matchCurves.recognize(ss);
                           let m = cg.mMultiply(sketch.m, fm);
                           deleteThing(sketch);

                           let glyph = matchCurves.glyph(st[2]);
                           let thing = {
                              type: glyph.name,
                              timer: 0,
                              m: m,
                              id: cg.uniqueID(),
                              A: st[0],
                              B: st[1],
                              K: st[2],
                              T: st[3],
                           };
                           action('convert', { a:sketch.id, b:thing.id, data:thing.K });
                           things.push(thing);
                        }

                        // ELSE APPEND THIS NEW STROKE TO THE EXISTING SKETCH.

                        else {
                           sketch.strokes.push(td.strokes[0]);
                           sketch.isUpdatingStrokes = true;
                           action('merge', { a:sketch.id, b:td.id });
                           deleteThing(td);
                        }

                        saveStrokes();
                     }

                     // IF THIS WAS A CLICK STROKE: DELETE IT.

                     if (td && isClickStroke)
                        deleteThing(td);

                     // OTHERWISE UPDATE STROKES ON THE SERVER

                     else
                        saveStrokes();

                     thingBeingDrawn[who] = null;
                  }
                  break;
               }
               prevP[who] = P;
            }
         }

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
            let id = thing.id;
            if (thing.type != 'sketch') {

               // MAKE SURE THE THING HAS ASSOCIATED CODE.

               if (! thingCode[id]) {
                  let glyph = matchCurves.glyph(thing.K);
                  try {
                     thingCode[id] = new glyph.code();
                     thing.isAnimated = true;
                  } catch (err) {
                     thingCode[id] = glyph.code;
                     thing.isStatic = true;
                  }
               }

               // MORPH A NON-SKETCH THING FROM HOW IT HAD APPEARED AS A SKETCH.

               if (thing.timer < 1 && thing.A) {
                  thing.timer += 1.8 * model.deltaTime;
                  thing.strokes = matchCurves.mix(thing.A, thing.B, cg.ease(thing.timer));
               }

               // UPDATE THE APPEARANCE OF A NON-SKETCH THING.

               else {
                  if (thingCode[id]) {
                     thing.timer += model.deltaTime;
                     thing.strokes = matchCurves.animate(() => thingCode[id].update(thing.timer-1),
                                                         cg.mIdentity(), thing.timer-1, thing.T);
                     thing.state = thingCode[id].state;
                  }
               }

               if (thing.strokes.length > 0)
                  strokesCache[id] = thing.strokes;

               // IF HUD, PREPARE TO TURN THE THING TOWARD EACH CLIENT WHEN DISPLAYING IT.

               if (thing.hud)
                  thing.fp = fm ? fm.slice(12,15) : [0,0,0];
            }
         }

         // COMPUTE A BOUNDING BOX AROUND EVERY THING.

         for (let n = 0 ; n < things.length ; n++) {
            let thing = things[n];
            let strokes = getStrokes(thing);
            if (! strokes) {
               thing.lo = [-.01,-.01,-.01 ];
               thing.hi = [ .01, .01, .01 ];
               continue;
            }

            let m = thing.m;
            let scale = cg.norm(m.slice(0,3));
            thing.lo = [ 1000, 1000, 1000 ];
            thing.hi = [-1000,-1000,-1000 ];
            for (let n = 0 ; n < strokes.length ; n++) {
               let stroke = strokes[n];

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
      }

      // ONLY THE MASTER CLIENT UPDATES THINGS. IT WILL SEND THE RESULT TO ALL OTHER CLIENTS.

      if (clientID == clients[0])
         updateMasterClient();

      // EACH CLIENT THEN FILLS IN MISSING STROKES USING LOCAL PROCEDURES AND CACHE.

      if (things)
         for (let n = 0 ; n < things.length ; n++) {
            let thing = things[n];
            let id = thing.id;

            // FOR NON-SKETCH THINGS, IF NOT THE MASTER CLIENT THEN REGENERATE THE STROKES.

            if (thing.type != 'sketch' && clientID != clients[0]) {
               if (! thingCode[id]) {
                  let glyph = matchCurves.glyph(thing.K);
                  try {
                     thingCode[id] = new glyph.code();
                  } catch (err) {
                     thingCode[id] = glyph.code;
                  }
               }
               if (thing.isAnimated || thing.isStatic) {
                  thing.isUpdatingStrokes = thing.timer < 1 || thing.isAnimated;

                  // MORPHING FROM A SKETCH TO THE THING

                  if (thing.B)
                     thing.strokes = matchCurves.mix(thing.A, thing.B, cg.ease(thing.timer));

                  // FULLY FORMED ANIMATED THING

                  else if (thing.isAnimated) {
                     if (thing.state)
                        thingCode[id].state = thing.state;
                     thing.strokes = matchCurves.animate(() => thingCode[id].update(thing.timer-1),
                                                         cg.mIdentity(), thing.timer-1, thing.T);
                  }

                  // FULLY FORMED STATIC THING

                  else
                     thing.strokes = strokesCache[id] ?? [];
               }
            }

            // IF STROKES HAVE CHANGED, CACHE THEM. OTHERWISE USE PREVIOUSLY CACHED STROKES.

            if (thing.isUpdatingStrokes)
               strokesCache[id] = thing.strokes;
            else
               thing.strokes = strokesCache[id] ?? [];
         }

      // ALL CLIENTS DRAW THE SCENE.

      g3.update();

      // EVERY ANIMATION FRAME, THE MASTER CLIENT SENDS THE SCENE STATE TO ALL OTHER CLIENTS.

      // BEFORE WRITING THE SCENE STATE, THE MASTER CLIENT FIRST REMOVES NON-NEW STROKES.
      // THE RECIPIENT CLIENTS WILL RESTORE THOSE STROKES FROM CACHE.

      if (clientID == clients[0]) {
         for (let n = 0 ; n < things.length ; n++) {
            let thing = things[n];

            // DON'T KEEP SENDING STROKES. UNLESS THEY CHANGE, OTHER CLIENTS WILL CACHE THEM.

            if (! thing.isUpdatingStrokes)
               thing.strokes = [];

            // AFTER MORPHING IS FINISHED, CLEAN UP.

            if (thing.B && thing.timer >= 1) {
               if (thing.isStatic) {
                  strokesCache[things.id] = thing.B;
                  thing.strokes = [];
               }
               delete thing.A;
               delete thing.B;
            }

            // BEFORE WRITING, ROUND FLOATING POINT NUMBERS TO REDUCE THEIR JSON CHARACTER COUNT.

            thing.m  = cg.roundVec(4, thing.m);
            thing.lo = cg.roundVec(4, thing.lo);
            thing.hi = cg.roundVec(4, thing.hi);
            if (thing.T)
               thing.T = cg.roundVec(4, thing.T);
            if (thing.timer)
               thing.timer = cg.roundFloat(3, thing.timer);
         }

         for (let i = 1 ; i < clients.length ; i++) {
            channel[clients[i]].send(things);
	    console.log('sending to', i, JSON.stringify(things).length);
         }

         server.set('ct' + sceneID, things);
      }
      else {
         channel[clients[0]].on = data => {
	    things = data;
	    console.log('receiving', JSON.stringify(things).length);
         }
      }
   });
}


