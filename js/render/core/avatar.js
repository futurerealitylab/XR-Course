import * as cg from "./cg.js";
import { controllerMatrix } from "./controllerInput.js";

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

   let root      = model.add();
   let head      = root.add();
   let eyes      = root.add();
   let leftHand  = root.add();
   let rightHand = root.add();
   let body = root.add();

   body.add('cube').scale(.05).scale(.2,10,.2).move(0,-1,0).color('black');

   head.add('cube' ).scale(.06).scale(.95,1.2,.8).flag('uAvatarStroke');
   head.add('cube' ).scale(.06).scale(.95,1.2,.8).flag('uAvatarHead');

   eyes.add('tubeZ').scale(.1).move(-.42,.3,-.81).scale(.2,.2,.04).color('black').dull().flag('uAvatarEye');
   eyes.add('tubeZ').scale(.1).move( .42,.3,-.81).scale(.2,.2,.04).color('black').dull().flag('uAvatarEye');
   leftHand.add('cube').scale(.015,.02,.05).flag('uAvatarArm');
   leftHand.add('sphere').move( .01,-.04,-.08).scale(.03).color(.48,.36,.27).dull();
   rightHand.add('cube').scale(.015,.02,.05).flag('uAvatarArm');
   rightHand.add('sphere').move(-.01,-.04,-.08).scale(.03).color(.48,.36,.27).dull();

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
      
      body.setMatrix(identityRotationMatrix);
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
      }
   }
}

