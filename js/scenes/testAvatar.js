import { IKBody } from "../render/core/ikbody/ikbody.js";
import { ik_data } from "../render/core/ikbody/ik_data.js";
import { updateAvatars, avatars } from "../render/core/avatar.js";
import { controllerMatrix } from "../render/core/controllerInput.js";
import * as cg from "../render/core/cg.js";
import { Quaternion } from "../render/core/ikbody/quaternion.js";
import { buttonState } from "../render/core/controllerInput.js";
import { Vector3 } from "../render/core/ikbody/vector3.js";

let TAU = Math.PI * 2;

export const init = async model => {

   let yaw = 0;
   
   let movePos = { left: [0,1,0], right: [0,1,0] };

   let table = model.add("cube").color(.5,.5,.5);

   let rootIkbody = model.add();
   
//    0       1      2       3       4    5      6      7       8       9    10    11     12         13        14    15     16
// ANKLE_L ANKLE_R WRIST_R WRIST_L HEAD KNEE_L KNEE_R ELBOW_R ELBOW_L CHEST HIP_L HIP_R SHOULDER_R SHOULDER_L BELLY WAIST PELVIS
   let body = [];
   for (let i = 0; i < 17; ++i) {
      if (i < 5) {
         body.push(rootIkbody.add('cube' ).color(1,0,0)); 
      } else {
         body.push(rootIkbody.add('sphere').color(1,1,1));
      }
   }
   body[IK.HEAD   ].add('tubeZ').move(0,0,-2.5).scale(.1,.1,3).color(1,1,1);
   body[IK.ANKLE_L].add('tubeZ').move(0,0,-2.5).scale(.1,.1,3).color(1,1,0);
   body[IK.ANKLE_R].add('tubeZ').move(0,0,-2.5).scale(.1,.1,3).color(0,1,1);
   body[IK.WRIST_L].add('tubeZ').move(0,0,-2.5).scale(.1,.1,3).color(1,1,0);
   body[IK.WRIST_R].add('tubeZ').move(0,0,-2.5).scale(.1,.1,3).color(0,1,1);
   let bodyLinks = [];
   let links = [0,5, 1,6, 5,10, 10,16, 6,11, 11,16, 16,15, 15,14, 14,9, 2,7, 7,12, 12,9, 3,8, 8,13, 13,9, 9,4];
   for (let i = 0 ; i < links.length ; i += 2) {
      bodyLinks.push(rootIkbody.add('tubeZ').color(1,1,1));
   }

   let ikbody = new IKBody(ik_data);
   
   let bodySprings = [];
   for (let i = 0; i < 26; ++i) {
      bodySprings.push(rootIkbody.add('tubeZ').color(1,0,1));
   }
   
   inputEvents.onMove = hand => movePos[hand] = inputEvents.pos(hand);



   let testBody2 = model.add();
   let test2Head   = testBody2.add('cube').color(1,0,0);
   let test2HeadReal = testBody2.add('sphere').color(1,0,0); let posHeadReal = new Vector3();
   let test2WristL = testBody2.add('cube').color(1,0,0);
   let test2WristR = testBody2.add('cube').color(1,0,0);
   let test2Chest     = testBody2.add('sphere').color(1,1,1); let posChest     = new Vector3();
   let test2ShoulderL = testBody2.add('sphere').color(1,1,1); let posShoulderL = new Vector3();
   let test2ShoulderR = testBody2.add('sphere').color(1,1,1); let posShoulderR = new Vector3();
   let test2ElbowL    = testBody2.add('sphere').color(1,1,1);
   let test2ElbowR    = testBody2.add('sphere').color(1,1,1);
   let test2linkHC  = testBody2.add('tubeZ').color(1,1,1); let lengthHC  = 0.20;
   let test2linkCSL = testBody2.add('tubeZ').color(1,1,1); let lengthCSL = 0.16;
   let test2linkCSR = testBody2.add('tubeZ').color(1,1,1); let lengthCSR = 0.16;
   let test2linkSEL = testBody2.add('tubeZ').color(1,1,1); let lengthSEL = 0.30;
   let test2linkSER = testBody2.add('tubeZ').color(1,1,1); let lengthSER = 0.30;
   let test2linkEWL = testBody2.add('tubeZ').color(1,1,1); let lengthEWL = 0.30;
   let test2linkEWR = testBody2.add('tubeZ').color(1,1,1); let lengthEWR = 0.30;
   test2Head  .add('tubeZ').move(0,0,-2.5).scale(.1,.1,3).color(1,1,1);
   test2WristL.add('tubeZ').move(0,0,-2.5).scale(.1,.1,3).color(1,1,0);
   test2WristR.add('tubeZ').move(0,0,-2.5).scale(.1,.1,3).color(0,1,1);

   ///////////////////////////////////////////
   /*            Model Animation            */
   ///////////////////////////////////////////

   model.animate(() => {
      // floor.identity().scale(5, 5, 5).turnX(-TAU/4).color(.1, .1, .1);

      // /* Update Avatars */
      // updateAvatars(model);
      // if (frameCount++ == 0){
      //    for (let i = ilo ; i <= ihi ; i++){
      //       // if (i != 0) {
      //          let a = model.add().move(0,ry + .3 * i,0).scale(Math.pow(scalePower, i)).move(0,-ry, 0);
      //          for (let n in clients){
      //             a._children.push(avatars[clients[n]].getRoot());
      //          }
      //       // }
      //    }
      // }


      /* Update IK Body */
      let matrixHead = cg.mMultiply(clay.inverseRootMatrix,
                                    cg.mix(clay.root().inverseViewMatrix(0), 
                                           clay.root().inverseViewMatrix(1), .5));
      let quaternionHead = cg.mToQuaternion(matrixHead);
      let [qHx, qHy, qHz, qHw] = [quaternionHead.x, quaternionHead.y, quaternionHead.z, quaternionHead.w];
      ikbody.pos[IK.HEAD].set(matrixHead[12], matrixHead[13], matrixHead[14]);
      ikbody.qua[IK.HEAD].set(qHx, qHy, qHz, qHw);

      // ikbody.pos[IK.ANKLE_L].set(-.1,0,0);
      // ikbody.pos[IK.ANKLE_R].set( .1,0,0);
      /* Keep y rotation only of head's quaternion */
      let headYRot = Math.atan2(2 * (qHw * qHy + qHx * qHz),
                            1 - 2 * (qHx * qHx + qHy * qHy));
      let quaternionHeadYRot = new Quaternion(0, Math.sin(headYRot / 2), 0, Math.cos(headYRot / 2));
      ikbody.pos[IK.ANKLE_L].set(matrixHead[12], 0, matrixHead[14]).offset(-.1,0,0,quaternionHeadYRot);
      ikbody.pos[IK.ANKLE_R].set(matrixHead[12], 0, matrixHead[14]).offset( .1,0,0,quaternionHeadYRot);
      ikbody.qua[IK.ANKLE_L].copy(quaternionHeadYRot);
      ikbody.qua[IK.ANKLE_R].copy(quaternionHeadYRot);
      
      let matrixHandL = controllerMatrix.left .length > 0 ? cg.mMultiply(clay.inverseRootMatrix, controllerMatrix.left ) : matrixHead;
      let matrixHandR = controllerMatrix.right.length > 0 ? cg.mMultiply(clay.inverseRootMatrix, controllerMatrix.right) : matrixHead;
      let quaternionHandL = cg.mToQuaternion(matrixHandL);
      let quaternionHandR = cg.mToQuaternion(matrixHandR);
      ikbody.pos[IK.WRIST_L].set(matrixHandL[12], matrixHandL[13], matrixHandL[14]);
      ikbody.pos[IK.WRIST_R].set(matrixHandR[12], matrixHandR[13], matrixHandR[14]);
      ikbody.qua[IK.WRIST_L].set(quaternionHandL.x, quaternionHandL.y, quaternionHandL.z, quaternionHandL.w);
      ikbody.qua[IK.WRIST_R].set(quaternionHandR.x, quaternionHandR.y, quaternionHandR.z, quaternionHandR.w);

      ikbody.update(0);

      let nodes = ikbody.graph.nodes;

      // console.log(nodes);

      for (let n = 0 ; n < 5 ; n++) {
         let p = ikbody.getP(n, ikbody.frame);
         let q = ikbody.getQ(n, ikbody.frame);
         body[n].identity().move(p.x, p.y, p.z).setMatrix(cg.mMultiply(body[n].getMatrix(), q.toMatrix())).scale(.05);
      }
      for (let n = 5 ; n < nodes.length ; n++) {
         let p = nodes[n].p;
         body[n].identity().move(p.x, p.y, p.z).scale(.02);
      }
      
      let getP = n => n < 5 ? ikbody.getP(n, ikbody.frame) : nodes[n].p;
      for (let i = 0 ; i < links.length ; i += 2) {
         let A = getP(links[i  ]), a = [A.x,A.y,A.z];
         let B = getP(links[i+1]), b = [B.x,B.y,B.z];
         bodyLinks[i/2].identity().move(cg.mix(a,b,.5)).aimZ(cg.subtract(b,a)).scale(.01,.01,cg.distance(a,b)/2).scale(0);
      }

      let springs = ikbody.graph.lengths;
      for (let i = 0; i < springs.length; ++i) {
         let A = getP(springs[i].i), a = [A.x,A.y,A.z];
         let B = getP(springs[i].j), b = [B.x,B.y,B.z];
         let w = springs[i].w;
         bodySprings[i].identity().move(cg.mix(a,b,.5)).aimZ(cg.subtract(b,a)).scale(.005,.005,cg.distance(a,b)/2).color(1,w,w);
      }

      if (buttonState.right[0].pressed) yaw -= model.deltaTime*2;
      if (buttonState.left [0].pressed) yaw += model.deltaTime*2;
      table.identity().move(0,0,-.7).scale(.8).turnY(yaw).scale(0);
      rootIkbody.identity().move(+.5,.8,-.7).scale(.5).turnY(yaw);



      /////* Test Body 2 */////
      posHeadReal.set(matrixHead[12], matrixHead[13], matrixHead[14]).offset(0,0,.10, quaternionHead);
      posChest.copy(posHeadReal).offset(0,-lengthHC,0,quaternionHead);
      posShoulderL.copy(posChest).offset(-lengthCSL,0,0,quaternionHead);
      posShoulderR.copy(posChest).offset( lengthCSR,0,0,quaternionHead);
      let arrPosHead = matrixHead.slice(12,15);
      let arrPosWristL = matrixHandL.slice(12,15);
      let arrPosWristR = matrixHandR.slice(12,15);
      let arrPosHeadReal = [posHeadReal.x, posHeadReal.y, posHeadReal.z];
      let arrPosChest     = [posChest.x, posChest.y, posChest.z];
      let arrPosShoulderL = [posShoulderL.x, posShoulderL.y, posShoulderL.z];
      let arrPosShoulderR = [posShoulderR.x, posShoulderR.y, posShoulderR.z];
      let arrPosElbowL = cg.add(arrPosShoulderL, cg.ik(lengthSEL, lengthEWL, cg.subtract(arrPosWristL,arrPosShoulderL),[0,-1,0]));
      let arrPosElbowR = cg.add(arrPosShoulderR, cg.ik(lengthSER, lengthEWR, cg.subtract(arrPosWristR,arrPosShoulderR),[0,-1,0]));

      testBody2.identity().move(-.5,.8,-.7).scale(.5).turnY(yaw);
      test2Head  .setMatrix(matrixHead ).scale(.05);
      test2WristL.setMatrix(matrixHandL).scale(.05);
      test2WristR.setMatrix(matrixHandR).scale(.05);
      test2HeadReal.setMatrix(matrixHead ).move(0,0,.10).scale(.075, .10, .075);
      test2Chest.identity().move(arrPosChest).scale(.02);
      test2ShoulderL.identity().move(arrPosShoulderL).scale(.02);
      test2ShoulderR.identity().move(arrPosShoulderR).scale(.02);
      test2ElbowL   .identity().move(arrPosElbowL   ).scale(.02);
      test2ElbowR   .identity().move(arrPosElbowR   ).scale(.02);

      test2linkHC.identity().move(cg.mix(arrPosHeadReal, arrPosChest, .5)).aimZ(cg.subtract(arrPosChest,arrPosHeadReal)).scale(.01,.01,cg.distance(arrPosHeadReal,arrPosChest)/2);
      test2linkCSL.identity().move(cg.mix(arrPosChest, arrPosShoulderL, .5)).aimZ(cg.subtract(arrPosShoulderL,arrPosChest)).scale(.01,.01,cg.distance(arrPosChest,arrPosShoulderL)/2);
      test2linkCSR.identity().move(cg.mix(arrPosChest, arrPosShoulderR, .5)).aimZ(cg.subtract(arrPosShoulderR,arrPosChest)).scale(.01,.01,cg.distance(arrPosChest,arrPosShoulderR)/2);
      test2linkSEL.identity().move(cg.mix(arrPosShoulderL, arrPosElbowL, .5)).aimZ(cg.subtract(arrPosElbowL,arrPosShoulderL)).scale(.01,.01,cg.distance(arrPosShoulderL,arrPosElbowL)/2);
      test2linkSER.identity().move(cg.mix(arrPosShoulderR, arrPosElbowR, .5)).aimZ(cg.subtract(arrPosElbowR,arrPosShoulderR)).scale(.01,.01,cg.distance(arrPosShoulderR,arrPosElbowR)/2);
      test2linkEWL.identity().move(cg.mix(arrPosElbowL, arrPosWristL, .5)).aimZ(cg.subtract(arrPosWristL,arrPosElbowL)).scale(.01,.01,cg.distance(arrPosElbowL,arrPosWristL)/2);
      test2linkEWR.identity().move(cg.mix(arrPosElbowR, arrPosWristR, .5)).aimZ(cg.subtract(arrPosWristR,arrPosElbowR)).scale(.01,.01,cg.distance(arrPosElbowR,arrPosWristR)/2);
   });
}