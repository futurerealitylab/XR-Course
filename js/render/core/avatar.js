import * as cg from "./cg.js";
import { controllerMatrix } from "./controllerInput.js";
import { Vector3 } from "./ikbody/vector3.js";

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
   let Chest     = root.add(); let posChest     = new Vector3();
   let ShoulderL = root.add(); let posShoulderL = new Vector3();
   let ShoulderR = root.add(); let posShoulderR = new Vector3();
   let ElbowL    = root.add(); 
   let ElbowR    = root.add(); 
   let linkHC    = root.add(); let lengthHC  = 0.20;
   let linkCSL   = root.add(); let lengthCSL = 0.16;
   let linkCSR   = root.add(); let lengthCSR = 0.16;
   let linkSEL   = root.add(); let lengthSEL = 0.37;
   let linkSER   = root.add(); let lengthSER = 0.37;
   let linkEWL   = root.add(); let lengthEWL = 0.37;
   let linkEWR   = root.add(); let lengthEWR = 0.37;

   head.add('cube').scale(.06).scale(.95,1.2,.8);
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
   
   Chest    .add('sphere').color(1,1,1).dull(); 
   ShoulderL.add('sphere').color(1,1,1).dull(); 
   ShoulderR.add('sphere').color(1,1,1).dull(); 
   ElbowL   .add('sphere').color(1,1,1).dull();
   ElbowR   .add('sphere').color(1,1,1).dull();
   linkHC .add('tubeZ').color(1,1,1).dull(); 
   linkCSL.add('tubeZ').color(1,1,1).dull(); 
   linkCSR.add('tubeZ').color(1,1,1).dull(); 
   linkSEL.add('tubeZ').color(1,1,1).dull(); 
   linkSER.add('tubeZ').color(1,1,1).dull(); 
   linkEWL.add('tubeZ').color(1,1,1).dull(); 
   linkEWR.add('tubeZ').color(1,1,1).dull(); 

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

   this.updateIK = (headMatrix, matrixHandL, matrixHandR) => {
      let quaternionHead = cg.mToQuaternion(headMatrix);
      posHeadReal.set(headMatrix[12], headMatrix[13], headMatrix[14]).offset(0,0,.10, quaternionHead);
      posChest    .copy(posHeadReal).offset(0, -lengthHC,0,quaternionHead);
      posShoulderL.copy(posChest   ).offset(-lengthCSL,0,0,quaternionHead);
      posShoulderR.copy(posChest   ).offset( lengthCSR,0,0,quaternionHead);
      let arrPosHead   = headMatrix .slice(12,15);
      let arrPosWristL = matrixHandL.slice(12,15);
      let arrPosWristR = matrixHandR.slice(12,15);
      let arrPosHeadReal  = [posHeadReal .x, posHeadReal .y, posHeadReal .z];
      let arrPosChest     = [posChest    .x, posChest    .y, posChest    .z];
      let arrPosShoulderL = [posShoulderL.x, posShoulderL.y, posShoulderL.z];
      let arrPosShoulderR = [posShoulderR.x, posShoulderR.y, posShoulderR.z];
      let arrPosElbowL = cg.add(arrPosShoulderL, cg.ik(lengthSEL, lengthEWL, cg.subtract(arrPosWristL,arrPosShoulderL),[0,-1,0]));
      let arrPosElbowR = cg.add(arrPosShoulderR, cg.ik(lengthSER, lengthEWR, cg.subtract(arrPosWristR,arrPosShoulderR),[0,-1,0]));

      Chest    .identity().move(arrPosChest    ).scale(.02).scale(_showIK);
      ShoulderL.identity().move(arrPosShoulderL).scale(.02).scale(_showIK);
      ShoulderR.identity().move(arrPosShoulderR).scale(.02).scale(_showIK);
      ElbowL   .identity().move(arrPosElbowL   ).scale(.02).scale(_showIK);
      ElbowR   .identity().move(arrPosElbowR   ).scale(.02).scale(_showIK);

      linkHC .identity().move(cg.mix(arrPosHeadReal ,arrPosChest    , .5)).aimZ(cg.subtract(arrPosChest    ,arrPosHeadReal )).scale(.01,.01,cg.distance(arrPosHeadReal ,arrPosChest    )/2).scale(_showIK);
      linkCSL.identity().move(cg.mix(arrPosChest    ,arrPosShoulderL, .5)).aimZ(cg.subtract(arrPosShoulderL,arrPosChest    )).scale(.01,.01,cg.distance(arrPosChest    ,arrPosShoulderL)/2).scale(_showIK);
      linkCSR.identity().move(cg.mix(arrPosChest    ,arrPosShoulderR, .5)).aimZ(cg.subtract(arrPosShoulderR,arrPosChest    )).scale(.01,.01,cg.distance(arrPosChest    ,arrPosShoulderR)/2).scale(_showIK);
      linkSEL.identity().move(cg.mix(arrPosShoulderL,arrPosElbowL   , .5)).aimZ(cg.subtract(arrPosElbowL   ,arrPosShoulderL)).scale(.01,.01,cg.distance(arrPosShoulderL,arrPosElbowL   )/2).scale(_showIK);
      linkSER.identity().move(cg.mix(arrPosShoulderR,arrPosElbowR   , .5)).aimZ(cg.subtract(arrPosElbowR   ,arrPosShoulderR)).scale(.01,.01,cg.distance(arrPosShoulderR,arrPosElbowR   )/2).scale(_showIK);
      linkEWL.identity().move(cg.mix(arrPosElbowL   ,arrPosWristL   , .5)).aimZ(cg.subtract(arrPosWristL   ,arrPosElbowL   )).scale(.01,.01,cg.distance(arrPosElbowL   ,arrPosWristL   )/2).scale(_showIK);
      linkEWR.identity().move(cg.mix(arrPosElbowR   ,arrPosWristR   , .5)).aimZ(cg.subtract(arrPosWristR   ,arrPosElbowR   )).scale(.01,.01,cg.distance(arrPosElbowR   ,arrPosWristR   )/2).scale(_showIK);
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

