import * as cg from "./cg.js";                                                   // Import the CG library.          //
import { buttonState, controllerMatrix } from './controllerInput.js';            // Import the button state.        //
import { jointMatrix } from "./handtrackingInput.js";                            // Import finger joint data        //
                                                                                 // Import the CG library.          //
export function XRSharing(handle) {                                              //                                 //
   window.xrS = {};                                                              // Initialize shared state.        //
   server.init('xrI', {});                                                       // Initialize message passing.     //
   let lastSpeech = '', speakerID = -1, previousAudioVolume = 0;                 //                                 //
   let message = msg => { msg.id = clientID; server.send('xrI', msg); }          // Add clientID to each message.   //
   let round = f => (1000 * f >> 0) / 1000;                                      // Round to nearest 1/1000         //
   this.setHandSharing = state => isHandSharing = cg.def(state, true);           // Toggle hand matrix sharing.     //
   let isHandSharing = false;                                                    // Default = no shared hand matrix //
   this.update = () => {                                                         //                                 //
      let parseSpeech = (model, speech) => {                                     // The first client parses speech. //
         if (clientID == clients[0]) {                                           //                                 //
            let pre = 'my name is';                                              //   Let a user choose their name. //
            if (speakerID >= 0 && speech.indexOf(pre) == 0)                      //                                 //
               xrS[speakerID].name = speech.substring(pre.length+1);             //                                 //
            if (handle && handle.parseSpeech)                                    //   More optional speech parsing  //
               handle.parseSpeech(speech, speakerID);                            //   can be defined by the caller. //
         }                                                                       //                                 //
      }                                                                          //                                 //
      server.sync('xrI', msgs => {                                               // Respond to messages.            //
         if (clientID == clients[0])                                             // Only the first client responds  //
            for (let id in msgs) {                                               // to messages.                    //
               let msg = msgs[id];                                               //                                 //
               if (msg.id !== undefined && ! xrS[msg.id])                        // If this is the first message    //
                  xrS[msg.id] = { name:'Guest', head:{}, left:{}, right:{} };    // from this client, initialize.   //
                    if (msg.speaking) speakerID = msg.id;                        // Set the current speaker ID.     //
               else if (msg.speech) parseSpeech(model, msg.speech);              // Parse what was just said.       //
               else if (msg.head) xrS[msg.id].head = msg.head;                   // Set a user's head matrix.       //
               else if (msg.hand) {                                              // Controller events:              //
	          msg.mat ? xrS[msg.id][msg.hand].mat = msg.mat                  //    Set controller matrix.       //
		          : xrS[msg.id][msg.hand][msg.button] = msg.state;       //    Set controller button.       //
                  if (msg.fingers)                                               // If handtracking:                //
		     xrS[msg.id][msg.hand].fingers = msg.fingers;                //    Set fingertip positions      //
               }                                                                 //                                 //
            }                                                                    //                                 //
      });                                                                        //                                 //
      for (let hand in { left: {}, right: {} })                                  //                                 //
         for (let b = 0 ; b < 6 ; b++) {                                         // Update up/down button states.   //
	    if (! buttonState[hand][b]) continue;                                //                                 //
            if (! (xrS[clientID] && xrS[clientID][hand][b]) && buttonState[hand][b].pressed)                        //
               message({ hand: hand, button: b, state: true });                  //                                 //
            if ((xrS[clientID] && xrS[clientID][hand][b]) && ! buttonState[hand][b].pressed)                        //
               message({ hand: hand, button: b, state: false });                 //                                 //
         }                                                                       // Optionally, also update left    //
      if (speech != lastSpeech)                                                  // Whenever the content of speech  //
         message({ speech: (lastSpeech = speech).trim() });                      // changes, send the new speech.   //
      let hm = cg.mMultiply(clay.inverseRootMatrix,                              // If a user is wearing an XR      //
                            cg.mix(clay.root().inverseViewMatrix(0),             // headset, then broadcast their   //
                                   clay.root().inverseViewMatrix(1), .5));       // head position to all other      //
      if (hm[0]!=1 || hm[1]!=0 || hm[2]!=0) {                                    // users, to show this user's name //
         message({ head: cg.packMatrix(hm) });                                   // over each user's head.          //
	 if (isHandSharing)                                                      //                                 //
            for (let hand in { left: {}, right: {} }) {                          // Optionally share hand data:     //
	       let msg = { hand: hand };                                         //                                 //
	       if (window.handtracking) {                                        // If handtracking, share both the //
	          msg.mat = cg.packMatrix(jointMatrix[0]);                       // hand matrix and the positions   //
	          msg.fingers = [];                                              // of the last joints of the five  //
		  for (let f = 4 ; f < 25 ; f += 5)                              // fingers.                        //
		     msg.fingers.push(round(cg.mMultiply(clay.inverseRootMatrix, //                                 //
		                             jointMatrix[f].mat).slice(12,15))); //                                 //
	       }                                                                 //                                 //
	       else {                                                            //                                 //
	          msg.mat = cg.packMatrix(                                       // If not handtracking, just share //
		            cg.mMultiply(clay.inverseRootMatrix,                 // the matrix of the controller.   //
	                    cg.mMultiply(cg.mMultiply(controllerMatrix[hand],    //                                 //
		            cg.mTranslate([0,-.049,-.079])),                     //                                 //
			    cg.mRotateX(-Math.PI/4))));                          //                                 //
	       }                                                                 //                                 //
	       message(msg);                                                     //                                 //
            }                                                                    //                                 //
         if (previousAudioVolume < .1 && audioVolume >= .1)                      // Whenever a user wearing an XR   //
            message({ speaking: true });                                         // headset starts to speak, send a //
         previousAudioVolume = audioVolume;                                      // message to indicate that.       //
      }                                                                          //                                 //
      if (clientID == clients[0])                                                // The first client sends their    //
         server.broadcastGlobal('xrS');                                          // state to all other clients at   //
   }                                                                             // every animation frame.          //
}                                                                                //                                 //
