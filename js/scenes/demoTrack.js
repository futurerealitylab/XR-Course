// DEMONSTRATION OF GETTING RIGID BODY INFO FROM THE OPTITRACK

import * as cg from "../render/core/cg.js";

let TRACK_ITEMS = ["11"];

export const init = async model => {
   let obj = [];
   for (let i = 0; i < TRACK_ITEMS.length; i++)
      obj.push(model.add('cube'));

   model.animate(() => {
      server.track();
      let tq = JSON.parse(trackInfo);

      for (let i = 0; i < TRACK_ITEMS.length; i++) {
         let m = cg.mFromQuaternion({ x:tq[TRACK_ITEMS[i]][3], y:tq[TRACK_ITEMS[i]][4], z:tq[TRACK_ITEMS[i]][5], w:tq[TRACK_ITEMS[i]][6] });
         m[12] = tq[TRACK_ITEMS[i]][0];
         m[13] = tq[TRACK_ITEMS[i]][1] + 1.5;
         m[14] = tq[TRACK_ITEMS[i]][2];
         obj[i].setMatrix(m).scale(.1);      }
   });
}
