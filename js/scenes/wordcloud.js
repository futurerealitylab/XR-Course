import * as cg from "../render/core/cg.js";
import { lcb, rcb } from '../handle_scenes.js';
import { wordlist } from "../util/wordlist.js";

export const init = async model => {
   let N = wordlist.length / 4;
   let lIndex = -1, rIndex = -1;
   model.txtrSrc(1, 'media/textures/wordlist.jpg');
   let particles = model.add('particles').info(N).txtr(1).move(0,1.5,0).scale(.6);
   let data = [], V = [];
   for (let n = 0 ; n < N ; n++) {
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
   model.animate(() => {
      for (let n = 0 ; n < N ; n++) {
         data[n].c = n == lIndex ? [1,0,0] : n == rIndex ? [0,.5,1] : [1,1,1];
         for (let i = 0 ; i < 3 ; i++) {
            V[n][i] = Math.max(-.03, Math.min(.03, V[n][i] + .1 * (Math.random()-.5) * model.deltaTime));
            data[n].p[i] = Math.max(-.5, Math.min(.5, data[n].p[i] + V[n][i] * model.deltaTime));
	    if (Math.abs(data[n].p[i]) >= .5)
	       V[n][i] *= -1;
         }
      }
      particles.setParticles(data);
      let mesh = clay.formMesh('particles,' + particles.getInfo());
      lIndex = rIndex = -1;
      if (mesh) {
         let matrix = particles.getGlobalMatrix();

         let lm = lcb.beamMatrix();
         let lV = [ lm[12], lm[13], lm[14] ];
         let lW = [-lm[ 8],-lm[ 9],-lm[10] ];

         let rm = rcb.beamMatrix();
         let rV = [ rm[12], rm[13], rm[14] ];
         let rW = [-rm[ 8],-rm[ 9],-rm[10] ];

         let ltMin = 10000, rtMin = 10000;
	 for (let n = 0 ; n < mesh.length ; n += 3*16) {
	    let A = cg.mTransform(matrix, [ mesh[   n], mesh[   n+1], mesh[   n+2] ]);
	    let B = cg.mTransform(matrix, [ mesh[16+n], mesh[16+n+1], mesh[16+n+2] ]);
	    let C = cg.mTransform(matrix, [ mesh[32+n], mesh[32+n+1], mesh[32+n+2] ]);

	    let lt = cg.rayIntersectTriangle(lV, lW, A, B, C);
	    if (lt > 0 && lt < ltMin) {
	       ltMin = lt;
	       lIndex = mesh.order[n / (3*16) >> 1];
	    }

	    let rt = cg.rayIntersectTriangle(rV, rW, A, B, C);
	    if (rt > 0 && rt < rtMin) {
	       rtMin = rt;
	       rIndex = mesh.order[n / (3*16) >> 1];
	    }
	 }
      }
   });
}
