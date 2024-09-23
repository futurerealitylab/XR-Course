// DEMONSTRATION OF GETTING RIGID BODY INFO FROM THE OPTITRACK

import * as cg from "../render/core/cg.js";

let TRACK_ITEMS = ["1","2","3","4"];

export const init = async model => {
   let obj = [];
   for (let i = 0; i < TRACK_ITEMS.length; i++)
      obj.push(model.add('cube'));

   model.animate(() => {
      server.track();

      let info = JSON.parse(trackInfo);

      for (let i = 0; i < TRACK_ITEMS.length; i++) {
         let tq = info[TRACK_ITEMS[i]];
         let m = cg.mFromQuaternion({ x:tq[3], y:tq[4], z:tq[5], w:tq[6] });
         m[12] = tq[0];
         m[13] = tq[1] + 1.5;
         m[14] = tq[2];
         obj[i].setMatrix(m).scale(.1);      }
   });
}
