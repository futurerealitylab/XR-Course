import * as cg from "../render/core/cg.js";
import { G3 } from "../util/g3.js";

export const init = async model => {
   let fps = 60;

   let g3 = new G3(model, draw => {
       for (let i = -.45 ; i < .5 ; i += .2)
       for (let j = -.45 ; j < .5 ; j += .2)
       for (let k = -.45 ; k < .5 ; k += .2) {
          let x0 = .3*(i-.05), y0 = 1.5+.3*(j-.05), z0 = .3*(k-.05);
          let x1 = .3*(i+.05), y1 = 1.5+.3*(j+.05), z1 = .3*(k+.05);
          draw.color('#ffffff').lineWidth(.003)
              .line([x0,y0,z0],[x1,y0,z0]).line([x0,y1,z0],[x1,y1,z0])
              .line([x0,y0,z1],[x1,y0,z1]).line([x0,y1,z1],[x1,y1,z1])
              .line([x0,y0,z0],[x0,y1,z0]).line([x1,y0,z0],[x1,y1,z0])
              .line([x0,y0,z1],[x0,y1,z1]).line([x1,y0,z1],[x1,y1,z1])
              .line([x0,y0,z0],[x0,y0,z1]).line([x1,y0,z0],[x1,y0,z1])
              .line([x0,y1,z0],[x0,y1,z1]).line([x1,y1,z0],[x1,y1,z1]);
       }
       draw.text(fps >> 0, [0,1.6,0]);
   });

   model.animate(() => {
      fps = .9 * fps + .1 / model.deltaTime;
      g3.update();
   });
}

