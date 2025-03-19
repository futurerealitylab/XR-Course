import * as cg from "../render/core/cg.js";
import { stock_prices } from "../util/stock_prices.js";

let color = ['#30a040','#ff2000','#484a60','#a0c0f0','#0080f0','#ffc800','#a0e040'];
let N = 1000;

let ymd2d = (y,m,d) => {
   let md = [0,31,59,90,120,151,181,212,243,273,304,334];
   return d + md[m-1] + (y%4==0 && m>2 ? 1 : 0);
}

export const init = async model => {
   let i = 0;
   for (let stock in stock_prices)
      model.add(clay.wire(N,2,i)).move(0, 1.5, -.03*(i-3)).color(cg.hexToRgba(color[i++]));
   model.animate(() => {
      let i = 0;
      for (let stock in stock_prices) {
         let s = stock_prices[stock];
	 clay.animateWire(model.child(i++), .006,
	    u => {
	       let v = Math.min(1, u);
	       let f = 998 * v, j = f >> 0;
               let t = cg.mixf(s[j][3],s[j+1][3],f%1) * (i==1?2:i==7?4:1);
               return [.4 - .8*u, .0006 * t, 0];
	    }
	 );
      }
   });
}

