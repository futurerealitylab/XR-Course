import * as cg from "../render/core/cg.js";
export const init = async model => {
   let nn = 21;
   let N = nn*nn*nn;
   model.txtrSrc(1, 'media/textures/disk.jpg');
   let particles = model.add('particles').info(N).txtr(1);
   model.animate(() => {
      let data = [];
      for (let i = 0 ; i < nn ; i++)
      for (let j = 0 ; j < nn ; j++)
      for (let k = 0 ; k < nn ; k++) {
         let x = 2*i/nn-1, y = 2*j/nn-1, z = 2*k/nn-1;
	 let t = .5 * model.time;
	 let f  = cg.noise(x+t+.1,y,z);
	 let fx = cg.noise(x+t+.1+1/nn,y,z);
	 let fy = cg.noise(x+t+.1,y+1/nn,z);
	 let fz = cg.noise(x+t+.1,y,z+1/nn);
	 let d  = nn*((f-fx)+(f-fy)+(f-fz))/4;
	 let e = .02 + d*d;
         let r = d>0 ? e : e/6,
	     g = d>0 ? e : e/7,
	     b = d>0 ? e : e/8;
         data.push({p : [.12*x,1.5+.12*y,.12*z], c: [r,g,b], s: f>0?.22/nn:.0001});
      }
      particles.setParticles(data);
   });
}

