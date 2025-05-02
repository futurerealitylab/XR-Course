import * as cg from "../render/core/cg.js";
import { loadSound, playSoundAtPosition } from "../util/positional-audio.js";

// Changes from bouncing2.js: Replace g3 image of each ball by a 3D sphere.

let soundBuffer = [], loadSounds = [];
for (let i = 0 ; i < 6 ; i++)
   loadSounds.push(loadSound('../../media/sound/bounce/'+i+'.wav', buffer => soundBuffer[i] = buffer));
Promise.all(loadSounds);

let N = 100, p = [], hit = [], r = .2, R = Math.random, v = [];
let lo = [-2.8,r,-2.8], hi = [2.8,3-r,2.8];
for (let i = 0 ; i < N ; i++) {
   p.push([ lo[0] + (hi[0] - lo[0]) * R(),
            lo[1] + (hi[1] - lo[1]) * R(),
	    lo[2] + (hi[2] - lo[2]) * R() ]);
   v.push([.05 * (R()-.5), .05 * (R()-.5), .05 * (R()-.5)]);
   hit.push(0);
}

let unlit = [[1,.0,.0],[.8,.0,.4],[.8,.8,.0],[0.,.4,.8]];
let   lit = [[1,.5,.5],[1,.5,.75],[1.,1.,.5],[.6,.8,1.]];

export const init = async model => {
   let  playSound = i => playSoundAtPosition(soundBuffer[6*Math.random()>>0], p[i]);
   for (let i = 0 ; i < N ; i++)
      model.add('sphere');
   model.animate(() => {
      let pos;
      let bounce = i => {
	 v[i] = cg.add(v[i], cg.scale(cg.subtract(p[i],pos), .03/r));
	 hit[i] = 10;
	 playSound(i);
      }
      for (let hand in {left:0, right:0}) {   // BOUNCE OFF A HAND
         if (pos = clientState.finger(clientID,hand,1))
            for (let i = 0 ; i < N ; i++)
	       if (cg.distance(p[i],pos) < r)
	          bounce(i);
      }
      let head = clientState.head(clientID);  // BOUNCE OFF HEAD
      if (Array.isArray(head)) {
         pos = head.slice(12,15);
         for (let i = 0 ; i < N ; i++)
	    if (cg.distance(p[i],pos) < r+.15)
	       bounce(i);
      }
      for (let i = 0 ; i < N-1 ; i++)        // BOUNCE OFF ANOTHER BALL
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
            hit[i] = 10;
            hit[j] = 10;
	    if (Math.random() < 1/10)
	       playSound(i);
	 }
      for (let i = 0 ; i < N ; i++)         // BOUNCE OFF WALLS
         for (let j = 0 ; j < 3 ; j++) {
            if (p[i][j] < lo[j]) v[i][j] =  Math.abs(v[i][j]);
            if (p[i][j] > hi[j]) v[i][j] = -Math.abs(v[i][j]);
         }
      for (let i = 0 ; i < N ; i++) {       // MOVE EACH BALL BY ITS VELOCITY
         v[i][1] -= .004 * model.deltaTime;
         v[i] = cg.scale(v[i], .992);
         p[i] = cg.add(p[i], v[i]);
      }
      for (let i = 0 ; i < N ; i++)
         model.child(i).color(hit[i]-- > 0 ? lit[i&3] : unlit[i&3]).identity().move(p[i]).scale(r);
   });
}
