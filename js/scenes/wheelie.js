import * as cg from '../render/core/cg.js';
import { Wheelie } from '../render/core/wheelie.js';

export const init = async model => {
   let wheelie = new Wheelie(model, [0,tableHeight,0]);
   let isRoam = true;
   let isLook = true;
   let ball = model.add('sphere').color('yellow').scale(0);
   let state = 0;
   model.animate(() => {
      model.identity().move(0,-1,0).scale(3);
      let t = model.time / 6;
      if (isRoam) {
         if (wheelie.isAtXZTarget()) {
            state++;
            wheelie.setXZTarget([ -.3 * Math.cos(Math.PI/2 * state),
                                  -.3 * Math.sin(Math.PI/2 * state) ]);
         }
      }
      if (isLook) {
         let p = [.4, tableHeight + .1 + .1 * Math.sin(30*t), .1 * Math.sin(2*Math.PI*t)];
         wheelie.setLookTarget(p);
	 ball.identity().move(p).scale(.02);
      }
      wheelie.update(model.time);
   });
}

