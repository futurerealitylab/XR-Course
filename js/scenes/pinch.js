import * as cg from "../render/core/cg.js";
import { G3 } from "../util/g3.js";

export const init = async model => {
   let words = 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday'.split(',');
   let p = [];
   for (let n = 0 ; n < words.length ; n++)
      p.push([.3 * (n/4>>0) - .15, 1.53 - .15 * (n%4), 0]);
   let g3 = new G3(model, draw => {
      let textCard = (text, p) => {
         let w = .2, h = .075, b = .003;
         draw.color('black').fill2D([[-w-b,-h-b],[w+b,-h-b],[w+b,h+b],[-w-b,h+b]], p);
         draw.color('white').fill2D([[-w,-h],[w,-h],[w,h],[-w,h]], p);
         draw.color('black').textHeight(.03).text(text, p);
      }
      for (let n = 0 ; n < p.length ; n++)
         textCard(words[n], p[n]);
      for (let hand in {left:{}, right:{}})
         if (draw.pinch(hand,1)) {
            let f = draw.finger(hand,1);
	    let dMin = 10000, nMin = -1;
	    for (let n = 0 ; n < p.length ; n++) {
	       let d = cg.distance(p[n], f);
               if (d < dMin) {
	          nMin = n;
	          dMin = d;
	       }
	    }
	    p[nMin] = f;
         }
   });

   model.animate(() => {
      g3.update();
   });
}

