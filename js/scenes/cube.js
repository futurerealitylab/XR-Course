import * as cg from "../render/core/cg.js";
import { G3 } from "../util/g3.js";

export const init = async model => {
   let g3 = new G3(model, draw => {
      draw.color('white').lineWidth(.005);
      for (let y = .5 ; y < 1.501 ; y++) {
         draw.line([-.5,y,-.5],[ .5,y,-.5]);
         draw.line([ .5,y,-.5],[ .5,y, .5]);
         draw.line([ .5,y, .5],[-.5,y, .5]);
         draw.line([-.5,y, .5],[-.5,y,-.5]);
      }
      draw.line([-.5,.5,-.5],[-.5,1.5,-.5]);
      draw.line([ .5,.5,-.5],[ .5,1.5,-.5]);
      draw.line([-.5,.5, .5],[-.5,1.5, .5]);
      draw.line([ .5,.5, .5],[ .5,1.5, .5]);
   });
   model.add('cube').color(0,.5,1).opacity(.6).move(0,1,0).scale(.5);

   model.animate(() => {
      g3.update();
   });
}

