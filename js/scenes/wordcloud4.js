import * as cg from "../render/core/cg.js";                                      // Import the CG library.          //
import { buttonState } from '../render/core/controllerInput.js';                 // Import the button state.        //
import { lcb, rcb } from '../handle_scenes.js';                                  // Import the controller beams.    //
import { wordlist } from "../util/wordlist.js";                                  // Import the word atlas data.     //
                                                                                 //                                 //
window.wcS = { yaw: 0, drag: {}, head: {}, pos: '' };                            // Initialize shared state.        //
server.init('wcI', {});                                                          // Initialize message passing.     //
                                                                                 //                                 //
export const init = async model => {                                             //                                 //
                                                                                 //                                 //
   let message = msg => server.send('wcI', msg);                                 // Send messages between clients.  //
                                                                                 //                                 //
   let r = t => (1000 * t >> 0) / 1000;                                          // Truncate floating pt numbers so //
                                                                                 // messages have fewer characters. //
   let canvas = document.createElement('canvas');                                //                                 //
   let wordatlas = [];                                                           // When the scene is loaded,       //
   canvas.width = 1844;                                                          // create a canvas that will be    //
   canvas.height = canvas.width;                                                 // used to store the text of all   //
   canvas._animate = false;                                                      // the words that will be texture  //
   let context = canvas.getContext('2d');                                        // mapped onto the word tiles.     //
   context.fillStyle = 'white';                                                  //                                 //
   context.fillRect(0,0,canvas.width,canvas.height);                             //                                 //
   context.fillStyle = 'black';                                                  //                                 //
   context.font = '31px Arial';                                                  // Draw onto that canvas in order  //
   let textWidth = text => context.measureText(text).width;                      // to build the texture image that //
   let x = 8, y = 31;                                                            // contains all the word text.     //
   for (let n = 0 ; n < wordlist.length ; n++) {                                 //                                 //
      context.fillText(wordlist[n], x, y);                                       //                                 //
      let dx = textWidth(wordlist[n]) + 10;                                      //                                 //
      wordatlas.push(wordlist[n], x-2>>0, dx-5>>0, y-26>>0);                     // Also build the atlas that tells //
      x += dx;                                                                   // where to find each word in the  //
      if (x + textWidth(wordlist[n+1]) > canvas.width - 7) {                     // texture image, and the width of //
         x = 8;                                                                  // that texture tile.              //
         y += 36;                                                                //                                 //
      }                                                                          //                                 //
   }                                                                             //                                 //
                                                                                 //                                 //
   model.control('l','turn left' ,() => message({ yaw: -10 }));                  // Use 'l' and 'r' keys to rotate  //
   model.control('r','turn right',() => message({ yaw: +10 }));                  // the word cloud left and right.  //
   model.control('a','sort tiles',() => message({ sort:  1 }));                  // 'a' key sorts with a on top.    //
   model.control('n','sort tiles',() => message({ sort:  0 }));                  // 'n' key stops sorting.          //
   model.control('z','sort tiles',() => message({ sort: -1 }));                  // 'z' key sorts with z on top.    //
                                                                                 //                                 //
   let N = wordatlas.length / 4;                                                 // Maintain a ray object for both  //
   let L = { isB: [], wasB: [] };                                                // the left and right controller.  //
   let R = { isB: [], wasB: [] };                                                // the left and right controller.  //
                                                                                 //                                 //
   let speakerID = -1, previousAudioVolume = 0;                                  // Remember speaker ID.            //
   let lastSpeech = '';                                                          // Remember previous speech state. //
   let whois = {};                                                               // Keep track of name labels.      //
   let yaw = 0, sort = 0;                                                        //                                 //
   let Y = [];                                                                   //                                 //
                                                                                 //                                 //
   let particles = model.add('particles').info(N).setTxtr(canvas);               // Create a custom particles mesh. //
                                                                                 //                                 //
   let data = [];                                                                //                                 //
   for (let n = 0 ; n < N ; n++) {                                               // The wordatlas database contains //
      let u  = wordatlas[4*n + 1] / 1844;                                        // the position and scale of each  //
      let du = wordatlas[4*n + 2] / 1844;                                        // word in the atlas.              //
      let v  = wordatlas[4*n + 3] / 1844;                                        //                                 //
      let dv =                 37 / 1844;                                        //                                 //
      let x = .5, y = Math.random()-.5, z = .5;                                  // Initially, place the particles  //
      while (x*x + z*z > .25) { x = Math.random()-.5; z = Math.random()-.5; }    // randomly in a cylinder 1 meter  //
      data.push({ p: [x, y, z], t: [u, v, u+du, v+dv], });                       // high by 1 meter in diameter.    //
   }                                                                             //                                 //
                                                                                 //                                 //
   let parseSpeech = speech => {                                                 // The first client parses speech  //
      if (clientID == clients[0]) {                                              // by any user and then does:      //
         let pre = 'my name is';                                                 //                                 //
         if (speakerID >= 0 && speech.indexOf(pre) == 0)                         //   Let a user choose a name.     //
            message({ name: speech.substring(pre.length+1), id: speakerID });    //                                 //
      }                                                                          //                                 //
   }                                                                             //                                 //
                                                                                 //                                 //
   model.animate(() => {                                                         //                                 //
      if (speech != lastSpeech) {                                                // Whenever the content of speech  //
         message({ speech: speech.trim() });                                     // changes, send the new speech    //
         lastSpeech = speech;                                                    // text to the first client.       //
      }                                                                          //                                 //
                                                                                 //                                 //
      let hm = cg.mMultiply(clay.inverseRootMatrix,                              // If a user is wearing an XR      //
                            cg.mix(clay.root().inverseViewMatrix(0),             // headset, then broadcast their   //
                                   clay.root().inverseViewMatrix(1), .5));       // head position to all other      //
      let is_an_XR_client = hm[0]!=1 || hm[1]!=0 || hm[2]!=0;                    // users, so that the other users  //
      if (is_an_XR_client)                                                       // can see a floating name label   //
         message({ head: [ r(hm[12]), r(hm[13]), r(hm[14]) ], id: clientID });   // over that user's head.          //
                                                                                 //                                 //
      for (let b = 0 ; b < 6 ; b++) {                                            // Update the up/down states of    //
         L.isB[b] = buttonState.left [b].pressed;                                // all the buttons for the two     //
         R.isB[b] = buttonState.right[b].pressed;                                // controller beams.               //
      }                                                                          //                                 //
                                                                                 //                                 //
      if (L.isB[1]) message({ yaw: -1 });                                        // Pressing a side trigger turns   //
      if (R.isB[1]) message({ yaw:  1 });                                        // the cloud about the Y axis.     //
                                                                                 //                                 //
      if (! L.wasB[4] && L.isB[4]) message({ sort: -1 });                        // Holding down the A or X button  //
      if (! R.wasB[4] && R.isB[4]) message({ sort:  1 });                        // does a sort from a-z or z-a.    //
                                                                                 //                                 //
      if (L.wasB[4] && ! L.isB[4] || R.wasB[4] && ! R.isB[4])                    // Lifting up the A or X button    //
         message({ sort: 0 });                                                   // stops the sort.                 //
                                                                                 //                                 //
      yaw = .9 * yaw + .1 * wcS.yaw;                                             // Smooth out the yaw value.       //
      particles.identity().move(0,1.5,0).turnY(yaw).scale(.8);                   // Prepare to render the cloud.    //
                                                                                 //                                 //
      wcS = server.synchronize('wcS');                                           // Synchronize state betw clients. //
                                                                                 //                                 //
      if (clientID == clients[0]) {                                              // The first client controls all   //
                                                                                 // changes in word cloud state.    //
         if (sort) {                                                             //                                 //
            for (let i = 0 ; i < 100 ; i++) {                                    // Sort tiles vertically, either   //
               let a = N * Math.random() >> 0;                                   // from a to z or from z to a.     //
               let b = N * Math.random() >> 0;                                   //                                 //
               if (Y[a] == undefined && Y[b] == undefined &&                     // Do this by choosing tile pairs  //
                   wordatlas[4*a].toLowerCase() < wordatlas[4*b].toLowerCase()   // randomly and swapping their y   //
                           == sort*data[a].p[1] < sort*data[b].p[1]) {           // coordinates if they are out of  //
                  Y[a] = data[b].p[1];                                           // order, using Y[] array to store //
                  Y[b] = data[a].p[1];                                           // the destination y coordinate    //
               }                                                                 // during the swap.                //
            }                                                                    //                                 //
            for (let n = 0 ; n < N ; n++)                                        // For any pair of tiles, do this  //
               if (Y[n] !== undefined)                                           // swap continuously, moving each  //
                  switch (Math.sign(Y[n] - data[n].p[1])) {                      // tile gradually to the y coord   //
                  case  1: data[n].p[1] = Math.min(Y[n],data[n].p[1]+.01);break; // of the other tile in the pair.  //
                  case  0: delete Y[n]; break;                                   //                                 //
                  case -1: data[n].p[1] = Math.max(Y[n],data[n].p[1]-.01);break; //                                 //
                  }                                                              //                                 //
         }                                                                       //                                 //
                                                                                 //                                 //
         let pos = [];                                                           // string to all other clients     //
         for (let n = 0 ; n < N ; n++)                                           // that contains the location of   //
            pos.push(data[n].p);                                                 // every tile. This requires 2     //
         wcS.pos = cg.pack(pos.flat(), -1, 1);                                   // text characters per number, or  //
         server.broadcastGlobal('wcS');                                          // 6 text characters per tile.     //
      }                                                                          //                                 //
      else if (wcS.pos) {                                                        // All other clients receive       //
         let pos = cg.unpack(wcS.pos, -1, 1);                                    // and unpack this data string.    //
         for (let n = 0 ; n < N ; n++)                                           //                                 //
            for (let i = 0 ; i < 3 ; i++)                                        // Note that only the first client //
               data[n].p[i] = pos[3 * n + i];                                    // is allowed to set set the       //
      }                                                                          // positions of word tiles.        //
                                                                                 //                                 //
      server.sync('wcI', msgs => {                                               // Respond to messages.            //
         for (let id in msgs) {                                                  //                                 //
            let msg = msgs[id];                                                  // Messages can do various things: //
                 if (msg.head) wcS.head[msg.id] = msg.head;                      //   set a head position.          //
            else if (msg.name) whois[msg.id] && (whois[msg.id].name = msg.name); //   change a "whois" name.        //
            else if (msg.pos) data[msg.i].p = cg.unpack(msg.pos,-1,1);           //   position a tile.              //
            else if (msg.press) wcS.drag[msg.i] = 1;                             //   select a tile.                //
            else if (msg.release) delete wcS.drag[msg.i];                        //   unselect a tile.              //
            else if (msg.sort !== undefined) sort = msg.sort;                    //   trigger sorting.              //
            else if (msg.speakerID !== undefined) speakerID = msg.speakerID;     //   figure out who is talking.    //
            else if (msg.speech) parseSpeech(msg.speech);                        //   parse spoken words & phrases. //
            else if (msg.yaw) wcS.yaw = r(wcS.yaw + msg.yaw * model.deltaTime);  //   rotate the entire word cloud  //
         }                                                                       //                                 //
      });                                                                        //                                 //
                                                                                 //                                 //
      for (let n = 0 ; n < N ; n++) {                                            //                                 //
         let select = L.index == n || R.index == n || (wcS.drag && wcS.drag[n]); // by any client's controller ray, //
         data[n].c = select ? [1,.5,.5] : [1,1,1];                               // highlight that tile by tinting  //
         data[n].s = [ wordatlas[4*n + 2] / 1844 * (select ? 1.2 : .75) ,        // it pink and displaying it in a  //
                                       37 / 1844 * (select ? 1.2 : .75) ];       // larger size.                    //
      }                                                                          //                                 //
                                                                                 // All the tiles are in one mesh   //
      particles.setParticles(data);                                              // for rendering, requiring only   //
                                                                                 // a single draw call.             //
      let mesh = clay.formMesh('particles,' + particles.getInfo());              //                                 //
      if (mesh) {                                                                // Using the object's inverse      //
         let invMatrix = cg.mInverse(particles.getGlobalMatrix());               // matrix to transform the ray is  //
                                                                                 // faster than transforming tiles. //
         let initRay = ray => {                                                  //                                 //
                                                                                 //                                 //
            if (ray.index >= 0 && ! ray.wasB[0] && ray.isB[0])                   // On trigger down, send a message //
               message({ press:true, i:ray.index });                             // to highlight any selected tile. //
                                                                                 //                                 //
            if (ray.index >= 0 && ray.wasB[0] && ! ray.isB[0])                   // On trigger up, send a message   //
               message({ release:true, i:ray.index });                           // to unhighlight selected tile.   //
                                                                                 //                                 //
            let m = (ray == L ? lcb : rcb).beamMatrix();                         //                                 //
            ray.V = cg.mTransform(invMatrix, [m[12], m[13], m[14]]);             //                                 //
            ray.W = cg.mTransform(invMatrix, [-m[8],-m[9],-m[10],0]).slice(0,3); // Initialize the ray's V and W    //
            ray.V = cg.add(ray.V, cg.scale(ray.W, 0.11));                        // and set the ray index to -1,    //
            if (! ray.isB[0] || ray.index < 0) {                                 // indicating that it has not yet  //
               ray.index = -1;                                                   // hit any tiles.                  //
               ray.t = 1000;                                                     //                                 //
            }                                                                    //                                 //
                                                                                 //                                 //
            if (ray.isDragging = ray.index >= 0 && ray.wasB[0] && ray.isB[0]) {  // If either controller is already //
               let p = cg.add(ray.V, cg.scale(ray.W, ray.t));                    // dragging a tile, then just move //
               data[ray.index].p = p;                                            // that tile, and send a message   //
               message({ pos:cg.pack(p,-1,1), i:ray.index });                    // to the first client to tell it  //
            }                                                                    // the tile's new position.        //
         }                                                                       //                                 //
         initRay(L);                                                             //                                 //
         initRay(R);                                                             //                                 //
                                                                                 //                                 //
         if (! L.isDragging || ! R.isDragging)                                   // If either controller is not     //
            for (let n = 0 ; n < mesh.length ; n += 3*16) {                      // dragging a tile, then find the  //
               let A = [ mesh[   n], mesh[   n+1], mesh[   n+2] ],               // nearest tile, if any, that the  //
                   B = [ mesh[16+n], mesh[16+n+1], mesh[16+n+2] ],               // controller ray intersects.      //
                   C = [ mesh[32+n], mesh[32+n+1], mesh[32+n+2] ];               //                                 //
               let testRay = ray => {                                            // To do this, do a ray/triangle   //
                  if (! ray.isDragging) {                                        // intersection with both of the   //
                     let t = cg.rayIntersectTriangle(ray.V, ray.W, A, B, C);     // tile's two component triangles. //
                     if (t > 0 && t < ray.t) {                                   //                                 //
                        ray.t = t;                                               // When finished, the ray contains //
                        ray.index = mesh.order[n / (3*16) >> 1];                 // the index and distance of the   //
                     }                                                           // nearest tile it intersects.     //
                  }                                                              //                                 //
               }                                                                 //                                 //
               testRay(L);                                                       //                                 //
               testRay(R);                                                       //                                 //
            }                                                                    //                                 //
      }                                                                          //                                 //
                                                                                 //                                 //
      for (let b = 0 ; b < 6 ; b++) {                                            //                                 //
         L.wasB[b] = L.isB[b];                                                   // Remember previous button state. //
         R.wasB[b] = R.isB[b];                                                   //                                 //
      }                                                                          //                                 //
                                                                                 //                                 //
      for (let id in wcS.head) {                                                 // For every user in immersive     //
         let p = cg.add(wcS.head[id], [0,.3,0]);                                 // mode, display a name label over //
         if (! whois[id]) {                                                      // that user's head to identify    //
	    whois[id] = model.add().color(1,0,0);                                // that user to all other users.   //
	    whois[id].q = [0,0,0];                                               //                                 //
	    whois[id].name = 'My name';                                          // Be ready to remove any name     //
	    whois[id].count = 0;                                                 // label after it is no longer     //
         }                                                                       // associated with an active       //
         let q = whois[id].q;                                                    // immersive client.               //
         if (q[0] == p[0] && q[1] == p[1] && q[2] == p[2])                       //                                 //
	    whois[id].count++;                                                   // If a name label position has    //
         if (whois[id].count >= 10)                                              // not moved after 10 frames of    //
	    whois[id].scale(0);                                                  // animation, then assume that it  //
         else {                                                                  // is inactive and scale it to     //
	    whois[id].identity().move(p).scale(.1).textBox(whois[id].name);      // zero instead of displaying it.  //
	    whois[id].count = 0;                                                 //                                 //
         }                                                                       //                                 //
	 whois[id].q = p;                                                        //                                 //
      }                                                                          //                                 //
                                                                                 //                                 //
      if (is_an_XR_client && previousAudioVolume < .1 && audioVolume >= .1)      // Whenever a user wearing an XR   //
         message({ speakerID: clientID });                                       // headset starts to speak, send a //
      previousAudioVolume = audioVolume;                                         // message saying that this is the //
   });                                                                           // current speaker.                //
}                                                                                //                                 //
