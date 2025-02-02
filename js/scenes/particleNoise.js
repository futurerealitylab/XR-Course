/*
   To do:
   	Make turning off culling an option controllable from the scene.
	Repel nearby particles, but only in the direction perpendicular to the normal.
*/

import * as cg from "../render/core/cg.js";

const N = 2000;

export const init = async model => {
   model.txtrSrc(1, 'media/textures/disk.jpg');
   let particles = model.add('particles').info(N).txtr(1).flag('uTransparentTexture').color(.5,.5,.5);
   let bounds = model.add('cube').move(0,1.2,0).scale(.15).color(0,0,0).opacity(.4);

   let R = () => Math.random() - .5;

   let V = [], data = [];
   for (let n = 0 ; n < N ; n++) {
      V[n] = [ R(), R(), R() ];
      data.push({ p: [0,0,0], s: .025 });
   }
   let f = 2, e = .03, count = 100;
   model.animate(() => {
      clay.disableCull();
      particles.identity().move(0,1.2,0).scale(.3);
      let isOutOfBounds = v => Math.max(Math.abs(v[0]), Math.abs(v[1]), Math.abs(v[2])) > .5;

      let c = 1;//Math.cos(model.time / 10);
      let s = 0;//Math.sin(model.time / 10);
      for (let n = 0 ; n < N ; n++) {
         let v = V[n];
	 if (isOutOfBounds(v))
	    v = [ R(), R(), R() ];
	 let x = v[0], y = v[1], z = v[2];

         y -= .03 * model.time;
	 let t0 = cg.noise(f * x, f * y, f * z);
	 let dx = cg.noise(f * x + e, f * y, f * z) - t0;
	 let dy = cg.noise(f * x, f * y + e, f * z) - t0;
	 let dz = cg.noise(f * x, f * y, f * z + e) - t0;

	 v[0] -= 3 * t0 * dx;
	 v[1] -= 3 * t0 * dy;
	 v[2] -= 3 * t0 * dz;

	 let D = cg.normalize([dx,dy,dz]);
         for (let k = 0 ; k < count ; k++) {
	    let i = N * Math.random() >> 0;
	    if (i != n) {
	       let px = V[i][0] - v[0], py = V[i][1] - v[1], pz = V[i][2] - v[2];
	       let pp = px * px + py * py + pz * pz;
	       if (pp < .05 * .05) {
	          let P = cg.normalize([px,py,pz]);
	          let dp = cg.dot(D,P);
		  if (Math.abs(dp) < .1) {
	             v[0] -= .000003 * P[0] / pp;
	             v[1] -= .000003 * P[1] / pp;
	             v[2] -= .000003 * P[2] / pp;
	          }
	       }
	    }
	 }

	 V[n] = v;

         let rotate = p => [ c * p[0] + s * p[2], p[1], -s * p[0] + c * p[2] ];
	 data[n].p = rotate(v);
	 data[n].n = rotate(D)
	 data[n].s = isOutOfBounds(v) || Math.abs(t0) > .1 ? .0001 : .025;
      }
      particles.setParticles(data);
      //count -= 0.3;
   });
}

