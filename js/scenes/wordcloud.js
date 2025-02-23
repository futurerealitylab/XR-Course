import * as cg from "../render/core/cg.js";
import { wordlist } from "../util/wordlist.js";

export const init = async model => {
   model.txtrSrc(1, 'media/textures/wordlist.jpg');
   let particles = model.add('particles').info(wordlist.length).txtr(1);
   let data = [], V = [];
   for (let n = 0 ; n < wordlist.length ; n++) {
      let u  = wordlist[4*n + 1] / 1844;
      let du = wordlist[4*n + 2] / 1844;
      let v  = wordlist[4*n + 3] / 1844;
      let dv =                37 / 1844;
      data.push({
         p: [ Math.random()-.5, Math.random()-.5, Math.random()-.5 ],
         s: [ du, dv ],
         t: [ u, v, u+du, v+dv ],
      });
      V[n] = [0,0,0];
      for (let i = 0 ; i < 3 ; i++)
         V[n][i] = .03 * (Math.random()-.5);
   }
   model.move(0,1.5,0).scale(.6).animate(() => {
      for (let n = 0 ; n < wordlist.length ; n++) {
         for (let i = 0 ; i < 3 ; i++) {
            V[n][i] = Math.max(-.03, Math.min(.03, V[n][i] + .1 * (Math.random()-.5) * model.deltaTime));
            data[n].p[i] = Math.max(-.5, Math.min(.5, data[n].p[i] + V[n][i] * model.deltaTime));
	    if (Math.abs(data[n].p[i]) >= .5)
	       V[n][i] *= -1;
         }
      }
      particles.setParticles(data);
   });
}
