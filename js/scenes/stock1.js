import * as cg from "../render/core/cg.js";
import { stock_prices } from "../util/stock_prices.js";

let color = ['#30a040','#ff2000','#484a60','#a0c0f0','#0080f0','#ffc800','#a0e040'];

export const init = async model => {
   let i = 0;
   for (let stock in stock_prices) {
      clay.defineMesh(stock, clay.createGrid(1000, 2));
      model.add(stock).color(cg.hexToRgba(color[i++]));
   }
   model.add('square').move(0,0,-1).scale(10);
   model.animate(() => {
      let i = 0;
      for (let stock in stock_prices) {
         let obj = model.child(i);
         obj.identity().move(0,1.5,0)
	               .turnX(Math.PI/3)
		       .move(0,0,-.06*(i-3))
		       .scale(.4,.01,.02);
         let s = stock_prices[stock];
         obj.setVertices((u,v) => {
	    let f = 998 * u, j = f >> 0;
            let t = cg.mixf(s[j][3],s[j+1][3],f%1) * (i==0?2:i==6?4:1);
            return [1-2*u, .05 * t, 2*v-1];
         });
	 i++;
      }
   });
}

