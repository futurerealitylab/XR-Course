import * as cg from "../render/core/cg.js";

export const init = async model => {
   const N = 1000, NK = 30, e = 0.05, f = 3, my = 1.7, ms = .6;
   let R = () => Math.random() - .5;
   let h = t => (1 + t) / e >> 0;
   let hash = v => h(v[0]) + ',' + h(v[1]) + ',' + h(v[2]);

   model.txtrSrc(1, 'media/textures/disk.jpg');
   let particles = model.add('particles').info(N).txtr(1).flag('uTransparentTexture');
   model.add('cube').move(0,my,0).scale(ms/2).color(0,0,0).opacity(.4);

   let H = {};
   let addToHash = (n, v) => {
      let hashIndex = hash(v);
      if (H[hashIndex] === undefined)
         H[hashIndex] = [];
      H[hashIndex].push({n:n, v:v.slice()});
   }

   let V = [], data = [];
   for (let n = 0 ; n < N ; n++) {
      V[n] = [ R(), R(), R() ];
      data.push({ p: [0,0,0], s: .02 });
   }

   let zones = [];
   for (let i = -1 ; i <= 1 ; i++)
   for (let j = -1 ; j <= 1 ; j++)
   for (let k = -1 ; k <= 1 ; k++)
      zones.push([ e * i, e * j, e * k ]);

   model.animate(() => {
      clay.disableCull();
      particles.identity().move(0,my,0).scale(ms);
      let isOutOfBounds = v => Math.max(v[0]*v[0], v[1]*v[1], v[2]*v[2]) > .25;

      H = [];
      for (let n = 0 ; n < N ; n++)
         addToHash(n, V[n]);

      for (let n = 0 ; n < N ; n++) {
         let v = V[n];
	 if (isOutOfBounds(v))
	    v = [ R(), R(), R() ];
	 let x = v[0], y = v[1], z = v[2];

	 let t0 = cg.noise(f * x    , f * y    , f * z    );
	 let dx = cg.noise(f * x + e, f * y    , f * z    ) - t0;
	 let dy = cg.noise(f * x    , f * y + e, f * z    ) - t0;
	 let dz = cg.noise(f * x    , f * y    , f * z + e) - t0;

	 v[0] -= .2 * t0 * dx / e;
	 v[1] -= .2 * t0 * dy / e;
	 v[2] -= .2 * t0 * dz / e;

	 let D = cg.normalize([dx,dy,dz]);

         if (Math.abs(t0) < .1)
            for (let j = 0 ; j < zones.length ; j++) {
	       let zone = zones[j];
	       let hashIndex = hash([v[0] + zone[0], v[1] + zone[1], v[2] + zone[2]]);
	       if (H[hashIndex])
	          for (let i = 0 ; i < H[hashIndex].length ; i++) {
	             let nv = H[hashIndex][i];
		     if (nv.n != n) {
			let p = cg.subtract(nv.v, v);
	                let P = cg.normalize(p);
		        if (Math.abs(cg.dot(D,P)) < .5) {
			   P = cg.scale(P, .000001 / cg.dot(p,p));
	                   v = cg.subtract(v, P);
	                   V[nv.n] = cg.add(V[nv.n], P);
	                }
		     }
	          }
	       }

	 V[n] = v;

	 data[n].p = v;
	 data[n].n = D
	 data[n].s = isOutOfBounds(v) || Math.abs(t0) > .02 ? .0001 : .045;
      }
      particles.setParticles(data);
   });
}

