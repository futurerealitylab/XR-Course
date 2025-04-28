import * as cg from "./cg.js";                                                   // Import the CG library.          //
import { buttonState, controllerMatrix } from './controllerInput.js';            // Import the button state.        //
import { jointMatrix } from "./handtrackingInput.js";                            // Import finger joint data        //
                                                                                 // Import the CG library.          //
let color = [[.48,.36,.27],[1,1,1],[1,.19,0],[1,1,0],[0,.88,0],[0,0,1],[1,0,0]]; //                                 //
                                                                                 //                                 //
window.clientState = {                                                           //                                 //
   button: (id,hand,b) => clientData[id] &&                                      // The global clientState object   //
                            clientData[id][hand]                                 // is the user's access point for  //
                              ? clientData[id][hand][b] : null,                  // obtaining the input data of all //
   color : i           => color[i],
   coords: id          => clientData[id] ? clientData[id].coords : null,         // clients.                        //
   finger: (id,hand,i) => ! clientData[id] || ! clientData[id][hand]             //                                 //
                          ? null                                                 // button returns true or false    //
                          : clientState.isHand(id)                               // depending on whether button     //
                            ? clientData[id][hand].fingers                       // b = 0,1,2,3,4 or 5 is pressed.  //
                              ? clientData[id][hand].fingers[i]                  //                                 //
			      : null                                             // coords -- world xform of client //
                            : clientData[id][hand].mat                           //                                 //
                              ? clientData[id][hand].mat.slice(12,15)            // finger -- xyz of fingertip      //
			      : null,                                            //                                 //
   hand  : (id,hand)   => clientData[id] &&                                      // hand -- xform of client's hand  //
                            clientData[id][hand]                                 //                                 //
                              ? clientData[id][hand].mat : null,                 // head -- xform of client's head  //
   head  : id          => clientData[id] ? clientData[id].head : null,           //                                 //
   isHand: id          => clientData[id] &&                                      // isHand -- is client handtracked //
                            clientData[id].left &&                               //                                 //
                              clientData[id].left.fingers ? true : false,        // isXR -- is client immersive     //
   isXR  : id          => Array.isArray(clientState.head(id)),                   //                                 //
   pinch : (id,hand,i) => {                                                      // Pinch is when the thumb is      //
      if (window.handtracking) {                                                 // touches by another finger, when //
         if (i < 1 || i > 6)                                                     // i has values 1,2,3,4.           //
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
         return d > 0 && d < 0.025;                                              // pinch will return true when     //
      }                                                                          // button 0 (the trigger on the    //
      else                                                                       // controller) is pressed.         //
         return clientState.button(id,hand,i<1?0:i-1);                           //                                 //
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
}                                                                                //                                 //
window.clientData = {};                                                          // clientData is the internally    //
                                                                                 // stored shared state object.     //
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
      if (speech != lastSpeech)                                                  // Whenever the content of speech  //
         message({ speech: (lastSpeech = speech).trim() });                      // changes, send the new speech.   //
      if (window.isXR()) {                                                       // users.                          //
         let headMatrix = cg.mMultiply(clay.inverseRootMatrix,                   // If a user is wearing an XR      //
                            cg.mix(clay.root().inverseViewMatrix(0),             // headset, then broadcast their   //
                                   clay.root().inverseViewMatrix(1), .5));       // head and hand data to all other //
         clientData[clientID].head = headMatrix;                                 //                                 //
         clientData[clientID].coords = worldCoords;                              //                                 //
         message({ head  : cg.packMatrix(headMatrix),                            //                                 //
	           coords: cg.packMatrix(worldCoords) });                        //                                 //
         for (let hand in { left: {}, right: {} }) {                             //                                 //
            let msg = { hand: hand };                                            //                                 //
            if (window.handtracking) {                                           // If handtracking, share both the //
               msg.mat = cg.packMatrix(jointMatrix[hand][0].mat);                // hand matrix and the positions   //
               msg.fingers = [];                                                 // of the hand's five fingertips.  //
               for (let f = 4 ; f < 25 ; f += 5) {                               //                                 //
                  let m = cg.mMultiply(clay.inverseRootMatrix,                   //                                 //
                          cg.mMultiply(cg.mTranslate(handP),jointMatrix[hand][f].mat));                             //
                //msg.fingers.push(cg.roundVec(3, cg.mTransform(m, [0,0,-.01])));//                                 //
                  msg.fingers.push(cg.roundVec(3, m.slice(12,15)));              //                                 //
               }                                                                 //                                 //
            }                                                                    //                                 //
            else {                                                               //                                 //
	       msg.fingers = null;                                               //                                 //
               msg.mat = cg.packMatrix(                                          // If not handtracking, just share //
                           cg.mMultiply(clay.inverseRootMatrix,                  // the matrix of the controller,   //
                             cg.mMultiply(cg.mMultiply(controllerMatrix[hand],   // translated so that it centers   //
                               cg.mTranslate([0,-.049,-.079])),                  // on the virtual ping pong ball.  //
                                 cg.mRotateX(-Math.PI/4))));                     //                                 //
            }                                                                    //                                 //
	    if (! clientData[clientID][hand])                                    //                                 //
	       clientData[clientID][hand] = {};                                  //                                 //
            clientData[clientID][hand].mat = cg.unpackMatrix(msg.mat);           // Set my own matrix immediately.  //
            clientData[clientID][hand].fingers = msg.fingers;                    // Set my own fingers immediately. //
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
