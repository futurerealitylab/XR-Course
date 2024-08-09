/*
    BLOCK ALL CGI BEHIND WHEREVER OTHER PEOPLE ARE WITHIN THE ROOM.
*/

import * as cg from "./cg.js";
import { viewMatrix } from "./controllerInput.js";

server.init('peoplePositions', {});

export function PeopleBillboards(parent) {
   let billboards = parent.add().opacity(.001);

   this.update = () => {
      return;

      if (window.suppressPeopleBillboards)
         return;

      // BROADCAST THE PEOPLE POSITION FOR THIS CLIENT

      if (window.clientID !== undefined) {
   
         let mLeft = viewMatrix[0];
         if (mLeft) {
            mLeft = cg.mInverse(mLeft);
            let matrix = [];
            for (let i = 0 ; i < 16 ; i++)
                matrix.push(mLeft[i]);
   
            let mRight = viewMatrix[1];
            if (mRight) {
               mRight = cg.mInverse(mRight);
               for (let i = 12 ; i < 15 ; i++)
                  matrix[i] = (mLeft[i] + mRight[i]) / 2;
            }
   
            matrix = cg.mMultiply(clay.inverseRootMatrix, matrix);
            server.send('peoplePositions', {
               'clientID': clientID,
               'pos'     : cg.roundVec(3, matrix.slice(12,15))
            });
         }
      }

      // RECEIVE PEOPLE POSITIONS FROM OTHER CLIENTS
   
      server.sync('peoplePositions', (msgs, msg_clientID) => {
         for (let id in msgs) {
            let msg = msgs[id];
            peoplePositions[msg.clientID] = msg.pos;
         }
      });

      // RENDER BILLBOARDS FOR ALL OTHER CLIENTS
   
      while (billboards.nChildren() > 0)
         billboards.remove(0);

      if (clients.length < 2)
         return;
   
      for (let headID in peoplePositions)
         if (headID != clientID) {
            let pos = peoplePositions[headID];

            // IGNORE ANY CLIENT THAT IS NOT ACTUALLY MOVING IN XR

	    if (pos[0]==0 && pos[1]==0 && pos[2]==0)
	    	return;

	    let headWidth  = .30;
	    let headHeight = .35;
	    let neckHeight = .08;
	    let bodyWidth  = .70;
	    let bodyHeight = pos[1] - neckHeight;

            billboards.add('cube').identity()
	                          .move(pos).move(0, -neckHeight/2, 0)
				  .faceViewer()
				  .scale(headWidth/2, headHeight/2 + neckHeight, headWidth/2);

            billboards.add('cube').identity()
	                          .move(pos[0], bodyHeight/2, pos[2])
				  .faceViewer()
				  .scale(bodyWidth/2, bodyHeight/2, .01);
         }
   }
}

