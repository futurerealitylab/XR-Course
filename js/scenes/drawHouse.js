
import * as cg from "../render/core/cg.js";
import { G3 } from "../util/g3.js";

server.init('dhS', { d: [], h: [] });

export const init = async model => {
   let g3 = new G3(model, draw => {
      draw.color('#000000');
      draw.lineWidth(.003);
      for (let n = 0 ; n < dhS.d.length - 1 ; n++)
         draw.line(dhS.d[n], dhS.d[n+1]);
   });
   model.add('cube').move(0,1,0).scale(.5,.001,.5).opacity(.7);

   let houses = model.add();

   model.animate(() => {
      dhS = server.synchronize('dhS');
      if (clientID == clients[0]) {
         for (let n = 0 ; n < clients.length ; n++) {
            let id = clients[n];
            let isErase = clientState.pinch(id, 'left' , 1);
            let isPinch = clientState.pinch(id, 'right', 1);
            let isBuild = clientState.pinch(id, 'right', 2);
            if (isPinch) {
               let p = clientState.finger(id, 'left', 1);
               dhS.d.push([p[0],1,p[2]]);
            }
            if (isErase)
               dhS.d = [];
            if (isBuild && dhS.d.length > 0) {
               let xlo = 10, zlo = 10, xhi = -10, zhi = -10;
               for (let n = 0 ; n < dhS.d.length ; n++) {
                  xlo = Math.min(xlo, dhS.d[n][0]);
                  xhi = Math.max(xhi, dhS.d[n][0]);
                  zlo = Math.min(zlo, dhS.d[n][2]);
                  zhi = Math.max(zhi, dhS.d[n][2]);
               }
               dhS.d = [];
               dhS.h.push([xlo,zlo,xhi,zhi]);
            }
         }
         server.broadcastGlobal('dhS');
      }

      g3.update();

      while (houses.nChildren() > 0)
         houses.remove(0);
      for (let n = 0 ; n < dhS.h.length ; n++) {
         let xlo = dhS.h[n][0], zlo = dhS.h[n][1],
             xhi = dhS.h[n][2], zhi = dhS.h[n][3];
         houses.add('cube').move ((xlo+xhi)/2, 1.03, (zlo+zhi)/2)
                           .scale((xhi-xlo)/2, 0.03, (zhi-zlo)/2)
                           .opacity(.7);
      }
   });
}

