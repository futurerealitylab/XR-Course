import * as cg from "../render/core/cg.js";
import { loadSound, playLoopingSoundAtPosition, 
         stopLoopingSound, updateSoundPosition } from "../util/positional-audio.js";


 // Audio Stuff

let morphSoundBuffer = null;

function preloadSounds() {
    Promise.all([
        loadSound('../../media/sound/SFXs/demoRhombi/SFX_Morph_Hologram_Mono_LP_01.wav', buffer => morphSoundBuffer = buffer)
    ])
    .then(() => {
        //console.log('All sounds loaded successfully');
    })
    .catch(error => {
        //console.error('An error occurred while loading sounds:', error);
    });
}

// load SFXs
preloadSounds();        

let dodeca = () => {
   let c = [], e = [], p = 2 / (1 + Math.sqrt(5));
   for (let i = -1 ; i <= 1 ; i += 2)
   for (let j = -1 ; j <= 1 ; j += 2) {
      let b = i*p, a = j+j*p;
      c.push([a,b,0],[b,0,a],[0,a,b],[i,j,-1],[i,j,1]);
   }
   return c;
}

let icosa = () => {
   let c = [], e = [], p = (1 + Math.sqrt(5)) / 2;
   for (let i = -1 ; i <= 1 ; i += 2)
   for (let j = -p ; j <= p ; j += 2*p)
      c.push([0,i,j],[i,j,0],[j,0,i]);
   for (let n = 0 ; n < c.length ; n++)
      c[n] = cg.scale(c[n], .9106);
   return c;
}

let rhombi = t => {
   let c = [];
   let D = dodeca();
   let I = icosa();
   for (let d = 0 ; d < D.length ; d++) {
      let a = D[d];
      for (let i = 0 ; i < I.length ; i++) {
         let b = I[i];
	 if (cg.distance(a,b) < 1.2)
	    c.push(cg.mix(a,b,t));
      }
   }
   return c;
}

let C  = rhombi(0.39);
let C0 = rhombi(0);
let C1 = rhombi(1);

let E = [];
for (let i = 1 ; i < C.length ; i++)
for (let j = 0 ; j < i ; j++)
   if (cg.distance(C[i],C[j]) < 1)
      E.push([i,j]);

let createEdge = (shape,a,b,r) => shape.add('tubeZ')
                                       .move(cg.mix(a,b,.5))
                                       .aimZ(cg.subtract(b,a))
                                       .scale(r,r,.5*cg.distance(a,b));

export const init = async model => {

   // play sound at given position
   playLoopingSoundAtPosition(morphSoundBuffer, [0, 1.6, 0]);

   model.animate(() => {
      let t = cg.ease(.5 + .7 * Math.sin(2 * Math.PI * model.time / 5));
      let u = 4 * t * (1 - t);
      model.remove(0);
      let R = model.add().move(0,1.6,0).color('bronze').scale(.1);

      //audio position updates
      let emptyObj = model.add().move(0,1.6,0);
      let objPos = emptyObj.getGlobalMatrix();
      updateSoundPosition([objPos[12], objPos[13], objPos[14]]);
      model.remove(emptyObj);

      let r = .035 - .015 * Math.sqrt(u);
      let c = [];
      for (let i = 0 ; i < C.length ; i++)
         c.push(cg.mix(C0[i], C1[i], t));
      for (let i = 0 ; i < c.length ; i++)
         R.add('sphere').move(c[i]).scale(2*r);
      for (let i = 0 ; i < E.length ; i++)
         createEdge(R, c[E[i][0]], c[E[i][1]], r);
   });
}

