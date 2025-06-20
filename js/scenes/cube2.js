import * as cg from "../render/core/cg.js";
import { G3 } from "../util/g3.js";

// Transparent rotating 3D cube rendered using only the g3 library.

let P = [];
for (let z = -.5 ; z <= .5 ; z++)
for (let y = -.5 ; y <= .5 ; y++)
for (let x = -.5 ; x <= .5 ; x++)
   P.push([x,y,z]);

export const init = async model => {
   let p = i => {
      let c = Math.cos(model.time);
      let s = Math.sin(model.time);
      let x = P[i][0], y = P[i][1], z = P[i][2];
      return [ c * x + s * z, y + 1.5, -s * x + c * z - 3 ];
   }
   let g3 = new G3(model, draw => {
      draw.color('#ffffffa0');
      draw.fill([p(0),p(1),p(3),p(2)]);
      draw.fill([p(4),p(5),p(7),p(6)]);
      draw.fill([p(0),p(4),p(6),p(2)]);
      draw.fill([p(1),p(5),p(7),p(3)]);
      draw.fill([p(0),p(2),p(6),p(4)]);
      draw.fill([p(1),p(3),p(7),p(5)]);
   });

   model.animate(() => {
      g3.update();
   });
}

