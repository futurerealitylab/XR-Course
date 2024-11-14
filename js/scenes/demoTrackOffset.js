// DEMONSTRATION OF GETTING RIGID BODY INFO FROM THE OPTITRACK
import * as global from "../global.js";
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

      let info = cg.unpack(trackInfo, -2, 2);

      //console.log(info);

      let q = [parseFloat(info[0]), parseFloat(info[1]), parseFloat(info[2]), parseFloat(info[3]), parseFloat(info[4]), parseFloat(info[5]), parseFloat(info[6])];
      let T = cg.mFromQuaternion({ x:q[3], y:q[4], z:q[5], w:q[6] });
      
      let headMatrix = cg.mMultiply(clay.inverseRootMatrix,
                                    cg.mix(clay.root().inverseViewMatrix(0),
                                           clay.root().inverseViewMatrix(1), .5));

      let worldCoords = cg.mMultiply(T, cg.mInverse(headMatrix));
      worldCoords[12] = P_xr[0];
      worldCoords[13] = P_xr[1];
      worldCoords[14] = P_xr[2];

      clay.root().setMatrix(worldCoords);
      global.gltfRoot.matrix = worldCoords;
      inverseWorldCoords = cg.mInverse(worldCoords);
      clay.inverseRootMatrix = inverseWorldCoords;
   });
}
