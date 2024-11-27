// DEMONSTRATION OF GETTING RIGID BODY INFO FROM THE OPTITRACK
import * as global from "../global.js";
import * as cg from "../render/core/cg.js";

let TRACK_ITEMS = ["1","2","3","4","5"];

// Only work with left hand coords!!!
let findAngle = (x,z) => {
   let angle = Math.atan(Math.abs(x/z));
   if (x > 0 && z > 0) angle = Math.PI - angle;
   if (x < 0 && z > 0) angle = Math.PI + angle;
   if (x < 0 && z < 0) angle = 2*Math.PI - angle;
   return angle;
}

let getObjViewPos = (headMatrix_track, headMatrix_quest, objMatrix) => {
   // Get rotation of the object
   let M = cg.mMultiply(cg.mInverse(headMatrix_track), objMatrix);
   M = cg.mMultiply(headMatrix_quest, M);

   let qx = [headMatrix_quest[0], headMatrix_quest[1], headMatrix_quest[2]];
   let qy = [headMatrix_quest[4], headMatrix_quest[5], headMatrix_quest[6]];
   let qz = [headMatrix_quest[8], headMatrix_quest[9], headMatrix_quest[10]];

   let tx = [headMatrix_track[0], headMatrix_track[1], headMatrix_track[2]];
   let ty = [headMatrix_track[4], headMatrix_track[5], headMatrix_track[6]];
   let tz = [headMatrix_track[8], headMatrix_track[9], headMatrix_track[10]];

   let dp = [objMatrix[12] - headMatrix_track[12], objMatrix[13] - headMatrix_track[13], objMatrix[14] - headMatrix_track[14]];
   let px = cg.vec2vecProj(dp, tx);
   let ax = cg.norm(px);
   if (px[0]*tx[0]<0 || px[1]*tx[1]<0 || px[2]*tx[2]<0)
      ax = -ax;

   let py = cg.vec2vecProj(dp, ty);
   let ay = cg.norm(py);
   if (py[0]*ty[0]<0 || py[1]*ty[1]<0 || py[2]*ty[2]<0)
      ay = -ay;

   let pz = cg.vec2vecProj(dp, tz);
   let az = cg.norm(pz);
   if (pz[0]*tz[0]<0 || pz[1]*tz[1]<0 || pz[2]*tz[2]<0)
      az = -az;

   let dx = cg.scale(qx, ax);
   let dy = cg.scale(qy, ay);
   let dz = cg.scale(qz, az);

   let v = [headMatrix_quest[12], headMatrix_quest[13], headMatrix_quest[14]];
   //let v = [0,0,0];
   v = cg.add(v, dx);
   v = cg.add(v, dy);
   v = cg.add(v, dz);

   M[12] = v[0];
   M[13] = v[1];
   M[14] = v[2];

   return M;
}

export const init = async model => {
   let obj = [];
   for (let i = 0; i < TRACK_ITEMS.length; i++)
      obj.push(model.add('cube').scale(0.004));

   model.animate(() => {
      server.track();

      if (trackInfo.length == 0) {
         console.log(window.timeStamp);
         return;
      }

      let info = cg.unpack(trackInfo, -2, 2);

      // 7 number transform information from trio and unity, left hand coord
      let q = [parseFloat(info[7]), parseFloat(info[8]), parseFloat(info[9]), parseFloat(info[10]), parseFloat(info[11]), parseFloat(info[12]), parseFloat(info[13])];
      let quaternion = {x:-q[3],y:-q[4],z:q[5],w:q[6]};
      let M_head = cg.mFromQuaternion(quaternion);
      M_head[12] = q[0];
      M_head[13] = q[1];
      // you want to flip to z
      M_head[14] = -q[2];


      // example using object id:4
      let q_4 = [parseFloat(info[21]), parseFloat(info[22]), parseFloat(info[23]), parseFloat(info[24]), parseFloat(info[25]), parseFloat(info[26]), parseFloat(info[27])];
      let M_4 = cg.mFromQuaternion({x:-q_4[3],y:-q_4[4],z:q_4[5],w:q_4[6]});
      M_4[12] = q_4[0];
      M_4[13] = q_4[1];
      M_4[14] = -q_4[2];

      let headMatrix = cg.mMultiply(clay.inverseRootMatrix,
         cg.mix(clay.root().inverseViewMatrix(0),
                clay.root().inverseViewMatrix(1), .5));

      //console.log([headMatrix[12],headMatrix[13],headMatrix[14]]);
      let M = getObjViewPos(M_head, headMatrix, M_4);

      obj[3].setMatrix(M).scale(0.1);

      //let headMatrix = clay.views[0].viewMatrix;

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
      console.log(y);*/

      /*clay.root().setMatrix(worldCoords);
      global.gltfRoot.matrix = worldCoords;
      let inverseWorldCoords = cg.mInverse(worldCoords);
      clay.inverseRootMatrix = inverseWorldCoords;*/
   });
}
