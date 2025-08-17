import * as cg from "../render/core/cg.js";
import { Structure } from "../render/core/structure.js";

export const init = async model => {
   model.animate(() => {
      while (model.nChildren() > 0)
         model.remove(0);
      let S = new Structure();
      S.nSides(24).lineCap('butt');
      let V = [ [-1,-1,-1,-1], [ 1,-1,-1,-1], [-1, 1,-1,-1], [ 1, 1,-1,-1],
                [-1,-1, 1,-1], [ 1,-1, 1,-1], [-1, 1, 1,-1], [ 1, 1, 1,-1],
                [-1,-1,-1, 1], [ 1,-1,-1, 1], [-1, 1,-1, 1], [ 1, 1,-1, 1],
                [-1,-1, 1, 1], [ 1,-1, 1, 1], [-1, 1, 1, 1], [ 1, 1, 1, 1] ];
      let c = Math.cos(model.time);
      let s = Math.sin(model.time);
      for (let n = 0 ; n < 16 ; n++) {
         let x = V[n][0], w = V[n][3];
         V[n][0] = c * x - s * w;
         V[n][3] = s * x + c * w;
	 w = 2 / (V[n][3] + 3);
	 V[n] = [ w * V[n][0], w * V[n][1], w * V[n][2], w ];
      }
      let line = (i,j) => {
         let a = V[i], b = V[j];
	 let wa = a[3], wb = b[3];
         S.lineWidth(.15 * Math.max(wa, wb));
	 if (wa > wb)
	    S.taper(1 - wb/wa).line(a,b);
         else
	    S.taper(1 - wa/wb).line(b,a);
      }
      let lines = (p,s) => {
         for (let i = 0 ; i < p.length ; i++)
	    line(p[i], p[i]+s);
      }
      lines([0,2,4,6,8,10,12,14], 1);
      lines([0,1,4,5,8, 9,12,13], 2);
      lines([0,1,2,3,8, 9,10,11], 4);
      lines([0,1,2,3,4, 5, 6, 7], 8);
      S.build(model);
      S.sizes([.1]);
      S.update();
      model.identity().move(0,1,0);
   });
}

