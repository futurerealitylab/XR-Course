/*
   To do:
   	Make turning off culling an option controllable from the scene.
	Repel nearby particles, but only in the direction perpendicular to the normal.
*/

import * as cg from "../render/core/cg.js";

const N = 3000;

export const init = async model => {
   model.txtrSrc(1, 'media/textures/disk.jpg');
   let particles = model.add('particles').info(N).txtr(1).flag('uTransparentTexture');

   let R = () => Math.random() - .5;

   let V = [], data = [];
   for (let n = 0 ; n < N ; n++) {
      V[n] = [ R(), R(), R() ];
      data.push({ p: [0,0,0], s: .025 });
   }
   let f = 4, e = .03;
   model.animate(() => {
      particles.identity().move(0,1.5,0).scale(1);

      let c = Math.cos(model.time / 10);
      let s = Math.sin(model.time / 10);
      for (let n = 0 ; n < N ; n++) {
         let v = V[n];
	 if (cg.dot(v,v) > .25)
	    v = [ R(), R(), R() ];
	 let x = v[0], y = v[1], z = v[2];

	 let t0 = cg.noise(f * x, f * y, f * z);
	 let dx = cg.noise(f * x + e, f * y, f * z) - t0;
	 let dy = cg.noise(f * x, f * y + e, f * z) - t0;
	 let dz = cg.noise(f * x, f * y, f * z + e) - t0;

	 v[0] -= t0 * dx;
	 v[1] -= t0 * dy;
	 v[2] -= t0 * dz;

	 let D = cg.normalize([dx,dy,dz]);
         for (let k = 0 ; k < 100 ; k++) {
	    let i = N * Math.random() >> 0;
	    if (i != n) {
	       let px = V[i][0] - v[0], py = V[i][1] - v[1], pz = V[i][2] - v[2];
	       let pp = px * px + py * py + pz * pz;
	       if (pp < .1 * .1) {
	          let P = cg.normalize([px,py,pz]);
	          let dp = cg.dot(D,P);
		  if (Math.abs(dp) < .1) {
	             v[0] -= .000001 * P[0] / pp;
	             v[1] -= .000001 * P[1] / pp;
	             v[2] -= .000001 * P[2] / pp;
	          }
	       }
	    }
	 }

	 V[n] = v;

         let rotate = p => [ c * p[0] + s * p[2], p[1], -s * p[0] + c * p[2] ];
	 data[n].p = rotate(v);
	 data[n].n = rotate(D)
	 data[n].s = cg.dot(v,v) > .25 || Math.abs(t0) > .1 ? .0001 : .025;
      }
      particles.setParticles(data);
   });
}

