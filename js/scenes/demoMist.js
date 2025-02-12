import * as cg from "../render/core/cg.js";

export const init = async model => {
   let bg = model.add('cube').move(0,0,-.1).scale(1,1,.001);
   let mist = model.add();
   let N = 4;
   model.txtrSrc(1, '../media/textures/smoke_0.png');
   for (let n = 0 ; n < N ; n++)
      mist.add('cube').txtr(1);
      model.animate(() => {
         model.hud(true).move(0,-.1,1).scale(1.7);
         for (let n = 0 ; n < N ; n++)
            mist.child(n).identity().move(
	           .1*Math.sin(3*n/N+model.time),
	           .1*Math.cos(3*n/N+model.time),
	           .01*n/N)
	           .scale(1,1,.005);
   });
}

