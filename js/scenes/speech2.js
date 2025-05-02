import * as cg from "../render/core/cg.js";
import { XRSharing } from '../render/core/xrSharing.js';
import { G3 } from '../util/g3.js';

//	Text appears wherever someone is looking when they talk.
//	Anyone can then move that text around via pinch and drag.
//	To delete text, drag it down near the floor.

// Changes from speech1.js: Move all text dragging logic to the first client.

server.init('speechS', {});

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
         for (let n = 0 ; n < clients.length ; n++) {
	    let id = clients[n];
	    for (let hand in {left:{}, right:{}}) {
	       if (xrS[id] && xrS[id][hand] && xrS[id][hand].fingers) {
	          let thumb = xrS[id][hand].fingers[0];
	          let index = xrS[id][hand].fingers[1];
		  let d = cg.distance(thumb, index);
		  if (d > 0 && d < 0.025) {
                     let dMin = 10000, kMin;
                     for (let key in speechS)
                        if ((d = cg.distance(speechS[key].pos, index)) < dMin) {
                           kMin = key;
                           dMin = d;
                        }
                     if (dMin < 10000) {
                        speechS[kMin].pos = index;
                        if (speechS[kMin].pos[1] < .5)
                           delete speechS[kMin];
                     }
		  }
               }
            }
         }
	 server.broadcastGlobal('speechS');
      }
      g3.update();
   });
}

