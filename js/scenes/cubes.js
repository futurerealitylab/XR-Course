import * as cg from "../render/core/cg.js";
import { G3 } from "../util/g3.js";

export const init = async model => {
   let fps = 60;

   let edges = [ [0,1],[2,3],[4,5],[6,7], [0,2],[1,3],[4,6],[5,7], [0,4],[1,5],[2,6],[3,7] ];

   let g3 = new G3(model, draw => {
       draw.color('#ffffff').lineWidth(.003);
       for (let i = -.95 ; i < .99 ; i += .1)
       for (let j = -.95 ; j < .99 ; j += .1)
       for (let k = -.95 ; k < .99 ; k += .1) {
          let x0 = .3*(i-.05), y0 = 1.5+.3*(j-.05), z0 = .3*(k-.05);
          let x1 = .3*(i+.05), y1 = 1.5+.3*(j+.05), z1 = .3*(k+.05);
	  draw.drawPoly([ [x0,y0,z0],[x1,y0,z0],
	                  [x0,y1,z0],[x1,y1,z0],
	                  [x0,y0,z1],[x1,y0,z1],
	                  [x0,y1,z1],[x1,y1,z1] ], edges);
       }
       draw.color('#ff0000').text(fps >> 0, [0,1.6,.3]);
   });

   model.animate(() => {
      fps = .9 * fps + .1 / model.deltaTime;
      g3.update();
   });
}

