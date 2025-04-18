import * as cg from "../render/core/cg.js";
import { G3 } from '../util/g3.js';

//        Text appears wherever someone is looking when they talk.
//        Anyone can then move the text around via pinch and drag.
//        Anyone can delete the text by thumb/middle-finger pinch.

// Changes from speech2.js: Use clientState for all user input state sharing.

server.init('speechS', {});

export const init = async model => {
   let g3 = new G3(model, draw => {
      let th = 0.025;
      draw.textHeight(th);
      for (let key in speechS) {
         let text = speechS[key].text;
         let pos  = speechS[key].pos;
         let w    = speechS[key].w;
         if (w == undefined) {
	    w = 0;
	    let lines = text.split('\n');
	    for (let n = 0 ; n < lines.length ; n++)
	       w = Math.max(w, draw.textWidth(lines[n]) + .4 * th);
            speechS[key].w = w;
            speechS[key].nLines = lines.length;
         }
         let h = (speechS[key].nLines + .4) * th;
         draw.color('white').fill2D([[-w,-h],[w,-h],[w,h],[-w,h]], pos);
         draw.color('black').text(text, pos);
      }
   });
   window.onSpeech = (speech, speakerID) => {
      console.log('onSpeech', speech, speakerID);
      if (speakerID == -1)
         console.log('Nobody in XR is speaking.');
      else {
         let head = clientState.head(speakerID);
         let origin = head.slice(12,15);
         let z_axis = head.slice( 8,11);
         let pos = cg.add(origin, cg.scale(z_axis, -0.5));
         let key = cg.uniqueID();
         for (let k = 20 ; k < speech.length ; k++)
            if (speech.charAt(k) == ' ') {
               speech = speech.substring(0,k) + '\n' + speech.substring(k+1);
	       k += 20;
            }
         speechS[key] = { text: speech, pos: pos };
      }
   }
   model.animate(() => {
      speechS = server.synchronize('speechS');
      if (clientID == clients[0]) {
         for (let n = 0 ; n < clients.length ; n++) {
            let id = clients[n];
            for (let hand in {left:{}, right:{}}) {
	       let move = clientState.pinch(id, hand, 1);
	       let del  = clientState.pinch(id, hand, 2);
	       if (move || del) {
                  let pos = clientState.finger(id, hand, 0), dMin = .1, kMin;
                  for (let key in speechS) {
                     let d = cg.distance(speechS[key].pos, pos);
		     if (d < dMin) {
                        kMin = key;
                        dMin = d;
                     }
                  }
                  if (kMin)
		     if (move)
                        speechS[kMin].pos = pos;
                     else
                        delete speechS[kMin];
               }
            }
         }
         server.broadcastGlobal('speechS');
      }
      g3.update();
   });
}

