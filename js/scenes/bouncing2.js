import * as cg from "../render/core/cg.js";
import { G3 } from "../util/g3.js";
import { loadSound, playSoundAtPosition } from "../util/positional-audio.js";

// Changes from bouncing1: You can hit a ball. When you do, it briefly lights up and a sound plays.

let red_ball = new Image(); red_ball.src = 'media/textures/red_ball.png';
let lit_ball = new Image(); lit_ball.src = 'media/textures/red_ball2.png';

let soundBuffer = [], loadSounds = [];
for (let i = 0 ; i < 6 ; i++)
   loadSounds.push(loadSound('../../media/sound/bounce/'+i+'.wav', buffer => soundBuffer[i] = buffer));
Promise.all(loadSounds);

let N = 100, p = [], lit = [], r = .2, R = Math.random, v = [];
let lo = [-2.8,r,-2.8], hi = [2.8,3-r,2.8];
for (let i = 0 ; i < N ; i++) {
   lit.push(0);
   p.push([ lo[0] + (hi[0] - lo[0]) * R(),
            lo[1] + (hi[1] - lo[1]) * R(),
	    lo[2] + (hi[2] - lo[2]) * R() ]);
   v.push([.05 * (R()-.5), .05 * (R()-.5), .05 * (R()-.5)]);
}

export const init = async model => {
   let g3 = new G3(model, draw => {
      for (let i = 0 ; i < N ; i++)
         draw.image(lit[i]-- > 0 ? lit_ball : red_ball, p[i],0,0,2*r);
      if (draw.view() == 0)
	 for (let j = 0 ; j < 2 ; j++) {
            let f = draw.finger(j==0 ? 'left' : 'right', 1);
            for (let i = 0 ; i < N ; i++)
	       if (lit[i] <= 0 && cg.distance(p[i],f) < r) {
	          v[i] = cg.add(v[i], cg.scale(cg.subtract(p[i],f),.03/r));
		  lit[i] = 50;
		  playSoundAtPosition(soundBuffer[6*Math.random()>>0], p[i]);
               }
         }
   });
   model.animate(() => {
      for (let i = 0 ; i < N-1 ; i++)
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
	 }
      for (let i = 0 ; i < N ; i++)
      for (let j = 0 ; j < 3 ; j++) {
         if (p[i][j] < lo[j]) v[i][j] =  Math.abs(v[i][j]);
         if (p[i][j] > hi[j]) v[i][j] = -Math.abs(v[i][j]);
      }
      for (let i = 0 ; i < N ; i++) {
         v[i][1] -= .004 * model.deltaTime;
         v[i] = cg.scale(v[i], .992);
         p[i] = cg.add(p[i], v[i]);
      }
      g3.update();
   });
}
