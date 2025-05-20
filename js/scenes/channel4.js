import * as cg from '../render/core/cg.js';
import { G2 } from '../util/g2.js';

let C = [];
for (let n = 0 ; n < 256 ; n++)
   C.push(cg.rgbToHex([n/255,n/255,n/255]));

export const init = async model => {
   let N = 128, S = new Uint8Array(N*N), g2 = new G2();
   model.add('square').setTxtr(g2.getCanvas()).move(0,1.5,0).scale(.2);

   model.animate(() => {
      let u = n => 2 * n / N - 1;
      if (clientID == clients[0]) {
         for (let row = 0 ; row < N ; row++)
            for (let col = 0 ; col < N ; col++)
	       S[N*row+col] = (.5 + .5 * Math.sin(10 * u(col) - 4 * model.time)
	                               * Math.sin(10 * u(row))) * 255 >> 0;
	 for (let n = 1 ; n < clients.length ; n++)
	    channel[clients[n]].send(S);
      }
      else
         channel[clients[0]].on = d => S = d;

      g2.clear();
      for (let row = 0 ; row < N ; row++)
         for (let col = 0 ; col < N ; col++) {
            g2.setColor(C[S[N*row+col]]);
            g2.fillRect(u(col),u(row),2/N,2/N);
         }
   });
}
