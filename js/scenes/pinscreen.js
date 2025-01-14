import * as cg from "../render/core/cg.js";
export const init = async model => {

   let N = 100;
   let pinscreen = model.add().move(0,1.5,0).turnX(.5).scale(1/N,5/N,1/N); 
   for (let i = 0 ; i < N ; i++)
   for (let j = 0 ; j < N ; j++)
      pinscreen.add('cube');

   model.animate(() => {
      let n = 0;
      for (let i = 0 ; i < N ; i++)
      for (let j = 0 ; j < N ; j++) {
         let h = 1 + cg.noise(6*i/N+.5-model.time,6*j/N+.5,model.time/3);
         pinscreen.child(n++).identity().move((i-N/2),1+h,(j-N/2)).scale(.5,h,.5);
      }
   });
}

