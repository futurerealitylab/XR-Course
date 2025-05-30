import * as cg from "./cg.js";                                                   // Import the CG library.          //
import { buttonState, controllerMatrix } from './controllerInput.js';            // Import the button state.        //
import { jointMatrix } from "./handtrackingInput.js";                            // Import finger joint data        //
                                                                                 //                                 //
// Finger color      0        1        2        3        4        5       6      // Fingertips show a color when    //
// Button color  unpressed    0        1        2        3        4       5      // pinched, and controller buttons //
let color = [[.48,.36,.27],[1,1,1],[1,.19,0],[1,1,0],[0,.88,0],[0,0,1],[1,0,0]]; // show a color when pressed.      //
                                                                                 //                                 //
let pinchState = {};                                                             // Previous pinch states.          //
                                                                                 //                                 //
window.clientState = {                                                           // The global clientState object   //
   button: (id,hand,b) => clientData[id] &&                                      // contains methods that let any   //
                            clientData[id][hand]                                 // client get the current state    //
                              ? clientData[id][hand][b] : null,                  // of every other client.          //
   color : i           => color[i],                                              //                                 //
   coords: id          => clientData[id] ? clientData[id].coords : null,         // button() returns true or false  //
   finger: (id,hand,i) => ! clientData[id] || ! clientData[id][hand]             // depending on whether button     //
                          ? null                                                 // b = 0,1,2,3,4,5 is pressed.     //
                          : clientState.isHand(id)                               //                                 //
                            ? clientData[id][hand].fingers                       // color(): standard button colors //
                              ? clientData[id][hand].fingers[i]                  //                                 //
                              : null                                             // coords(): world xform of client //
                            : clientData[id][hand].mat                           //                                 //
                              ? clientData[id][hand].mat.slice(12,15)            // finger(): xyz of fingertip      //
                              : null,                                            //                                 //
   hand  : (id,hand)   => clientData[id] &&                                      // hand(): xform of client's hand  //
                            clientData[id][hand]                                 //                                 //
                              ? clientData[id][hand].mat : null,                 // head(): xform of client's head  //
   head  : id          => clientData[id] ? clientData[id].head : null,           //                                 //
   isHand: id          => clientData[id] &&                                      // isHand(): is client handtracked //
                            clientData[id].left &&                               //                                 //
                              clientData[id].left.fingers ? true : false,        // isXR(): is client immersive     //
   isXR  : id          => Array.isArray(clientState.head(id)),                   //                                 //
   pinchState : (id,hand,i) => {                                                 // When you need more detailed     // 
      let P0 = pinchState[id + ',' + hand + ',' + i];                            // knowledge of pinch state, use   //
      let P1 = clientState.pinch(id,hand,i);                                     // this. It compares with previous //
      if (! P0 &&   P1) return 'press';                                          // state of this pinch, returning  //
      if (  P0 &&   P1) return 'down';                                           // one of either 'press', 'down',  //
      if (  P0 && ! P1) return 'release';                                        // 'release' or 'up', to indicate  //
                        return 'up';                                             // both state and state change.    //
   },                                                                            //                                 //
   pinch : (id,hand,i) => {                                                      // A pinch gesture is triggered    //
      let state = false;                                                         // whenever the thumb is being     //
      if (clientState.isHand(id)) {                                              // touched by another finger, and  //
         if (i < 1 || i > 6)                                                     // when i has values 1,2,3,4.      //
            return false;                                                        // If the hand is pointing with    //
         if (i == 5 || i == 6) {                                                 // the thumb pointed to the sky,   //
            let p = clientState.point(id,hand);                                  // pinch returns true when i==5.   //
            return p && (i == 5 ? p[0] < .5 : p[0] >= .5);                       // If the hand is pointing with    //
         }                                                                       // the thumb to the side, pinch    //
         let thumb  = clientState.finger(id,hand,0);                             // returns true when i==6.         //
         let finger = clientState.finger(id,hand,i);                             //                                 //
         if (! thumb || ! finger)                                                // If not handtracking, then pinch //
            return false;                                                        // returns button i-1. For example //
         let d = cg.distance(thumb, finger);                                     // if i==1 and not handtracking,   //
         state = d > 0 && d < 0.025;                                             // pinch will return true when     //
      }                                                                          // button 0 (the trigger on the    //
      else                                                                       // controller) is pressed.         //
         state = clientState.button(id,hand,i<1?0:i-1);                          //                                 //
      pinchState[id + ',' + hand + ',' + i] = state;                             // Remember previous pinch state.  //
      return state;                                                              //                                 //
   },                                                                            //                                 //
   point : (id,hand) => {                                                        // If not handtracking, point will //
      if (! clientState.isHand(id))                                              // always return null.             //
         return null;                                                            //                                 //
      let mat = clientState.hand(id,hand);                                       // If handtracking, point will     //
      if (! mat)                                                                 // return null if the hand is not  //
         return null;                                                            // making a pointing gesture.      //
      let h = cg.mTransform(mat, [0,0,0]), f = [], d = [];                       //                                 //
      for (let i = 0 ; i < 5 ; i++) {                                            // If a handtracked hand is making //
         f.push(clientState.finger(id,hand,i));                                  // a pointing gesture, point will  //
         d.push(cg.distance(h,f[i]));                                            // return an array [u,v], where    //
      }                                                                          // u indicates how much the thumb  //
      if (d[0] == 0 || d[1] < 2 * d[2])                                          // is facing upward (-1 <= u <= 1) //
         return null;                                                            // and v indicates how much the    //
      let a = cg.subtract(f[0], h);                                              // index finger is pointing up,    //
      let b = cg.subtract(f[1], h);                                              // where -1 <= v <= 1.             //
      return [ (100 * a[1] / cg.norm(a) >> 0) / 100,                             //                                 //
               (100 * b[1] / cg.norm(b) >> 0) / 100 ];                           //                                 //
   },                                                                            //                                 //
   teleport: (hand,f) => cg.mMultiply(clay.inverseRootMatrix,                    // Position of a finger in the     //
                         cg.mMultiply(cg.mTranslate(handP),                      // world, after teleport offset    // 
                                      jointMatrix[hand][f].mat)),                // has been added in.              //
}                                                                                //                                 //
window.clientData = {};                                                          // Internal shared state storage   //
                                                                                 //                                 //
let handP = [0,0,0];                                                             // Optional hand position offset   //
                                                                                 //                                 //
export function ClientStateSharing() {                                           //                                 //
   server.init('clientDataMessages', {});                                        // Initialize message passing.     //
   let lastSpeech = '', speakerID = -1, previousAudioVolume = 0;                 //                                 //
   let message = msg => {msg.id=clientID;server.send('clientDataMessages',msg);} // Add clientID to each message.   //
   this.update = () => {                                                         //                                 //
      let parseSpeech = speech => {                                              // The first client parses speech. //
         if (clientID == clients[0]) {                                           //                                 //
            let prefix = 'my name is';                                           //   Let a user choose their name. //
            if (speakerID >= 0 && speech.indexOf(prefix) == 0)                   //                                 //
               clientData[speakerID].name = speech.substring(prefix.length+1);   //                                 //
            if (window.onSpeech)                                                 //                                 //
               onSpeech(speech, speakerID);                                      //   can be defined as well.       //
         }                                                                       //                                 //
      }                                                                          //                                 //
      server.sync('clientDataMessages', msgs => {                                // Respond to messages.            //
         if (clientID == clients[0])                                             // Only the first client responds  //
            for (let id in msgs) {                                               // to messages.                    //
               let msg = msgs[id];                                               //                                 //
               if (msg.id !== undefined && ! clientData[msg.id])                 // If this is the first message    //
                  clientData[msg.id] = {name:'Guest',head:{},left:{},right:{}};  // from this client, initialize.   //
               if (msg.speaking)                                                 // If message identifies speaking  //
                  speakerID = msg.id;                                            // client, set the speakerID.      //
               else if (msg.speech)                                              // If message is actual speech,    //
                  parseSpeech(msg.speech, speakerID);                            // then parse what was just said.  //
               else if (msg.head) {                                              //                                 //
                  if (id != clientID)                                            //                                 //
                     clientData[msg.id].head = cg.unpackMatrix(msg.head);        // Set a user's head matrix.       //
               }                                                                 //                                 //
               else if (msg.coords) {                                            //                                 //
                  if (id != clientID)                                            //                                 //
                     clientData[msg.id].coords = cg.unpackMatrix(msg.coords);    // Set a user's head matrix.       //
               }                                                                 //                                 //
               else if (msg.hand) {                                              //                                 //
                  if (id != clientID) {                                          //                                 //
                     msg.mat ? clientData[msg.id][msg.hand].mat=cg.unpackMatrix(msg.mat) // Set matrix.             //
                             : clientData[msg.id][msg.hand][msg.button]=msg.state;       // Set a button state.     //
                     clientData[msg.id][msg.hand].fingers = msg.fingers;                 // Set fingertips.         //
                  }                                                              //                                 //
               }                                                                 //                                 //
            }                                                                    //                                 //
      });                                                                        //                                 //
      if (! clientData[clientID])                                                //                                 //
         clientData[clientID] = {};                                              //                                 //
      for (let hand in { left: {}, right: {} })                                  //                                 //
         for (let b = 0 ; b < 7 ; b++)                                           // Update up/down button states.   //
            if (buttonState[hand][b]) {                                          //                                 //
               let isPressed = buttonState[hand][b].pressed;                     //                                 //
               let wasPressed = clientData[clientID] &&                          //                                 //
                                  clientData[clientID][hand] &&                  //                                 //
                                    clientData[clientID][hand][b];               //                                 //
               if (wasPressed && ! isPressed || isPressed && ! wasPressed) {     //                                 //
                  message({ hand: hand, button: b, state: isPressed });          //                                 //
                  if (! clientData[clientID][hand])                              //                                 //
                     clientData[clientID][hand] = {};                            //                                 //
                  clientData[clientID][hand][b] = isPressed;                     // Set my own button state.        //
               }                                                                 //                                 //
            }                                                                    // Optionally, also update left    //
      if (speech != lastSpeech)                                                  // Whenever speech content changes //
         message({ speech: (lastSpeech = speech).trim() });                      // send new speech to all users.   //
      if (window.isXR()) {                                                       //                                 //
         let headMatrix = cg.mMultiply(clay.inverseRootMatrix,                   // If a user is immersive, then    //
                            cg.mix(clay.root().inverseViewMatrix(0),             // broadcast their input data.     //
                                   clay.root().inverseViewMatrix(1), .5));       //                                 //
         clientData[clientID].head = headMatrix;                                 // Set my head matrix immediately. //
         clientData[clientID].coords = worldCoords;                              // Set my own coords immediately.  //
         message({ head  : cg.packMatrix(headMatrix),                            //                                 //
                   coords: cg.packMatrix(worldCoords) });                        //                                 //
         for (let hand in { left: {}, right: {} }) {                             //                                 //
            let msg = { hand: hand };                                            //                                 //
            if (window.handtracking) {                                           // If handtracking, share fingers. //
               msg.mat = cg.packMatrix(clientState.teleport(hand,0));            //                                 //
               msg.fingers = [];                                                 // If the hands are teleporting,   //
               for (let f = 4 ; f < 25 ; f += 5)                                 // offset the hand and fingers.    //
                  msg.fingers.push(cg.roundVec(3,                                //                                 //
                     clientState.teleport(hand,f).slice(12,15)));                //                                 //
            }                                                                    //                                 //
            else {                                                               //                                 //
               msg.fingers = null;                                               //                                 //
               msg.mat = cg.packMatrix(                                          // If not handtracking, just share //
                           cg.mMultiply(clay.inverseRootMatrix,                  // the matrix of the controller,   //
                           cg.mMultiply(cg.mTranslate(handP),                    // translated so that it centers   //
                           cg.mMultiply(controllerMatrix[hand],                  // on its virtual ping pong ball.  //
                           cg.mMultiply(cg.mTranslate([0,-.049,-.079]),          //                                 //
                                        cg.mRotateX(-Math.PI/4))))));            //                                 //
            }                                                                    //                                 //
            if (! clientData[clientID][hand])                                    //                                 //
               clientData[clientID][hand] = {};                                  //                                 //
            clientData[clientID][hand].mat = cg.unpackMatrix(msg.mat);           // Set my hand matrix immediately. //
            clientData[clientID][hand].fingers = msg.fingers;                    // Set my finger data immediately. //
            message(msg);                                                        //                                 //
         }                                                                       //                                 //
                                                                                 //                                 //
         if (clientState.pinch(clientID, 'left' , 2) &&                          // If a client does a pinch(2)     //
             clientState.pinch(clientID, 'right', 2)) {                          // gesture with both hands, then   //
            let d = cg.distance(clientState.finger(clientID, 'left' , 1),        // teleport their hands or their   //
                                clientState.finger(clientID, 'right', 1));       // controllers away from their     //
            let m = cg.mMultiply(worldCoords, headMatrix);                       // body by the distance between    //
	    let dist = Math.max(d - .02, 0);                                     // their two forefingers or their  //
	    clay.handsWidget.setVisible(dist > 0);                               // two virtual ping pong balls.    //
            handP = cg.scale(m.slice(8,11), -5 * dist);                          //                                 //
         }                                                                       //                                 //
                                                                                 //                                 //
         if (previousAudioVolume < .1 && audioVolume >= .1)                      // Whenever a user wearing an XR   //
            message({ speaking: true });                                         // headset starts to speak, send a //
         previousAudioVolume = audioVolume;                                      // message to indicate that.       //
      }                                                                          //                                 //
      if (clientID == clients[0])                                                // The first client sends their    //
         server.broadcastGlobal('clientData');                                   // state to all other clients at   //
   }                                                                             // every animation frame.          //
}                                                                                //                                 //
