import * as cg from "../render/core/cg.js";
import { controllerMatrix, buttonState, joyStickState } from "../render/core/controllerInput.js";
import { lcb, rcb } from '../handle_scenes.js';

/*****************************************************************

   This demo shows how you can use your controller beams
   to intersect and manipulate an object.

   If your left controller beam intersects the ball, then
   while you are depressing the left controller's trigger,
   the ball will move along with your controller.

*****************************************************************/

let center = [0,1.5,0];
let radius = 0.1;

export const init = async model => {

   // CREATE THE BALL.

   let ball = model.add('sphere');

   model.animate(() => {

      // SEE WHETHER LEFT CONTROLLER BEAM HITS THE BALL

      let point = lcb.projectOntoBeam(center);
      let diff = cg.subtract(point, center);
      let hit = cg.norm(diff) < radius;
      let lt = buttonState.left[0].pressed;

      // IF SO, MOVE THE BALL WHILE THE TRIGGER IS DOWN

      if (hit && lt)
	 center = point;

      // DISPLAY THE BALL

      ball.color(hit ? lt ? [1,0,0] : [1,.5,.5] : [1,1,1]);
      ball.identity().move(center).scale(radius);
   });
}

