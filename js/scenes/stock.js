import * as cg from "../render/core/cg.js";
import { XRSharing } from '../render/core/xrSharing.js';
import { Diagram } from "../render/core/diagram.js";
import { stock_prices } from "../util/stock_prices.js";

// Add date labels

window.stockS = { offset: 0 };

let color = ['#30a040','#ff2000','#484a60','#a0c0f0','#0080f0','#ffc800','#a0e040'];
let ty = [];

let mn = 'jan,feb,mar,apr,may,jun,jul,aug,sep,oct,nov,dec'.split(',');
let yd = [0,366,731,1096,1461];
let md = [0,31,59,90,120,151,181,212,243,273,304,334];
let ymd2d = (y,m,d) => { // Given year,month,day, return the day
   return yd[y-2020] + md[m-1] + (y%4==0 && m>2 ? 1 : 0) + d;
}

let N = 1000;

export const init = async model => {
   let xrSharing = new XRSharing(model);
   xrSharing.setHandSharing(true);

   let d2x = d => (d - 960) / 960 + .5 * Math.sin(3 * stockS.offset);

   let diagram = new Diagram(model, [0,1.5,0], .8, draw => {
      draw.save();
         draw.fill({ color: '#ffffffd0', path: [[-.3,-.3,-.3],[.3,-.3,-.3],[.3,.2,-.3],[-.3,.2,-.3]] });
         draw.fill({ color: '#ffffffd0', path: [[-.3,-.3,-.3],[.3,-.3,-.3],[.3,-.3,.2],[-.3,-.3,.2]] });
      draw.restore();

      draw.save();
         let i = 0;
         for (let stock in stock_prices) {
	    let s = stock_prices[stock];
            let m = .0007 * (i==0 ? 2 : i==6 ? 4 : 1);
	    let z = -.08 * (i-3);
            let c = cg.hexToRgba(color[i]);
            let path = [];
	    for (let n = 0 ; n < N ; n++) {
	       let d = ymd2d(s[n][0],s[n][1],s[n][2]);
	       let x = d2x(d);
	       if (x > -.2 && x < .2) {
	          if (i == 0) {
	             let Y = n && s[n][0] != s[n-1][0];
	             let M = n && s[n][1] != s[n-1][1];
	             if (Y || M)
                        draw.line({ color: '#000000',
			            path: [[x,-.3,-.29],[x,-.3,.2]],
				    lineWidth: Y ? .0015 : .001 });
                  }
	          let y = m * (s[n][4]+s[n][5])/2 - .3;
	          path.push([x, y, z]);
               }
            }
            draw.line({ color: c, path: path, lineWidth: .002 });
            draw.save();
               draw.move(-.3, -.1, z);
               draw.scale(.03);
               draw.text({ color: c, text: stock });
            draw.restore();
	    i++;
         }
         for (let year = 2020 ; year <= 2024 ; year++) {
	    let x = d2x(ymd2d(year,7,1));
	    if (x >= -.2 && x <= .2) {
	       draw.save();
	          draw.move(x,-.28,.2);
	          draw.scale(.015);
	          draw.text({ color: '#000000', text: year });
	       draw.restore();
            }
            for (let month = 0 ; month < 12 ; month++) {
	       let x = d2x(ymd2d(year, month+1, 15));
	       if (x >= -.2 && x <= .2) {
	          draw.save();
	             draw.move(x, month&1 ? -.25 : -.28, .15);
	             draw.scale(.012);
	             draw.text({ color: '#000000', text: mn[month] });
	          draw.restore();
	       }
	    }
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
            if (! s.head)     // CHECK WHETHER THIS IS NECESSARY.
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

