import * as cg from "../render/core/cg.js";
import { lcb, rcb } from '../handle_scenes.js';
import { wordatlas } from "../util/wordatlas.js";

export const init = async model => {
   let N = wordatlas.length / 4;
   let L = {}, R = {};
   model.txtrSrc(1, 'media/textures/wordatlas.jpg');
   let particles = model.add('particles').info(N).txtr(1).move(0,1.5,0).scale(.6);
   let data = [], V = [];
   for (let n = 0 ; n < N ; n++) {
      let u  = wordatlas[4*n + 1] / 1844;
      let du = wordatlas[4*n + 2] / 1844;
      let v  = wordatlas[4*n + 3] / 1844;
      let dv =                 37 / 1844;
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
         data[n].c = n == L.index ? [1,.2,.2] : n == R.index ? [0,.5,1] : [1,1,1];
         for (let i = 0 ; i < 3 ; i++) {
            V[n][i] = Math.max(-.03, Math.min(.03, V[n][i] + .1 * (Math.random()-.5) * model.deltaTime));
            data[n].p[i] = Math.max(-.5, Math.min(.5, data[n].p[i] + V[n][i] * model.deltaTime));
	    if (Math.abs(data[n].p[i]) >= .5)
	       V[n][i] *= -1;
         }
      }
      particles.setParticles(data);
      let mesh = clay.formMesh('particles,' + particles.getInfo());
      if (mesh) {
         let matrix = particles.getGlobalMatrix();
         let invMatrix = cg.mInverse(matrix);

	 let makeRay = (ray, beam) => {
            let m = beam.beamMatrix();
	    ray.V = cg.mTransform(invMatrix, [ m[12], m[13], m[14] ]);
            ray.W = cg.normalize(cg.mTransform(invMatrix, [ -m[8],-m[9],-m[10],0 ]).slice(0,3));
	    ray.index = -1;
	    ray.tMin = 1000;
	 }
	 makeRay(L, lcb);
	 makeRay(R, rcb);

         let ltMin = 10000, rtMin = 10000;
	 for (let n = 0 ; n < mesh.length ; n += 3*16) {
	    let A = [ mesh[   n], mesh[   n+1], mesh[   n+2] ],
	        B = [ mesh[16+n], mesh[16+n+1], mesh[16+n+2] ],
	        C = [ mesh[32+n], mesh[32+n+1], mesh[32+n+2] ];
	    let testRay = ray => {
	       let t = cg.rayIntersectTriangle(ray.V, ray.W, A, B, C);
	       if (t > 0 && t < ray.tMin) {
	          ray.tMin = t;
	          ray.index = mesh.order[n / (3*16) >> 1];
	       }
	    }
	    testRay(L);
	    testRay(R);
	 }
      }
   });
}
