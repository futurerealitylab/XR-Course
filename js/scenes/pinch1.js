import * as cg from "../render/core/cg.js";
import { G3 } from "../util/g3.js";

let words = 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday'.split(',');

let p = [];                                        // INITIALIZE TILE POSITIONS.
for (let n = 0 ; n < words.length ; n++)
   p.push([.3 * (n/4>>0) - .15, 1.53 - .15 * (n%4), 0]);

export const init = async model => {
   let g3 = new G3(model, draw => {
      let w = .2, h = .075, b = .003;              // RENDER WORD TILES.
      for (let n = 0 ; n < p.length ; n++) {
         draw.color('black').fill2D([[-w-b,-h-b],[w+b,-h-b],[w+b,h+b],[-w-b,h+b]], p[n]);
         draw.color('white').fill2D([[-w,-h],[w,-h],[w,h],[-w,h]], p[n]);
         draw.color('black').textHeight(.03).text(words[n], p[n]);
      }
      if (draw.view() == 0)                        // WHILE EITHER HAND IS PINCHING, MOVE
         for (let hand in {left:{}, right:{}})     // NEAREST TILE TO THE PINCH POSITION.
            if (draw.pinch(hand,1)) {
               let f = draw.finger(hand,1), d, dMin = 10000, nMin = -1;
	       for (let n = 0 ; n < p.length ; n++)
	          if ((d = cg.distance(p[n], f)) < dMin) {
	             nMin = n;
	             dMin = d;
	          }
	       p[nMin] = f;
            }
   });

   model.animate(() => {
      g3.update();                                 // UPDATE THE G3 SCENE.
   });
}
