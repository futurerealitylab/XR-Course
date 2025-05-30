import * as cg from "../render/core/cg.js";
import { G3 } from "../util/g3.js";

server.init('dhS', { d: {}, h: [], t: {} });

export const init = async model => {

   let types = 'house,road,roof'.split(',');

   window.onSpeech = (speech, id) => {
      if (clientState.pinch(id, 'left', 1))
         for (let n = 0 ; n < types.length ; n++)
            if (speech.indexOf(types[n]) >= 0)
               dhS.t[id] = types[n];
   }

   let isL1p = {}, isR1p = {}, L1p = {}, R1p = {};
   let isL2p = {}, isR2p = {}, L2p = {}, R2p = {};
   let np = {}, y0 = 1;

   let g3 = new G3(model, draw => {
      draw.color('#000000');
      draw.lineWidth(.003);
      for (let id in dhS.d) {
         let d = dhS.d[id];
         for (let n = 0 ; n < d.length - 1 ; n++)
            draw.line(d[n], d[n+1]);
      } 
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

            let isL1 = clientState.pinch (id, 'left' , 1);
            let isR1 = clientState.pinch (id, 'right', 1);
            let L1   = clientState.finger(id, 'left' , 1);
            let R1   = clientState.finger(id, 'right', 1);

            let isL2 = clientState.pinch (id, 'left' , 2);
            let isR2 = clientState.pinch (id, 'right', 2);
            let L2   = clientState.finger(id, 'left' , 2);
            let R2   = clientState.finger(id, 'right', 2);

            // Pinch with the left hand to draw with the right hand.

            if (isL1 && ! isR1 && ! isR2)
               d.push([R1[0],y0,R1[2]]);

            // When you stop drawing, your drawing is replaced by something.

            if (! isR1 && isL1p[id] && ! isL1) {

	       // Collaborators can speak to specify which type of thing
	       // to create by drawing, but for now we only create houses.

	       let type = dhS.t[id];
	       delete dhS.t[id];
	       if (! type)
	          type = 'house';

               switch (type) {
	       case 'house':
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
                  break;
               }
            }

            // Start pinching with your right hand to select the nearest house.

            if (! isR1p[id] && isR1 || ! isR2p[id] && isR2) {
	       delete np[id];
	       let dMin = 10, x = R1[0], z = R1[2];
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

            // Pinch with your right index finger to move a house.

            if (isR1 && np[id] !== undefined) {
	       let n = np[id];
	       let h = dhS.h[n];
	       h[0] = R1[0];
	       h[1] = R1[2];
	    }

            // Pinch with your right middle finger to vary house height.
            // If house height becomes negative, the house is deleted.

            if (isR2 && np[id] !== undefined) {
	       let n = np[id];
	       let h = dhS.h[n];
	       h[4] += (R2[1] - R2p[id][1]) / 2;
	       if (h[4] < 0) {
		  dhS.h.slice(n, 1);
		  delete np[id];
	       }
	    }

	    isL1p[id] = isL1;
	    isR1p[id] = isR1;
	    L1p[id]   = L1;
	    R1p[id]   = R1;

	    isL2p[id] = isL2;
	    isR2p[id] = isR2;
	    L2p[id]   = L2;
	    R2p[id]   = R2;
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

