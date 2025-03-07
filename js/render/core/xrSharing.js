import * as cg from "./cg.js";                                                // Import the CG library.          //
import { buttonState } from './controllerInput.js';                           // Import the button state.        //
export function XRSharing(handle) {                                           //                                 //
   window.xrS = {};                                                           // Initialize shared state.        //
   server.init('xrI', {});                                                    // Initialize message passing.     //
   let lastSpeech = '', speakerID = -1, previousAudioVolume = 0;              //                                 //
   let message = msg => { msg.id = clientID; server.send('xrI', msg); }       // Add clientID to each message.   //
   this.update = () => {                                                      //                                 //
      let parseSpeech = (model, speech) => {                                  // The first client parses speech. //
         if (clientID == clients[0]) {                                        //                                 //
            let pre = 'my name is';                                           //   Let a user choose their name. //
            if (speakerID >= 0 && speech.indexOf(pre) == 0)                   //                                 //
               xrS[speakerID].name = speech.substring(pre.length+1);          //                                 //
            if (handle && handle.parseSpeech)                                 //   More optional speech parsing  //
               handle.parseSpeech(speech);                                    //   can be defined by the caller. //
         }                                                                    //                                 //
      }                                                                       //                                 //
      server.sync('xrI', msgs => {                                            // Respond to messages.            //
         if (clientID == clients[0])                                          // Only the first client responds  //
            for (let id in msgs) {                                            // to messages.                    //
               let msg = msgs[id];                                            //                                 //
               if (msg.id !== undefined && ! xrS[msg.id])                     // If this is the first message    //
                  xrS[msg.id] = { name:'Guest', head:{}, left:{}, right:{} }; // from this client, initialize.   //
                    if (msg.speaking) speakerID = msg.id;                     // Set the current speaker ID.     //
               else if (msg.speech) parseSpeech(model, msg.speech);           // Parse what was just said.       //
               else if (msg.head) xrS[msg.id].head = msg.head;                // Set a user's head matrix.       //
               else if (msg.hand) xrS[msg.id][msg.hand][msg.button]=msg.state;// Controller button event.        //
            }                                                                 //                                 //
      });                                                                     //                                 //
      for (let hand in { left: {}, right: {} })                               //                                 //
         for (let b = 0 ; b < 6 ; b++) {                                      // Update up/down button states.   //
	    if (! buttonState[hand][b]) continue;                             //                                 //
            if (! (xrS[clientID] && xrS[clientID][hand][b]) && buttonState[hand][b].pressed)                     //
               message({ hand: hand, button: b, state: true });               //                                 //
            if ((xrS[clientID] && xrS[clientID][hand][b]) && ! buttonState[hand][b].pressed)                     //
               message({ hand: hand, button: b, state: false });              //                                 //
         }                                                                    //                                 //
      if (speech != lastSpeech)                                               // Whenever the content of speech  //
         message({ speech: (lastSpeech = speech).trim() });                   // changes, send the new speech.   //
      let hm = cg.mMultiply(clay.inverseRootMatrix,                           // If a user is wearing an XR      //
                            cg.mix(clay.root().inverseViewMatrix(0),          // headset, then broadcast their   //
                                   clay.root().inverseViewMatrix(1), .5));    // head position to all other      //
      if (hm[0]!=1 || hm[1]!=0 || hm[2]!=0) {                                 // users, to show this user's name //
         message({ head: cg.packMatrix(hm) });                                // over each user's head.          //
         if (previousAudioVolume < .1 && audioVolume >= .1)                   // Whenever a user wearing an XR   //
            message({ speaking: true });                                      // headset starts to speak, send a //
         previousAudioVolume = audioVolume;                                   // message saying that this is the //
      }                                                                       //                                 //
      if (clientID == clients[0])                                             // The first client sends their    //
         server.broadcastGlobal('xrS');                                       // state to all other clients.     //
   }                                                                          //                                 //
}                                                                             //                                 //
