import * as cg from "../render/core/cg.js";
import { RayTraceCubes } from "../render/core/rayTraceCubes.js";

// RAY TRACE TO RANDOMLY PLACED CUBES

let isTextured = false;

export const init = async model => {
   let N = isTextured ? 20 : 30;
   let R = Math.random;

   let m = [], c = [];
   for (let n = 0 ; n < N ; n++) {
      model.add();
      c.push([R(),R(),R()]);
      m.push([]);
   }

   let rayTraceCubes = new RayTraceCubes(model, m, c, isTextured);
   model.animate(() => {
      for (let n = 0 ; n < N ; n++) {
         let t = .1 * model.time;
         let mx = 6  * cg.noise(1.5, t, n);
         let my = 3  * cg.noise(2.5, t, n) + 2;
         let mz = 6  * cg.noise(3.5, t, n);
         let rx = 6  * cg.noise(4.5, t, n);
         let ry = 6  * cg.noise(5.5, t, n);
         let rz = 6  * cg.noise(6.5, t, n);
         let sx = .2 * cg.noise(7.5, 0, n) + .1;
         let sy = .2 * cg.noise(8.5, 0, n) + .1;
         let sz = .2 * cg.noise(9.5, 0, n) + .1;
         model.child(n).identity().move(mx,my,mz).turnX(rx).turnY(ry).turnZ(rz).scale(sx,sy,sz);
         m[n] = model.child(n).getMatrix();
      }
      rayTraceCubes.update();
   });
}
