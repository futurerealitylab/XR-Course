// DEMONSTRATION OF ALIGNING THE XR WORLD WITH THE REAL WORLD USING OPTITRACK DATA

import * as cg from "../render/core/cg.js";

let TRACK_ITEMS = ["1","2","3","4"];

export const init = async model => {
   let obj = [];
   for (let i = 0; i < TRACK_ITEMS.length; i++)
      obj.push(model.add('cube'));

   model.animate(() => {
      server.track();

      if (trackInfo.length == 0) {
         console.log(window.timeStamp);
         return;
      }

      // Step 1: Get user's pose from Optitrack
      let info = cg.unpack(trackInfo, -2, 2);
      let tq = [];
      for (let i = 0; i < 7; i++) {
         tq.push(parseFloat(info[i]));
      }
      let P_real = [tq[0], tq[1], tq[2]];
      let R_real_quat = { x: tq[3], y: tq[4], z: tq[5], w: tq[6] };
      let R_real = cg.mFromQuaternion(R_real_quat);

      // Step 2: Get user's pose from XR headset
      let headsetPose = model.getHeadsetPose();
      if (!headsetPose) {
         console.log("Headset pose not available");
         return;
      }
      let P_xr = headsetPose.position;
      let R_xr = cg.mFromQuaternion(headsetPose.orientation);

      // Step 3: Compute the offset transformation
      let M_real = cg.mIdentity();
      M_real = cg.mMultiply(M_real, R_real);
      M_real[12] = P_real[0];
      M_real[13] = P_real[1];
      M_real[14] = P_real[2];

      let M_xr = cg.mIdentity();
      M_xr = cg.mMultiply(M_xr, R_xr);
      M_xr[12] = P_xr[0];
      M_xr[13] = P_xr[1];
      M_xr[14] = P_xr[2];

      let M_xr_inv = cg.mInverse(M_xr);
      let T = cg.mMultiply(M_real, M_xr_inv);

      // Step 4: Apply the transformation to the XR world
      model.setMatrix(T);

      // Transform the objects according to Optitrack data
      for (let i = 0; i < TRACK_ITEMS.length; i++) {
         let index = i * 7;
         let tq = [
            parseFloat(info[index]),
            parseFloat(info[index+1]),
            parseFloat(info[index+2]),
            parseFloat(info[index+3]),
            parseFloat(info[index+4]),
            parseFloat(info[index+5]),
            parseFloat(info[index+6])
         ];
         let m = cg.mFromQuaternion({ x:tq[3], y:tq[4], z:tq[5], w:tq[6] });
         m[12] = tq[0];
         m[13] = tq[1];
         m[14] = tq[2];
         obj[i].setMatrix(m).scale(.1);      
      }
   });
}