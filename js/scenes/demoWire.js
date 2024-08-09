import * as cg from "../render/core/cg.js";

/*****************************************************************

   Demo of animated wire.

*****************************************************************/

export const init = async model => {
   let N = (t,a,b,c,d) => cg.noise(a * t, b * t, c * t + d * model.time);
   let f = t => [ N(t,3,3.3,3.6,.3), N(t,3.3,3.6,3,.25), N(t,3.6,3,3.3,.2) ];
   let wire = model.add(clay.wire(200,8)).move(0,1.6,0).scale(.5);
   model.animate(() => {
      clay.animateWire(wire, .025, f);
   });
}

