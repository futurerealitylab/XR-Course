import * as cg from "../render/core/cg.js";
import { RayTraceSpheres } from "../render/core/rayTraceSpheres.js";

// RAY TRACE TO A ROOMFUL OF RANDOM COLORFUL SPHERES.

let N = 20, S = [], R = Math.random;
for (let n = 0 ; n < N ; n++)
   S.push([ 0, 0, 0, .2, R(), R(), R() ]);

export const init = async model => {
   let rayTraceSpheres = new RayTraceSpheres(model, S);
   model.animate(() => {
      let t = .1 * model.time;
      for (let n = 0 ; n < N ; n++) {
         S[n][0] = 6 * cg.noise(1, t, n + .5);
         S[n][1] = 3 * cg.noise(2, t, n + .5) + 2;
         S[n][2] = 6 * cg.noise(3, t, n + .5);
      }
      rayTraceSpheres.update();
   });
}

