// DEMONSTRATION OF GETTING RIGID BODY INFO FROM THE OPTITRACK

import * as cg from "../render/core/cg.js";

export const init = async model => {
   let obj = model.add('cube');

   model.animate(() => {
      server.track();
      let tq = JSON.parse(trackInfo).test;
      let m = cg.mFromQuaternion({ x:tq[3], y:tq[4], z:tq[5], w:tq[6] });
      m[12] = tq[0];
      m[13] = tq[1] + 1.5;
      m[14] = tq[2];
      obj.setMatrix(m).scale(.1);
   });
}
