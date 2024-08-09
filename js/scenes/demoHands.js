import * as cg from "../render/core/cg.js";
import { videoHandTracker } from "../render/core/videoHandTracker.js";

/**********************************************************************

   This is how you create a model of a hand to tie into the built-in
   desktop hand tracking. When you are wearing your VR headset, this
   code turns off, since for the VR headset we've already built in a
   visible hand tracking model.

**********************************************************************/

export const init = async model => {
   let model_hands = model.add().color(1,.5,.5);

   if (! window.vr)
      for (let h = 0 ; h < 2 ; h++)
         for (let f = 0 ; f < 5 ; f++)
            for (let j = 0 ; j < 5 ; j++)
               model_hands.add('tubeZ');

   model.animate(() => {
      if (! window.vr)
         for (let h = 0 ; h < 2 ; h++)
            for (let f = 0 ; f < 5 ; f++)
               for (let j = 0 ; j < 5 ; j++)
                  model_hands.child(h * 25 + f * 5 + j).setMatrix(
                     videoHandTracker.getJointMatrix(h==0?'left':'right', f, j));
   });

}

