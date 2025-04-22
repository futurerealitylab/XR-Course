import * as cg from "../render/core/cg.js";
import { loadSound, playSoundAtPosition } from "../util/positional-audio.js";

// Changes from bouncing3.js: Make it multi-player, with shared state. Add lots of comments.

let soundBuffer = [], loadSounds = [];                            // LOAD ALL THE BOUNCE SOUNDS.
for (let i = 0 ; i < 6 ; i++)
   loadSounds.push(loadSound('../../media/sound/bounce/'+i+'.wav', buffer => soundBuffer[i]=buffer));
Promise.all(loadSounds);

let N = 100, p = [], hit = [], r = .2, R = Math.random, v = [];
let lo = [-2.8,r,-2.8], hi = [2.8,3-r,2.8];                       // FLOOR, CEILING AND WALLS BOUNDS
for (let i = 0 ; i < N ; i++) {
   p.push([ lo[0] + (hi[0] - lo[0]) * R(),                        // INITIALIZE ALL THE BALLS
            lo[1] + (hi[1] - lo[1]) * R(),                        // TO BE AT RANDOM POSITIONS
	    lo[2] + (hi[2] - lo[2]) * R() ]);                     // WITHIN THE 3D ROOM VOLUME.
   v.push([.05 * (R()-.5), .05 * (R()-.5), .05 * (R()-.5)]);
   hit.push(0);
}

server.init('bouncingS', { packed: '' });                         // INIT THE SHARED STATE OBJECT.

let unlit = [[1,.0,.0], [.8,.8,.0], [0.,.4,.8], [.8,.0,.4]];      // RED, YELLOW, BLUE, VIOLET
let   lit = [[1,.5,.5], [1.,1.,.5], [.6,.8,1.], [1,.5,.75]];      // LIT UP VERSION OF EACH COLOR

export const init = async model => {
   for (let i = 0 ; i < N ; i++)                                  // CREATE THE RENDERABLE BALLS.
      model.add('sphere');
   model.animate(() => {                                          // AT EACH ANIMATION FRAME:

      bouncingS = server.synchronize('bouncingS');                   // FETCH SHARED STATE DATA.

      if (clientID == clients[0]) {                                  // THE FIRST CLIENT DOES ALL
         let pos;                                                    // OF THE SIMULATION WORK.
         let bounce = i => {
	    v[i] = cg.add(v[i], cg.scale(cg.subtract(p[i],pos), .03/r));
	    hit[i] = 1;
         }
         for (let n = 0 ; n < clients.length ; n++) {
            let id = clients[n];
            for (let hand in {left:0, right:0}) {                    // BOUNCE OFF A CLIENT'S HAND.
               if (pos = clientState.finger(id,hand,1))
                  for (let i = 0 ; i < N ; i++)
	             if (cg.distance(p[i],pos) < r)
	                bounce(i);
            }
            let head = clientState.head(id);                         // BOUNCE OFF A CLIENT'S HEAD.
            if (Array.isArray(head)) {
               pos = head.slice(12,15);
               for (let i = 0 ; i < N ; i++)
	          if (cg.distance(p[i],pos) < r+.15)
	             bounce(i);
            }
         }
         for (let i = 0 ; i < N-1 ; i++)                             // BOUNCE OFF ANOTHER BALL.
         for (let j = i+1 ; j < N ; j++)
	    if (cg.distance(p[i],p[j]) < 2 * r) {
	       let a = cg.mix(v[i],v[j],.5);
               let d = cg.normalize(cg.subtract(p[j], p[i]));
	       v[i] = cg.add(v[i], cg.scale(d, -2 * cg.dot(v[i], d)));
	       v[j] = cg.add(v[j], cg.scale(d, -2 * cg.dot(v[j], d)));
	       let b = cg.mix(v[i],v[j],.5);
	       let c = cg.scale(cg.subtract(a,b),.5);
	       v[i] = cg.add(v[i], cg.add(c, cg.scale(d,-.01)));
	       v[j] = cg.add(v[j], cg.add(c, cg.scale(d, .01)));
               hit[i] = .9;
               hit[j] = .9 + (Math.random() > .9 ? .1 : 0);
	    }
         for (let i = 0 ; i < N ; i++)                               // BOUNCE OFF THE ROOM SURFACES.
            for (let j = 0 ; j < 3 ; j++) {
               if (p[i][j] < lo[j]) v[i][j] =  Math.abs(v[i][j]);
               if (p[i][j] > hi[j]) v[i][j] = -Math.abs(v[i][j]);
            }
         for (let i = 0 ; i < N ; i++) {                             // MOVE EACH BALL BY ITS VELOCITY.
            v[i][1] -= .004 * model.deltaTime;
            v[i] = cg.scale(v[i], .992);
            p[i] = cg.add(p[i], v[i]);
         }

         let ph = [];                                                // THE FIRST CLIENT CREATES AN
         for (let i = 0 ; i < N ; i++)                               // ARRAY OF SHARED STATE DATA.
            ph.push(p[i][0],p[i][1],p[i][2],hit[i]);

         let s = '';                                                 // IT THEN CONVERTS THAT ARRAY
	 for (let i = 0 ; i < ph.length ; i++)                       // INTO A COMPACT STRING.
	    s += (1000*ph[i]>>0) + (i < ph.length-1 ? ',' : '');
         bouncingS.packed = s;

         server.broadcastGlobal('bouncingS');                        // THEN IT BROADCASTS THE STRING.
      }
      else if (bouncingS.packed.length > 0) {

         let S = bouncingS.packed.split(',');                        // EACH RECEIVING CLIENT THEN
	 let ph = [];                                                // TURNS THE STRING BACK INTO AN
	 for (let i = 0 ; i < S.length ; i++)                        // ARRAY OF FLOATS, AND THEN
	    ph[i] = parseInt(S[i]) / 1000;

         for (let i = 0 ; i < N ; i++) {                             // IT PUTS THE DATA BACK INTO
	    p[i] = [ph[4*i],ph[4*i+1],ph[4*i+2]];                    // THE VARIOUS ARRAYS WHERE THEY
	    hit[i] = ph[4*i+3];                                      // BELONG.
	 }
      }

      if (clientID == clients[0] || bouncingS.packed.length > 0)     // SET THE COLORS AND POSITIONS
         for (let i = 0 ; i < N ; i++) {                             // OF ALL THE BALLS, AND PLAY
            if (hit[i] > .95)                                        // ANY SOUNDS, BEFORE RENDERING
               playSoundAtPosition(soundBuffer[6*R() >> 0], p[i]);   // THIS FRAME.
            hit[i] = Math.max(0, hit[i] - .1);
            model.child(i).color(hit[i] > 0 ? lit[i&3] : unlit[i&3]).identity().move(p[i]).scale(r);
         }
   });
}
