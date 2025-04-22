import * as cg from "../render/core/cg.js";
import { G3 } from "../util/g3.js";

let words = 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday'.split(',');

let p = [];                                        // DEFAULT TILE POSITIONS
for (let n = 0 ; n < words.length ; n++)
   p.push([.3 * (n>>2) - .15, 1.53 - .15 * (n&3), 0]);

server.init('p2S', { p: p });                      // PERSISTENT STATE OBJECT
server.init('p2I', {});                            // MESSAGE PASSING OBJECT

export const init = async model => {
   let g3 = new G3(model, draw => {
      let w = .2, h = .075, b = .003, p;
      if (p = p2S.p)                               // RENDER WORD TILES AFTER DATA HAS LOADED.
         for (let n = 0 ; n < p.length ; n++) {
            draw.color('black'  ).fill2D([[-w-b,-h-b],[w+b,-h-b],[w+b,h+b],[-w-b,h+b]], p[n]);
            draw.color('#ff8080').fill2D([[-w  ,-h  ],[w  ,-h  ],[w  ,h  ],[-w  ,h  ]], p[n]);
            draw.color('black'  ).textHeight(.03).text(words[n], p[n]);
         }
      if (draw.view() == 0)                        // WHILE EITHER HAND IS PINCHING, SEND THE
         for (let hand in {left:{}, right:{}})     // PINCH POSITION TO ALL CLIENTS.
            if (draw.pinch(hand,1))
               server.send('p2I', { pinch: cg.roundVec(4, draw.finger(hand,1)) });
   });
   model.animate(() => {
      p2S = server.synchronize('p2S');             // SYNCHRONIZE THE PERSISTENT STATE OBJECT.
      if (p2S.p) {
         server.sync('p2I', msgs => {              // RESPOND TO A PINCH BY MOVING THE
            for (let id in msgs)                   // NEAREST TILE TO THE PINCH POSITION.
	       if (msgs[id].pinch) {
                  let f = msgs[id].pinch, d, dMin = 10000, nMin = -1;
                  for (let n = 0 ; n < p2S.p.length ; n++)
                     if ((d = cg.distance(p2S.p[n], f)) < dMin) {
                        nMin = n;
                        dMin = d;
                     }
                  p2S.p[nMin] = f;
               }
         });
         if (clientID == clients[0])               // THE FIRST CLIENT DETERMINES THE SHARED
            server.broadcastGlobal('p2S');         // STATE OF ALL CLIENTS.
      }
      g3.update();                                 // UPDATE THE G3 SCENE.
   });
}
