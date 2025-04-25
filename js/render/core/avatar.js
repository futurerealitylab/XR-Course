import * as cg from "./cg.js";
import { controllerMatrix } from "./controllerInput.js";
import { Vector3 } from "./ikbody/vector3.js";
import { Quaternion } from "./ikbody/quaternion.js";

window.avatarData = {};
export let avatars = [];

export let updateAvatars = model => {
   avatarData = server.synchronize('avatarData');             // FETCH AVATAR POSE DATA FROM ALL CLIENTS.
   for (let n = 0 ; n < clients.length ; n++)
      if (! avatars[clients[n]])                              // MAKE SURE THERE'S AN AVATAR FOR EVERY CLIENT.
         avatars[clients[n]] = new Avatar(model);
   avatars[clientID].update();                                // UPDATE MY AVATAR'S POSE FROM HEAD AND HANDS.
   avatarData[clientID] = avatars[clientID].packData();
   server.broadcastGlobalElement('avatarData', clientID);     // BROADCAST MY AVATAR'S POSE TO ALL CLIENTS.
   for (let n = 0 ; n < clients.length ; n++)
      avatars[clients[n]].unpackData(avatarData[clients[n]]); // UPDATE MY AVATAR DATA FROM ALL CLIENTS.
   for (let id in avatars)
      avatars[id].getRoot().scale(0);                         // SUPPRESS AVATAR DISPLAY OF INACTIVE CLIENTS.
   for (let n = 0 ; n < clients.length ; n++)
      avatars[clients[n]].getRoot().identity();               // DISPLAY AVATARS OF ACTIVE CLIENTS.
}

export function Avatar(model) {

   this.head      = () => head.getMatrix();
   this.leftHand  = () => leftHand.getMatrix();
   this.rightHand = () => rightHand.getMatrix();

   this.getRoot = () => root;

   let _showIK = 0;
   this.showIK = (show) => {_showIK = show?1:0;}

   let root      = model.add();
   let head      = root.add();
   let eyes      = root.add();
   let leftHand  = root.add();
   let rightHand = root.add();
                               let posHeadReal  = new Vector3();
                               let posWristL    = new Vector3();
                               let posWristR    = new Vector3();
                               let vecRight     = new Vector3(+1,0,0);
                               let vecLeft      = new Vector3(-1,0,0);
   let Chest     = root.add(); let posChest     = new Vector3();
   let ShoulderL = root.add(); let posShoulderL = new Vector3();
   let ShoulderR = root.add(); let posShoulderR = new Vector3();
   let ElbowL    = root.add(); 
   let ElbowR    = root.add(); 
   let FootL     = root.add(); let objFootL = new Foot();
   let FootR     = root.add(); let objFootR = new Foot();
   let FootLBound = root.add();  FootLBound.add("tubeY").color(1,0,0).opacity(.5).scale(objFootL.radMoveFoot).scale(1,.05,1);
   let FootRBound = root.add();  FootRBound.add("tubeY").color(0,0,1).opacity(.5).scale(objFootL.radMoveFoot).scale(1,.05,1);
   let linkHC    = root.add(); let lengthHC  = 0.12;
   let linkCSL   = root.add(); let lengthCSL = 0.16;
   let linkCSR   = root.add(); let lengthCSR = 0.16;
   let linkSEL   = root.add(); let lengthSEL = 0.32;
   let linkSER   = root.add(); let lengthSER = 0.32;
   let linkEWL   = root.add(); let lengthEWL = 0.32;
   let linkEWR   = root.add(); let lengthEWR = 0.32;
                               let WristMaxDist = 0.85;

   let radLnk = .04;

   let yFloor = 0;

   let posOnGround = [0,0,0];

   head.add('sphere').scale(.06).scale(1.2).flag('uAvatarHead');
/*
   head.add('cube').scale(.06).move(-.95,0,0).scale(.01,1.2,.8);
   head.add('cube').scale(.06).move( .95,0,0).scale(.01,1.2,.8);
   head.add('cube').scale(.06).move(0,-1.2,0).scale(.95,.01,.8);
   head.add('cube').scale(.06).move(0, 1.2,0).scale(.95,.01,.8);
*/

   eyes.add('tubeZ').scale(.1).move(-.32,.3,-.81).scale(.15,.15,.04).color('black').dull().flag('uAvatarEye');
   eyes.add('tubeZ').scale(.1).move( .32,.3,-.81).scale(.15,.15,.04).color('black').dull().flag('uAvatarEye');
   leftHand.add('cube').scale(.015,.02,.05).flag('uAvatarArm');
   leftHand.add('sphere').move( .01,-.04,-.08).scale(.021).color(.48,.36,.27).dull().opacity(.5);
   rightHand.add('cube').scale(.015,.02,.05).flag('uAvatarArm');
   rightHand.add('sphere').move(-.01,-.04,-.08).scale(.021).color(.48,.36,.27).dull().opacity(.5);
   
   Chest    .add('sphere').color(1,1,1).dull().flag('uAvatarBody');
   ShoulderL.add('sphere').color(1,1,1).dull().flag('uAvatarBody');
   ShoulderR.add('sphere').color(1,1,1).dull().flag('uAvatarBody');
   ElbowL   .add('sphere').color(1,1,1).dull().flag('uAvatarBody');
   ElbowR   .add('sphere').color(1,1,1).dull().flag('uAvatarBody');
   FootL    .add('cube').color(1,1,1).dull().flag('uAvatarBody').move(0,1,0);  FootL.add("cube").color(1,0,0).dull().move(0,1,-2).scale(.1,.1,2);
   FootR    .add('cube').color(1,1,1).dull().flag('uAvatarBody').move(0,1,0);  FootR.add("cube").color(0,0,1).dull().move(0,1,-2).scale(.1,.1,2);
   linkHC .add('tubeZ').color(1,1,1).dull().flag('uAvatarBody');
   linkCSL.add('tubeZ').color(1,1,1).dull().flag('uAvatarBody');
   linkCSR.add('tubeZ').color(1,1,1).dull().flag('uAvatarBody');
   linkSEL.add('tubeZ').color(1,1,1).dull().flag('uAvatarBody');
   linkSER.add('tubeZ').color(1,1,1).dull().flag('uAvatarBody');
   linkEWL.add('tubeZ').color(1,1,1).dull().flag('uAvatarBody');
   linkEWR.add('tubeZ').color(1,1,1).dull().flag('uAvatarBody');

   this.update = () => {
      head.setMatrix(cg.mMultiply(clay.inverseRootMatrix,
                                  cg.mix(clay.root().inverseViewMatrix(0),
                                         clay.root().inverseViewMatrix(1), .5)));
      eyes.setMatrix(head.getMatrix());

      leftHand .setMatrix (cg.mMultiply(clay.inverseRootMatrix, controllerMatrix.left ));
      rightHand.setMatrix(cg.mMultiply(clay.inverseRootMatrix, controllerMatrix.right));

      let headMatrix = head.getMatrix();

      let translation = [headMatrix[12], headMatrix[13], headMatrix[14]];
      let scaleX = Math.sqrt(headMatrix[0] * headMatrix[0] + headMatrix[1] * headMatrix[1] + headMatrix[2] * headMatrix[2]);
      let scaleY = Math.sqrt(headMatrix[4] * headMatrix[4] + headMatrix[5] * headMatrix[5] + headMatrix[6] * headMatrix[6]);
      let scaleZ = Math.sqrt(headMatrix[8] * headMatrix[8] + headMatrix[9] * headMatrix[9] + headMatrix[10] * headMatrix[10]);
      
      let identityRotationMatrix = [
        scaleX, 0,      0,      0,
        0,      scaleY, 0,      0,
        0,      0,      scaleZ, 0,
        translation[0], translation[1], translation[2], 1,
      ];

      this.updateIK(headMatrix, leftHand.getMatrix(), rightHand.getMatrix());
   }

   this.updateIK = (matrixHead, matrixHandL, matrixHandR) => {
      let quaternionHead  = cg.mToQuaternion(matrixHead );
      let quaternionHandL = cg.mToQuaternion(matrixHandL);
      let quaternionHandR = cg.mToQuaternion(matrixHandR);
      posHeadReal.set(matrixHead [12], matrixHead [13], matrixHead [14]).offset(0,0,.05, quaternionHead );
      posWristL  .set(matrixHandL[12], matrixHandL[13], matrixHandL[14]).offset(0,0,.05, quaternionHandL);
      posWristR  .set(matrixHandR[12], matrixHandR[13], matrixHandR[14]).offset(0,0,.05, quaternionHandR);
      posChest.copy(posHeadReal).offset(0, -lengthHC,0,quaternionHead);
      let arrPosHeadReal  = [posHeadReal .x, posHeadReal .y, posHeadReal .z];
      let arrPosWristL    = [posWristL   .x, posWristL   .y, posWristL   .z];
      let arrPosWristR    = [posWristR   .x, posWristR   .y, posWristR   .z];
      let arrPosChest     = [posChest    .x, posChest    .y, posChest    .z];

      /* Limit the distance between wrists and chest */
      if (cg.distance(arrPosWristL, arrPosChest) > WristMaxDist) {
         let vecWristL = cg.subtract(arrPosWristL, arrPosChest);
         vecWristL = cg.scale(cg.normalize(vecWristL), WristMaxDist);
         arrPosWristL = cg.add(arrPosChest, vecWristL);
      }

      if (cg.distance(arrPosWristR, arrPosChest) > WristMaxDist) {
         let vecWristR = cg.subtract(arrPosWristR, arrPosChest);
         vecWristR = cg.scale(cg.normalize(vecWristR), WristMaxDist);
         arrPosWristR = cg.add(arrPosChest, vecWristR);
      }

      vecRight.set(+1,0,0).applyQuaternion(quaternionHead);
      vecLeft .set(-1,0,0).applyQuaternion(quaternionHead);
      let arrVecRight = [vecRight.x, vecRight.y, vecRight.z];
      let arrVecLeft  = [vecLeft .x, vecLeft .y, vecLeft .z];
      let arrVecCWL   = cg.subtract(arrPosWristL, arrPosChest);
      let arrVecCWR   = cg.subtract(arrPosWristR, arrPosChest);
      let dirShoulderL = cg.normalize(cg.add(arrVecCWL, arrVecLeft));
      let dirShoulderR = cg.normalize(cg.add(arrVecCWR, arrVecRight));

      posShoulderL.copy(posChest).offset(...cg.scale(dirShoulderL, lengthCSL));
      posShoulderR.copy(posChest).offset(...cg.scale(dirShoulderR, lengthCSR));
      let arrPosShoulderL = [posShoulderL.x, posShoulderL.y, posShoulderL.z];
      let arrPosShoulderR = [posShoulderR.x, posShoulderR.y, posShoulderR.z];
      let dirUp   = cg.normalize(cg.subtract(arrPosHeadReal, arrPosChest));
      let dirDown = cg.scale(dirUp, -1);
      let dirElbowL = cg.add(dirShoulderL, cg.scale(dirDown, 2));
      let dirElbowR = cg.add(dirShoulderR, cg.scale(dirDown, 2));
      let arrPosElbowL = cg.add(arrPosShoulderL, cg.ik(lengthSEL, lengthEWL, cg.subtract(arrPosWristL,arrPosShoulderL),dirElbowL));
      let arrPosElbowR = cg.add(arrPosShoulderR, cg.ik(lengthSER, lengthEWR, cg.subtract(arrPosWristR,arrPosShoulderR),dirElbowR));

      let vecForward = new Vector3();
      vecForward.set(0,0,-1).applyQuaternion(quaternionHead);
      let arrForward = [vecForward.x, vecForward.y, vecForward.z];
      let thetaL = cg.dot(arrForward, dirShoulderL);
      let thetaR = cg.dot(arrForward, dirShoulderR);
      let distSWL = cg.distance(arrPosShoulderL, arrPosWristL);
      let distSWR = cg.distance(arrPosShoulderR, arrPosWristR);
      let showArmR = thetaR>=-.2 && distSWR>0.15;
      let showArmL = thetaL>=-.2 && distSWL>0.15;
      if (thetaR < 0 && distSWR < 0.25) showArmR = false;
      if (thetaL < 0 && distSWL < 0.25) showArmL = false;

      /* Update Feet */
      posOnGround = [matrixHead[12], yFloor, matrixHead[14]];
      objFootL.updateTargetPos(matrixHead, yFloor, quaternionHead, 0);
      objFootR.updateTargetPos(matrixHead, yFloor, quaternionHead, 1);
      if (objFootL.getState() == -1 && objFootR.getState() == -1) {
         objFootL.setState(0);
      }
      if (objFootL.getState() == 0 && objFootL.checkIfOutOfBound() && objFootR.getState() != 1) {
         objFootL.setState(1);
         objFootL.updateStartMovePos();
      }
      if (objFootR.getState() == 0 && objFootR.checkIfOutOfBound() && objFootL.getState() != 1) {
         objFootR.setState(1);
         objFootR.updateStartMovePos();
      }
      if (objFootL.getState() == 1) {objFootR.setState(0)}
      if (objFootR.getState() == 1) {objFootL.setState(0)}
      // console.log(objFootL.getState(), objFootR.getState())
      objFootL.update(model.deltaTime);
      objFootR.update(model.deltaTime);
      let arrPosFootL = objFootL.getCurrentPos();
      let arrPosFootR = objFootR.getCurrentPos();

      Chest    .identity().move(arrPosChest    ).scale(radLnk).scale(_showIK);
      ShoulderL.identity().move(arrPosShoulderL).scale(radLnk).scale(_showIK);
      ShoulderR.identity().move(arrPosShoulderR).scale(radLnk).scale(_showIK);
      ElbowL   .identity().move(arrPosElbowL   ).scale(radLnk).scale(_showIK).scale(showArmL?1:0);
      ElbowR   .identity().move(arrPosElbowR   ).scale(radLnk).scale(_showIK).scale(showArmR?1:0);
      FootL    .identity().move(arrPosFootL).turnY(objFootL.yRot).scale(.05).scale(_showIK);
      FootR    .identity().move(arrPosFootR).turnY(objFootR.yRot).scale(.05).scale(_showIK);
      FootLBound.identity().move(objFootL.getTargetPos()).scale(_showIK);
      FootRBound.identity().move(objFootR.getTargetPos()).scale(_showIK);

      linkHC .identity().move(cg.mix(arrPosHeadReal ,arrPosChest    , .5)).aimZ(cg.subtract(arrPosChest    ,arrPosHeadReal ))
            .scale(radLnk,radLnk,cg.distance(arrPosHeadReal ,arrPosChest    )/2).scale(_showIK).scale(0);
      linkCSL.identity().move(cg.mix(arrPosChest    ,arrPosShoulderL, .5)).aimZ(cg.subtract(arrPosShoulderL,arrPosChest    ))
            .scale(radLnk,radLnk,cg.distance(arrPosChest    ,arrPosShoulderL)/2).scale(_showIK);
      linkCSR.identity().move(cg.mix(arrPosChest    ,arrPosShoulderR, .5)).aimZ(cg.subtract(arrPosShoulderR,arrPosChest    ))
            .scale(radLnk,radLnk,cg.distance(arrPosChest    ,arrPosShoulderR)/2).scale(_showIK);
      linkSEL.identity().move(cg.mix(arrPosShoulderL,arrPosElbowL   , .5)).aimZ(cg.subtract(arrPosElbowL   ,arrPosShoulderL))
            .scale(radLnk,radLnk,cg.distance(arrPosShoulderL,arrPosElbowL   )/2).scale(_showIK).scale(showArmL?1:0);
      linkSER.identity().move(cg.mix(arrPosShoulderR,arrPosElbowR   , .5)).aimZ(cg.subtract(arrPosElbowR   ,arrPosShoulderR))
            .scale(radLnk,radLnk,cg.distance(arrPosShoulderR,arrPosElbowR   )/2).scale(_showIK).scale(showArmR?1:0);
      linkEWL.identity().move(cg.mix(arrPosElbowL   ,arrPosWristL   , .5)).aimZ(cg.subtract(arrPosWristL   ,arrPosElbowL   ))
            .scale(radLnk,radLnk,cg.distance(arrPosElbowL   ,arrPosWristL   )/2).scale(_showIK).scale(showArmL?1:0);
      linkEWR.identity().move(cg.mix(arrPosElbowR   ,arrPosWristR   , .5)).aimZ(cg.subtract(arrPosWristR   ,arrPosElbowR   ))
            .scale(radLnk,radLnk,cg.distance(arrPosElbowR   ,arrPosWristR   )/2).scale(_showIK).scale(showArmR?1:0);
   }

   this.packData = () => {
      return { H : cg.packMatrix(head.getMatrix()),
               L : cg.packMatrix(leftHand.getMatrix()),
               R : cg.packMatrix(rightHand.getMatrix()) };
   }

   this.unpackData = data => {
      if (data) {
         head.setMatrix     (cg.unpackMatrix(data.H));
         eyes.setMatrix     (cg.unpackMatrix(data.H));
         leftHand.setMatrix (cg.unpackMatrix(data.L));
         rightHand.setMatrix(cg.unpackMatrix(data.R));

         this.updateIK(head.getMatrix(), leftHand.getMatrix(), rightHand.getMatrix());
      }
   }

   this.getMatChest     = () => Chest.getMatrix();
   this.getMatShoulderL = () => ShoulderL.getMatrix();
   this.getMatShoulderR = () => ShoulderR.getMatrix();
   this.getMatElbowL    = () => ElbowL.getMatrix();
   this.getMatElbowR    = () => ElbowR.getMatrix();
}

function Foot () {
   this.radMoveFoot = .2;
   let speedMove = 1;
   let durationResetFoot = 2;
   let targetPos = [0,0,0];
   let currentPos = [0,0,0];
   let startMovePos = [0,0,0];
   this.yRot = 0;
   let state = 0; /* 0 = ready, 1 = moving, -1 = end moving */
   let v3TargetPos = new Vector3();

   this.updateTargetPos = (matrixHead, yFloor, qHead, isRight) => {
      let [qHx, qHy, qHz, qHw] = [qHead.x, qHead.y, qHead.z, qHead.w];
      this.yRot = Math.atan2(2 * (qHw * qHy + qHx * qHz),
                              1 - 2 * (qHx * qHx + qHy * qHy));
      let quaternionHeadYRot = new Quaternion(0, Math.sin(this.yRot / 2), 0, Math.cos(this.yRot / 2));
      v3TargetPos.set(matrixHead[12], yFloor, matrixHead[14]).offset(isRight?.1:-.1,0,0,quaternionHeadYRot);
      targetPos = v3TargetPos.toArray();
   }
   this.setTargetPos = pos => targetPos = pos;
   this.getTargetPos = () => targetPos;
   this.getCurrentPos = () => currentPos;
   this.setState = s => state = s;
   this.getState = () => state;
   this.checkIfOutOfBound = () => cg.distance(currentPos, targetPos) > this.radMoveFoot;
   this.updateStartMovePos = () => startMovePos = currentPos;
   this.update = (dt) => {
      if (state == 1) {
         let vec = cg.subtract(targetPos, currentPos);
         let dist = cg.norm(vec);
         if (dist > 0.05) {
            currentPos = cg.add(currentPos, cg.scale(cg.normalize(vec), speedMove*dt));
            let progress = cg.distance(currentPos, startMovePos) / cg.distance(startMovePos, targetPos);
            if (progress < 0.8) {
               let height = 0.05 * progress * 2;
               currentPos[1] = height + targetPos[1];
            }
         }
         else {
            currentPos = targetPos;
            state = -1;
         }
      }
   }
}

