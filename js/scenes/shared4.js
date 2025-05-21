import * as cg from '../render/core/cg.js';
import { G2 } from '../util/g2.js';
export const init = async model => {
   let C = []; for (let n=0 ; n<256 ; n++) C.push(cg.rgbToHex([n/255,n/255,n/255]));
   let N = 128, S = new Uint8Array(N*N), g2 = new G2();
   let s = u => Math.sin(10 * u), u = n => 2 * n / N - 1;
   model.add('square').setTxtr(g2.getCanvas()).move(0,1.5,0).scale(.2);
   model.animate(() => {
      S = shared(() => {
         for (let row = 0 ; row < N ; row++)
         for (let col = 0 ; col < N ; col++)
            S[N*row+col] = 128 + 127 * s(u(col)-model.time/2) * s(u(row)) >> 0;
         return S;
      });
      g2.clear();
      if (S)
         for (let row = 0 ; row < N ; row++)
         for (let col = 0 ; col < N ; col++)
            g2.setColor(C[S[N*row+col]]).fillRect(u(col),u(row),2/N,2/N);
   });
}
