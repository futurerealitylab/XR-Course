import { G3 } from '../util/g3.js';
export const init = async model => {
   let D = [];
   let g3 = new G3(model, draw => {
      draw.color('#ffffff').textHeight(.01);
      for (let n = 0 ; n < D.length ; n++)
         draw.text(D[n].s, [0,1.5,0], 'center', D[n].x+(n/63>>0)/8-2.0, (32-n%63)/20);
   });
   model.animate(() => {
      D = shared(() => {
         for (let n = 0 ; n < 2000 ; n++)
	    D[n] = {n: n, s: n * n, x: Math.sin(4*model.time+n)/30};
         return D;
      });
      g3.update();
   });
}
