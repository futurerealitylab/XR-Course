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
      worldCoords[12] = headMatrix[12] - T[0];
      worldCoords[13] = headMatrix[13] - T[1];
      worldCoords[14] = headMatrix[14] - T[2];
      
      let test1 = q[0] * q[0] + q[1] * q[1] + q[2] * q[2];
      let x = global.gltfRoot.matrix[12];
      let y = global.gltfRoot.matrix[13];
      let z = global.gltfRoot.matrix[14];
      let test2 = (headMatrix[12] - x) * (headMatrix[12] - x) + (headMatrix[13] - y) * (headMatrix[13] - y) + (headMatrix[14] - z) * (headMatrix[14] - z);
      console.log(test2);
      console.log(test1);

      /*clay.root().setMatrix(worldCoords);
      global.gltfRoot.matrix = worldCoords;
      let inverseWorldCoords = cg.mInverse(worldCoords);
      clay.inverseRootMatrix = inverseWorldCoords;*/
   });
}
