// DEMONSTRATION OF GETTING RIGID BODY INFO FROM THE OPTITRACK
import * as global from "../global.js";
import * as cg from "../render/core/cg.js";

let TRACK_ITEMS = ["1","2","3","4"];

// Only work with left hand coords!!!
let findAngle = (x,z) => {
   let angle = Math.atan(Math.abs(x/z));
   if (x > 0 && z > 0) angle = Math.PI - angle;
   if (x < 0 && z > 0) angle = Math.PI + angle;
   if (x < 0 && z < 0) angle = 2*Math.PI - angle;
   return angle;
}

export const init = async model => {
   let obj = [];
   for (let i = 0; i < TRACK_ITEMS.length; i++)
      obj.push(model.add('cube').scale(0.4));

   model.animate(() => {
      server.track();

      if (trackInfo.length == 0) {
         console.log(window.timeStamp);
         return;
      }

      let info = cg.unpack(trackInfo, -2, 2);

      let q = [parseFloat(info[7]), parseFloat(info[8]), parseFloat(info[9]), parseFloat(info[10]), parseFloat(info[11]), parseFloat(info[12]), parseFloat(info[13])];
      let quaternion = {x:-q[3],y:-q[4],z:q[5],w:[6]};
      let M_trio = cg.mFromQuaternion(quaternion);
      let headMatrix = clay.views[0].viewMatrix;
      let M = cg.mMultiply(headMatrix, cg.mInverse(M_trio));
      console.log(M);
      //console.log(info);

      /*let y1 = parseFloat(info[11]);
      let p = [parseFloat(info[7]), parseFloat(info[8]), parseFloat(info[9])]; 
      //y1 = y1*Math.PI + findAngle(p[0],p[2]);
      y1 = y1*Math.PI;

      let headMatrix = cg.mInverse(clay.views[0].viewMatrix);
      let y0 = cg.mToQuaternion(headMatrix)["y"]*Math.PI;

      let y = y0 + y1;

      let worldCoords = cg.mIdentity();

      // Calculate position
 
      //worldCoords[13] = headMatrix[13] - p[1];
      //let l = Math.sqrt(p[0]*p[0]+p[2]*p[2]);
      //worldCoords[12] = headMatrix[12] + l * Math.sin(y * Math.PI / 2);
      //worldCoords[14] = headMatrix[14] - l * Math.cos(y * Math.PI / 2);

      //console.log(worldCoords[12],worldCoords[13],worldCoords[14]);
      console.log(y);

      /*clay.root().setMatrix(worldCoords);
      global.gltfRoot.matrix = worldCoords;
      let inverseWorldCoords = cg.mInverse(worldCoords);
      clay.inverseRootMatrix = inverseWorldCoords;*/
   });
}
