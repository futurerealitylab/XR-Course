import { G3 } from '../util/g3.js';
export const init = async model => {
   let D = [];
   let g3 = new G3(model, draw => {
      draw.color('#ffffff').textHeight(.04);
      for (let n = 0 ; n < D.length ; n++)
         draw.text(D[n].s, [0,1.5,0], 'center', D[n].x, (5-n)/10);
   });
   model.animate(() => {
      if (clientID == clients[0]) {
         for (let n = 0 ; n <= 10 ; n++)
	    D[n] = {n: n, s: n * n, x: Math.sin(model.time+n)/10};
         for (let i = 1 ; i < clients.length ; i++)
            for (let n = 0 ; n < D.length ; n++)
               channel[clients[i]].send(D[n]);
      }
      else
         channel[clients[0]].on = d => D[d.n] = d;
      g3.update();
   });
}
