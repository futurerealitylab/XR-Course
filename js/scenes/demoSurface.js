import * as cg from "../render/core/cg.js";
import { Diagram } from "../render/core/diagram.js";

export const init = async model => {
   let diagram = new Diagram(model, [0,1.6,0], .5, draw => {
      draw.outlineCanvas(false);
      let path, n = 30;
      draw.save();
      let f = (u,v) => .3 * cg.noise(4*u,4*v,model.time);
      for (let i = 0 ; i <= n ; i++) {

         path = [];
         for (let j = 0 ; j <= n ; j++)
            path.push([i/n-.5,f(i/n,j/n),j/n+.5]);
         draw.line({ color: 'white', path: path, lineWidth: .0008 });

         path = [];
         for (let j = 0 ; j <= n ; j++)
            path.push([j/n-.5,f(j/n,i/n),i/n+.5]);
         draw.line({ color: 'white', path: path, lineWidth: .0008 });
      }
      draw.restore();
   });

   model.animate(() => {
      diagram.update();
   });
}
