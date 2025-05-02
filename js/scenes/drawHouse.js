
import * as cg from "../render/core/cg.js";
import { G3 } from "../util/g3.js";

server.init('dhS', { d: {}, h: [], s: '' });

export const init = async model => {

   let word = 'house,road,roof'.split(',');

   window.onSpeech = (speech, id) => {
      for (let n = 0 ; n < word.length ; n++)
         if (speech.indexOf(word[n]) >= 0)
            dhS.s = word[n];
   }

   let wasL1 = {}, wasR1 = {}, np = {}, Lp0 = {}, Rp0 = {}, y0 = 1;
   let spoken = '';

   let g3 = new G3(model, draw => {
      draw.color('#000000');
      draw.lineWidth(.003);
      for (let id in dhS.d) {
         let d = dhS.d[id];
         for (let n = 0 ; n < d.length - 1 ; n++)
            draw.line(d[n], d[n+1]);
      } 
      draw.textHeight(.05).color('#ffffff').text(dhS.s, [0,1.5,0]);
   });
   model.add('cube').move(0,1,0).scale(.5,.001,.5).opacity(.7);

   let houses = model.add();

   model.animate(() => {
      dhS = server.synchronize('dhS');
      if (clientID == clients[0]) {
         for (let n = 0 ; n < clients.length ; n++) {
            let id = clients[n];
	    if (! dhS.d[id])
	       dhS.d[id] = [];
	    let d = dhS.d[id];
            let isL1 = clientState.pinch(id, 'left' , 1);
            let isR1 = clientState.pinch(id, 'right', 1);
            let Lp = clientState.finger(id, 'left', 1);
            let Rp = clientState.finger(id, 'right', 1);

            // Pinch with the left hand to draw with the right hand.

            if (isL1 && ! isR1)
               d.push([Rp[0],y0,Rp[2]]);

            // When you stop drawing, your drawing is replaced by a house.

            if (! isR1 && wasL1[id] && ! isL1) {
               let xlo = 10, zlo = 10, xhi = -10, zhi = -10;
               for (let n = 0 ; n < d.length ; n++) {
                  xlo = Math.min(xlo, d[n][0]);
                  xhi = Math.max(xhi, d[n][0]);
                  zlo = Math.min(zlo, d[n][2]);
                  zhi = Math.max(zhi, d[n][2]);
               }
               dhS.d[id] = [];
               dhS.h.push(cg.roundVec(3, [ (xlo+xhi)/2,
	                                   (zlo+zhi)/2,
	                                   Math.max(.02, (xhi-xlo)/2),
			                   Math.max(.02, (zhi-zlo)/2), .03 ]));
            }

            // Start pinching with your right hand to select the nearest house.

            if (! wasR1[id] && isR1) {
	       delete np[id];
	       let dMin = 10, x = Rp[0], z = Rp[2];
	       for (let n = 0 ; n < dhS.h.length ; n++) {
	          let h = dhS.h[n], xc = h[0], zc = h[1], xr = h[2], zr = h[3];
		  if (x > xc - xr && x < xc + xr && z > zc - zr && z < zc + zr) {
		     let d = Math.max(Math.abs(x - xc), Math.abs(z - zc));
		     if (d < dMin) {
		        dMin = d;
			np[id] = n;
		     }
		  }
	       }
	    }

            // Pinch with your right hand to move a house.
            // Also pinch with your left hand to vary the house height.
            // If the height goes negative, the house is deleted.

            if (isR1 && np[id] !== undefined) {
	       let n = np[id];
	       let h = dhS.h[n];
	       h[0] = Rp[0];
	       h[1] = Rp[2];
	       if (wasL1[id] && isL1) {
	          h[4] += Lp[1] - Lp0[id][1];
		  if (h[4] < 0) {
		     dhS.h.slice(n, 1);
		     delete np[id];
		  }
	       }
	    }
	    wasL1[id] = isL1;
	    wasR1[id] = isR1;
	    Lp0[id] = Lp;
	    Rp0[id] = Rp;
         }
         server.broadcastGlobal('dhS');
      }

      g3.update();

      // Houses created later stack on top of houses created earlier.

      while (houses.nChildren() > 0)
         houses.remove(0);
      for (let n = 0 ; n < dhS.h.length ; n++) {
         let h = dhS.h[n];
	 let y = y0;
         for (let i = n-1 ; i >= 0 ; i--) {
	    let hi = dhS.h[i];
	    if (h[0] > hi[0]-hi[2] && h[0] < hi[0]+hi[2] &&
	        h[1] > hi[1]-hi[3] && h[1] < hi[1]+hi[3])
	       y += 2 * hi[4];
	 }
         houses.add('cube').move(h[0],y+h[4],h[1]).scale(h[2],h[4],h[3]).opacity(.7);
      }
   });
}

