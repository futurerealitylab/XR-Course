import * as cg from "../render/core/cg.js";

/******************************************************************

   This demo shows how to render a set of particles.
   For efficiency, the modeler renders all of the particles
   as a single mesh, which requires only one draw call.

******************************************************************/

export const init = async model => {
   let N = 10000;
   let particles = model.add('particles').info(N).texture('media/textures/disk.jpg').flag('uTransparentTexture')

   let data = [], V = [];
   for (let n = 0 ; n < N ; n++) {

      //  p: position of the particle
      //  n: surface normal of the particle (defaults to facing the camera)
      //  s: size of the particle (defaults to 0.01)
      //  c: color of the particle (defaults to white)
      //  t: texture range [ uLo,vLo,uHi-uLo,vHi-vLo ] (defaults to [0,0,1,1])

      data.push({
         p: [ Math.random() - .5, Math.random() - .5, Math.random() - .5 ],
         s: .008 + .008 * Math.random(),
         c: [Math.random(), Math.random(), Math.random()],
      });
      V[n] = [0,0,0];
   }
   model.move(0,1.5,0).scale(.6).animate(() => {
      for (let n = 0 ; n < N ; n++) {
         for (let i = 0 ; i < 3 ; i++) {
            V[n][i]      = Math.max(-.05, Math.min(.05, V[n][i] + (Math.random() - .5) * model.deltaTime));
            data[n].p[i] = Math.max(-.5 , Math.min(.5 , data[n].p[i] + V[n][i] * model.deltaTime));
         }
	 data[n].p = cg.scale(cg.normalize(data[n].p), .5);
      }
      particles.setParticles(data /*, 'yaw' */);
   });
}

