import * as cg from "../render/core/cg.js";
import { G3 } from "../util/g3.js";

let red_ball = new Image();
red_ball.src = 'media/textures/red_ball.png';

export const init = async model => {
   let g3 = new G3(model, draw => {
      let t = (.5 * model.time) % 1;
      draw.image(red_ball, [0, .2 + 3 * t * (1 - t), 0], 0,0, .4);
   });

   model.animate(() => {
      g3.update();
   });
}

