import * as cg from "../render/core/cg.js";
import { G3 } from "../util/g3.js";
import { cities } from "../util/major_cities.js";

export const init = async model => {
   let lo3 = 23.7752, hi3 = 49.9566, lo4 = -125.1162, hi4 = -69.0202, y = 1;

   let map = model.add('square').setTxtr('media/textures/grid_map.jpg')
                  .move(0,y,0).turnX(-Math.PI/2).scale(.9,.6,1);

   let table = model.add('cube').move(0,y/2,0).scale(.9,y/2-.0001,.6).opacity(.7);

   let g3 = new G3(model, draw => {
      draw.color('blue').textHeight(.04).text(1/delta >> 0, [0,2.5,0]);

      draw.textHeight(.02).lineWidth(.004);
      for (let n = 0 ; n < cities.length ; n++) {
         let x = 1.675 * (cities[n][4] - lo4) / (hi4 - lo4) - 0.880;
         let z = 1.190 * (cities[n][3] - lo3) / (hi3 - lo3) - 0.60;
         let r = cities[n][2] / 10000000;
         draw.color('red');
         if (r > .4) {
            draw.line([x,y,-z],[x,y+r/2,-z]);
            draw.line([x,y+r/2,-z],[x,y+r,-z]);
         }
         else
            draw.line([x,y,-z],[x,y+r,-z]);
         draw.color('blue');
         let p = [x,y+r+.018,-z];
         draw.text(cities[n][0], p);
         if (draw.distance(p) < .2) {
            draw.textHeight(.008);
            draw.text('pop. ' + cities[n][2], [x,y+r+.006,-z]);
            draw.textHeight(.02);
         }
      }
   });

   let delta = 1/30;
   model.animate(() => {
      g3.update();
      delta = .9 * delta + .1 * model.deltaTime;
   });
}

