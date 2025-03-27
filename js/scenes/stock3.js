import * as cg from "../render/core/cg.js";
import { XRSharing } from '../render/core/xrSharing.js';
import { Diagram } from "../render/core/diagram.js";
import { stock_prices } from "../util/stock_prices.js";

// Add date labels

window.stockS = { offset: 0 };

let color = ['#30a040','#ff2000','#484a60','#a0c0f0','#0080f0','#ffc800','#a0e040'];
let ty = [];

let ymd2d = (y,m,d) => { // Given year,month,day, return the day
   let yy = [0,366,631,966,1331];
   let md = [0,31,59,90,120,151,181,212,243,273,304,334];
   return yy[y-2020] + md[m-1] + (y%4==0 && m>2 ? 1 : 0);
}

let N = 1000;

export const init = async model => {
   let xrSharing = new XRSharing(model);
   xrSharing.setHandSharing(true);

   let diagram = new Diagram(model, [0,1.6,0], .5, draw => {
      draw.save();
         draw.fill({ color: '#ffffffc0', path: [[-.4,-.3,-.3],[.4,-.3,-.3],[.4,.4,-.3],[-.4,.4,-.3]] });
         draw.fill({ color: '#ffffffc0', path: [[-.4,-.3,-.3],[.4,-.3,-.3],[.4,-.3,.2],[-.4,-.3,.2]] });
      draw.restore();

      draw.save();
         let i = 0;
         for (let stock in stock_prices) {
	    let n0 = N * (100 + cg.def(stockS.offset, 0)) >> 0;
	    let s = stock_prices[stock];
            let m = .001 * (i==0 ? 2 : i==6 ? 4 : 1);
	    let z = -.08 * (i-3);
            let c = cg.hexToRgba(color[i]);
            let path = [];
	    for (let n = 0 ; n < 365 ; n++) {
	       let nn = (n0 + n) % N;
	       let x = .3 - .6 * n / 365;
	       let nn0 = (n0 + n + 1) % N;
	       let Y = s[nn][0] != s[nn0][0];
	       let M = s[nn][1] != s[nn0][1];
	       if (i == 0 && (Y || M)) {
	          draw.line({ color: '#000000', path: [[x,-.3,-.29],[x,-.3,.2]], lineWidth: Y ? .0012 : .0008 });
		  if (Y) {
		     draw.save();
		        draw.move(x+.045, -.28, .2);
			draw.scale(.02);
	                draw.text({ color: '#000000', text: '' + s[nn0][0] });
		     draw.restore();
                  }
               }
	       path.push([x, m * s[nn][6] - .3, z]);
            }
            draw.line({ color: c, path: path, lineWidth: .002 });
            draw.save();
               let y = m * s[(n0 + 183) % N][6] - .2;
	       ty[i] = ty[i] ? .9 * ty[i] + .1 * y : y;
               draw.move(0, ty[i], z);
               draw.scale(.03);
               draw.text({ color: c, text: stock });
            draw.restore();
	    i++;
         }
      draw.restore();
   });

   let wasHandDown = false, p0 = [0,0,0];

   model.animate(() => {
      xrSharing.update();
      stockS = server.synchronize('stockS');
      if (clientID == clients[0]) {
         let handDown = null, mat;
         for (let id in xrS) {
            if (stockS.offset === undefined)
               stockS.offset = 0;
	    let s = xrS[id];
            if (! s.head)
               continue;
            for (let hand in {left:{}, right:{}})
	       if (s[hand][0])
	          mat = cg.unpackMatrix(s[handDown = hand].mat);
         }
	 if (handDown) {
	    let p1 = mat.slice(12,15);
	    if (wasHandDown)
	       stockS.offset += p1[0] - p0[0];
	    p0 = p1;
	 }
         wasHandDown = handDown;

	 server.broadcastGlobal('stockS');
      }
      diagram.update();
   });
}

