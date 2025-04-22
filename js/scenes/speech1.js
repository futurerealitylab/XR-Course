import * as cg from "../render/core/cg.js";
import { XRSharing } from '../render/core/xrSharing.js';
import { G3 } from '../util/g3.js';

//        Text appears wherever someone is looking when they talk.
//        Anyone can then move that text around via pinch and drag.
//        To delete text, drag it down near the floor.

server.init('speechS', {});
server.init('speechI', {});

export const init = async model => {
   let xrSharing = new XRSharing(model);
   xrSharing.setHandSharing();
   let g3 = new G3(model, draw => {
      let th = 0.05, margin = 0.02;
      draw.textHeight(th);
      for (let key in speechS) {
         let text = speechS[key].text;
         let pos  = speechS[key].pos;
         let w = draw.textWidth(text) + margin, h = th + margin;
         draw.color('white').fill2D([[-w,-h],[w,-h],[w,h],[-w,h]], pos);
         draw.color('black').text(text, pos);
      }
      if (draw.view() == 0)                        // WHILE EITHER HAND IS PINCHING, SEND THE
         for (let hand in {left:{}, right:{}})     // PINCH POSITION TO ALL CLIENTS.
            if (draw.pinch(hand,1))
               server.send('speechI', { pinch: cg.roundVec(4, draw.finger(hand,1)) });
   });
   model.parseSpeech = (speech, speakerID) => {
      if (speakerID == -1)
         console.log('Nobody in XR is speaking.');
      else {
         let headMatrix = cg.unpackMatrix(xrS[speakerID].head);
         let origin = headMatrix.slice(12,15);
         let z_axis = headMatrix.slice( 8,11);
         let pos = cg.add(origin, cg.scale(z_axis, -0.5));
         let key = cg.uniqueID();
         speechS[key] = { text: speech, pos: pos };
      }
   }
   model.animate(() => {
      xrSharing.update();
      speechS = server.synchronize('speechS');
      if (clientID == clients[0]) {
         server.sync('speechI', msgs => {
            for (let id in msgs) {
               let s = msgs[id];
               console.log('message', s);
               if (s.pinch) {
                  let d, dMin = 10000, kMin;
                  for (let key in speechS)
                     if ((d = cg.distance(speechS[key].pos, s.pinch)) < dMin) {
                        kMin = key;
                        dMin = d;
                     }
                  if (dMin < 10000) {
                     speechS[kMin].pos = s.pinch;
                     if (speechS[kMin].pos[1] < .5)
                        delete speechS[kMin];
                  }
               }
            }
         });
         server.broadcastGlobal('speechS');
      }
      g3.update();
   });
}

