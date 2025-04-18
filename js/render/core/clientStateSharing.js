import * as cg from "./cg.js";                                                   // Import the CG library.          //
import { buttonState, controllerMatrix } from './controllerInput.js';            // Import the button state.        //
import { jointMatrix } from "./handtrackingInput.js";                            // Import finger joint data        //
                                                                                 // Import the CG library.          //
window.clientState = {
   button: (id,hand,i) => clientData[id] &&
                            clientData[id][hand]
                              ? clientData[id][hand][i] : null,
   finger: (id,hand,i) => {
      if (! clientData[id] || ! clientData[id][hand])
         return null;
      if (window.handtracking)
         return clientData[id][hand].fingers
                  ? clientData[id][hand].fingers[i] : null;
      return clientData[id][hand].mat
               ? clientData[id][hand].mat.slice(12,15) : null;
   },
   hand  : (id,hand)   => clientData[id] &&
                            clientData[id][hand]
                              ? clientData[id][hand].mat : null,
   head  : id          => clientData[id] ? clientData[id].head : null,
   isXR  : id          => {
      let hm = clientState.head(id);
      return Array.isArray(hm) && (hm[0]!=1 || hm[1]!=0 || hm[2]!=0);
   },
   pinch : (id,hand,i) => {
      if (window.handtracking) {
	 let thumb  = clientState.finger(id,hand,0);
         let finger = clientState.finger(id,hand,i);
	 if (! thumb || ! finger)
	    return false;
         let d = cg.distance(thumb, finger);
         return d > 0 && d < 0.025;
      }
      else
         return clientState.button(id,hand,i<1?0:i-1);
   },
}
window.clientData = {};

export function ClientStateSharing() {                                           //                                 //
   server.init('clientDataMessages', {});                                        // Initialize message passing.     //
   let lastSpeech = '', speakerID = -1, previousAudioVolume = 0;                 //                                 //
   let message = msg => {msg.id=clientID;server.send('clientDataMessages',msg);} // Add clientID to each message.   //
   let handP = [0,0,0];                                                          // Optional hand position offset   //
   this.update = () => {                                                         //                                 //
      let parseSpeech = speech => {                                              // The first client parses speech. //
         if (clientID == clients[0]) {                                           //                                 //
            let prefix = 'my name is';                                           //   Let a user choose their name. //
            if (speakerID >= 0 && speech.indexOf(prefix) == 0)                   //                                 //
               clientData[speakerID].name = speech.substring(prefix.length+1);   //                                 //
            if (window.onSpeech)
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
               else if (msg.head)                                                //                                 //
                  clientData[msg.id].head = cg.unpackMatrix(msg.head);           // Set a user's head matrix.       //
               else if (msg.hand) {                                              //                                 //
                  msg.mat                                                        // Hand or controller events:      //
                    ? clientData[msg.id][msg.hand].mat=cg.unpackMatrix(msg.mat)  //    Set matrix.                  //
                    : clientData[msg.id][msg.hand][msg.button]=msg.state;        //    Set a button state.          //
                  if (msg.fingers)                                               //    If handtracking:             //
                     clientData[msg.id][msg.hand].fingers = msg.fingers;         //       Set fingertip positions.  //
               }                                                                 //                                 //
            }                                                                    //                                 //
      });                                                                        //                                 //
      for (let hand in { left: {}, right: {} })                                  //                                 //
         for (let b = 0 ; b < 6 ; b++) {                                         // Update up/down button states.   //
            if (! buttonState[hand][b]) continue;                                //                                 //
            if (! (clientData[clientID] && clientData[clientID][hand][b]) && buttonState[hand][b].pressed)        //
               message({ hand: hand, button: b, state: true });                  //                                 //
            if ((clientData[clientID] && clientData[clientID][hand][b]) && ! buttonState[hand][b].pressed)        //
               message({ hand: hand, button: b, state: false });                 //                                 //
         }                                                                       // Optionally, also update left    //
      if (speech != lastSpeech)                                                  // Whenever the content of speech  //
         message({ speech: (lastSpeech = speech).trim() });                      // changes, send the new speech.   //
      let hm = cg.mMultiply(clay.inverseRootMatrix,                              // If a user is wearing an XR      //
                            cg.mix(clay.root().inverseViewMatrix(0),             // headset, then broadcast their   //
                                   clay.root().inverseViewMatrix(1), .5));       // head position to all other      //
      if (hm[0]!=1 || hm[1]!=0 || hm[2]!=0) {                                    // users, to show this user's name //
         message({ head: cg.packMatrix(hm) });                                   // over each user's head.          //
         for (let hand in { left: {}, right: {} }) {                             // Optionally share hand data:     //
            let msg = { hand: hand };                                            //                                 //
            if (window.handtracking) {                                           // If handtracking, share both the //
               msg.mat = cg.packMatrix(jointMatrix[hand][0].mat);                // hand matrix and the positions   //
               msg.fingers = [];                                                 // of the hand's five fingertips.  //
               for (let f = 4 ; f < 25 ; f += 5) {                               //                                 //
                  let m = cg.mMultiply(clay.inverseRootMatrix,                   //                                 //
                          cg.mMultiply(cg.mTranslate(handP),jointMatrix[hand][f].mat));                             //
                  msg.fingers.push(cg.roundVec(3, cg.mTransform(m, [0,0,-.01])));//                                 //
               }                                                                 //                                 //
            }                                                                    //                                 //
            else                                                                 //                                 //
               msg.mat = cg.packMatrix(                                          // If not handtracking, just share //
                           cg.mMultiply(clay.inverseRootMatrix,                  // the matrix of the controller,   //
                             cg.mMultiply(cg.mMultiply(controllerMatrix[hand],   // translated so that it centers   //
                               cg.mTranslate([0,-.049,-.079])),                  // on the virtual ping pong ball.  //
                                 cg.mRotateX(-Math.PI/4))));                     //                                 //
            message(msg);                                                        //                                 //
         }                                                                       //                                 //
         if (previousAudioVolume < .1 && audioVolume >= .1)                      // Whenever a user wearing an XR   //
            message({ speaking: true });                                         // headset starts to speak, send a //
         previousAudioVolume = audioVolume;                                      // message to indicate that.       //
      }                                                                          //                                 //
      if (clientID == clients[0])                                                // The first client sends their    //
         server.broadcastGlobal('clientData');                                   // state to all other clients at   //
   }                                                                             // every animation frame.          //
}                                                                                //                                 //
