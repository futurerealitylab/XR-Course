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
   head.add('cube' ).scale(.1).scale(.95,1.2,.8);
   eyes.add('tubeZ').scale(.1).move(-.42,.3,-.81).scale(.2,.2,.01).color('black').dull();
   eyes.add('tubeZ').scale(.1).move( .42,.3,-.81).scale(.2,.2,.01).color('black').dull();
   leftHand.add('cube').scale(.015,.02,.05);
   leftHand.add('sphere').move( .01,-.04,-.08).scale(.02).color(.48,.36,.27).dull();
   rightHand.add('cube').scale(.015,.02,.05);
   rightHand.add('sphere').move(-.01,-.04,-.08).scale(.02).color(.48,.36,.27).dull();

   this.update = () => {
      head.setMatrix(cg.mMultiply(clay.inverseRootMatrix,
                                  cg.mix(clay.root().inverseViewMatrix(0),
                                         clay.root().inverseViewMatrix(1), .5)));
      eyes.setMatrix(head.getMatrix());

      leftHand .setMatrix (cg.mMultiply(clay.inverseRootMatrix, controllerMatrix.left ));
      rightHand.setMatrix(cg.mMultiply(clay.inverseRootMatrix, controllerMatrix.right));
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

