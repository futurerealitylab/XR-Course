import * as cg from "../render/core/cg.js";
import { G3 } from "../util/g3.js";
export const init = async model => {
   let drawing = [], LP0, ad = {}, dd = {}, P0 = {};
   let g3 = new G3(model, draw => {
      for (let n = 0 ; n < drawing.length ; n++) {
         draw.lineWidth(drawing[n].s ? .006 : .003)
             .color(drawing[n].c ? '#ffffff' : '#ff00ff');
         for (let i = 0 ; i < drawing[n].p.length - 1 ; i++)
            draw.line(drawing[n].p[i], drawing[n].p[i+1]);
      }
   });
   let isOnLine = (p, a, b) => {
      let d = cg.distance(a,b);
      for (let t = 0 ; t < d ; t += .02)
         if (cg.distance(p, cg.mix(a, b, t/d)) < .02)
	    return true;
      return false;
   }
   let findDrawing = p => {
      for (let n = 0 ; n < drawing.length ; n++)
         for (let i = 0 ; i < drawing[n].p.length - 1 ; i++)
	    if (isOnLine(p, drawing[n].p[i], drawing[n].p[i+1]))
	       return drawing[n];
      return null;
   }
   model.animate(() => {
      drawing = shared(() => {
	 for (let i = 0 ; i < drawing.length ; i++)
	    drawing[i].s = 0;
         for (let i = 0 ; i < clients.length ; i++)
            for (let hand in {left:{},right:{}}) {

               let PT = clientState.finger(clients[i], hand, 0);
	       if (PT == null)
	          continue;
               let P = cg.mix(PT, clientState.finger(clients[i], hand, 1), .5);

	       let id = clients[i] + hand;
               switch (clientState.pinchState(clients[i], hand, 1)) {
               case 'up':
	          ad[id] = { d: findDrawing(P), count: 0 };
		  if (ad[id].d)
		     ad[id].d.s = 1;
	          break;
               case 'press':
	          if (! ad[id].d)
                     drawing.push(dd[id] = { p:[P], s: 0, c: 0 });
	          break;
               case 'down':
	          if (! ad[id].d)
                     dd[id].p.push(P);
                  else {
		     ad[id].d.s = 1;
		     ad[id].count++;
	             let d = cg.subtract(P, P0[id]);
	             for (let i = 0 ; i < ad[id].d.p.length ; i++)
	                ad[id].d.p[i] = cg.add(ad[id].d.p[i], d);
	          }
	          break;
               case 'release':
	          if (ad[id].d && ad[id].count < 10)
		     if (id.indexOf('right') >= 0)
		        ad[id].d.c = 1 - ad[id].d.c;
		     else
		        for (let i = 0 ; i < drawing.length ; i++)
		           if (ad[id].d == drawing[i]) {
			      drawing.splice(i, 1);
			      ad[id] = { d: null, count: 0 };
			      break;
			   }
                     
	          break;
               }
               P0[id] = P;
            }
         return drawing;
      });
      g3.update();
   });
}

