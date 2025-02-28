import * as cg from "../render/core/cg.js";                                      //                                 //
import { buttonState } from '../render/core/controllerInput.js';                 // Import the button state.        //
import { lcb, rcb } from '../handle_scenes.js';                                  // Import the controller beams.    //
import { wordlist } from "../util/wordlist.js";                                  // Import the word atlas data.     //
                                                                                 //                                 //
window.wordcloudState = { yaw : 0, pos : '', drag : {} };                        // Initializze shared state.       //
server.init('wordcloudInput', {});                                               // Initialize message passing.     //
                                                                                 //                                 //
export const init = async model => {                                             //                                 //
                                                                                 //                                 //
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
   model.control('l','turn left' ,()=>server.send('wordcloudInput',{yaw:-10}));  // Use 'l' and 'r' keys to rotate  //
   model.control('r','turn right',()=>server.send('wordcloudInput',{yaw:+10}));  // the word cloud left and right.  //
   model.control('a','sort tiles',()=>server.send('wordcloudInput',{sort:-1}));  // 'a' key sorts with a on top.    //
   model.control('n','sort tiles',()=>server.send('wordcloudInput',{sort: 0}));  // 'n' key stops sorting.          //
   model.control('z','sort tiles',()=>server.send('wordcloudInput',{sort: 1}));  // 'z' key sorts with z on top.    //
                                                                                 //                                 //
   let N = wordatlas.length / 4;                                                 // Maintain a ray object for both  //
   let L = { isB: [], wasB: [] };                                                // the left and right controller.  //
   let R = { isB: [], wasB: [] };                                                // the left and right controller.  //
   let yaw = 0, sort = 0;                                                        //                                 //
   let Y = [];                                                                   //                                 //
                                                                                 //                                 //
   let particles = model.add('particles').info(N).setTxtr(canvas);               // Create a custom mesh form       //
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
   let lastSpeech = '';                                                          //                                 //
                                                                                 //                                 //
   model.animate(() => {                                                         //                                 //
                                                                                 //                                 //
      if (speech != lastSpeech) {                                                // We will eventually make use of  //
         console.log(speech);                                                    // spoken text. For now we are     //
         lastSpeech = speech;                                                    // putting in the capability.      //
      }                                                                          //                                 //
                                                                                 //                                 //
      for (let b = 0 ; b < 6 ; b++) {                                            //                                 //
         L.isB[b] = buttonState.left [b].pressed;                                //                                 //
         R.isB[b] = buttonState.right[b].pressed;                                //                                 //
      }                                                                          //                                 //
                                                                                 //                                 //
      if (L.isB[1]) server.send('wordcloudInput',{yaw:-1});                      // Pressing a side trigger turns   //
      if (R.isB[1]) server.send('wordcloudInput',{yaw: 1});                      // the cloud about the Y axis.     //
                                                                                 //                                 //
      if (! L.wasB[4] && L.isB[4]) server.send('wordcloudInput',{sort:-1});      // Holding down the A or X button  //
      if (! R.wasB[4] && R.isB[4]) server.send('wordcloudInput',{sort: 1});      // does a sort from a-z or z-a.    //
                                                                                 //                                 //
      if (L.wasB[4] && ! L.isB[4] || R.wasB[4] && ! R.isB[4])                    //                                 //
         server.send('wordcloudInput',{sort:0});                                 //                                 //
                                                                                 //                                 //
      yaw = .9 * yaw + .1 * wordcloudState.yaw;                                  // Smooth out the yaw value.       //
      particles.identity().move(0,1.5,0).turnY(yaw).scale(.8);                   //                                 //
      wordcloudState = server.synchronize('wordcloudState');                     // Synchronize state betw clients. //
      if (isNaN(wordcloudState.yaw))                                             //                                 //
         wordcloudState.yaw = 0;                                                 //                                 //
      if (clientID == clients[0]) {                                              // first client sends a packed     //
                                                                                 //                                 //
         if (sort) {                                                             //                                 //
            for (let i = 0 ; i < 100 ; i++) {                                    // Sort tiles vertically, either   //
               let a = N * Math.random() >> 0;                                   // from a to z or from z to a.     //
               let b = N * Math.random() >> 0;                                   //                                 //
               if (Y[a] == undefined && Y[b] == undefined &&                     // Do this by choosing tile pairs  //
                   wordatlas[4*a] < wordatlas[4*b] ==                            // randomly and swapping their y   //
                      sort*data[a].p[1] < sort*data[b].p[1]) {                   // coordinates if they are out of  //
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
         wordcloudState.pos = cg.pack(pos.flat(), -1, 1);                        // text characters per number, or  //
         server.broadcastGlobal('wordcloudState');                               // 6 text characters per tile.     //
      }                                                                          //                                 //
      else if (wordcloudState.pos) {                                             // All other clients receive       //
         let pos = cg.unpack(wordcloudState.pos, -1, 1);                         // and unpack this data string.    //
         for (let n = 0 ; n < N ; n++)                                           //                                 //
            for (let i = 0 ; i < 3 ; i++)                                        // Note that only the first client //
               data[n].p[i] = pos[3 * n + i];                                    // is allowed to set set the       //
      }                                                                          // positions of word tiles.        //
                                                                                 //                                 //
      server.sync('wordcloudInput', msgs => {                                    // Respond to messages sent from   //
         let dt = model.deltaTime;                                               // other clients.                  //
         for (let id in msgs) {                                                  //                                 //
            let msg = msgs[id];                                                  //                                 //
            if (msg.yaw) wordcloudState.yaw = wordcloudState.yaw + msg.yaw * dt; // A message can rotate the cloud. //
            else if (msg.sort !== undefined) sort = msg.sort;                    // A message can trigger sorting.  //
            else if (msg.press) wordcloudState.drag[msg.i] = true;               // A message can select a tile.    //
            else if (msg.release) delete wordcloudState.drag[msg.i];             // A message can unselect a tile.  //
            else data[msg.i].p = cg.unpack(msg.p,-1,1);                          // A message can position a tile.  //
         }                                                                       //                                 //
      });                                                                        //                                 //
                                                                                 //                                 //
      for (let n = 0 ; n < N ; n++) {                                            // While a tile is being dragged   //
         let select = L.index == n || R.index == n || wordcloudState.drag[n];    // by any client's controller ray, //
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
               server.send('wordcloudInput', {press:true, i:ray.index});         // to highlight any selected tile. //
                                                                                 //                                 //
            if (ray.index >= 0 && ray.wasB[0] && ! ray.isB[0])                   // On trigger up, send a message   //
               server.send('wordcloudInput', {release:true, i:ray.index});       // to unhighlight selected tile.   //
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
               server.send('wordcloudInput', {i:ray.index, p:cg.pack(p,-1,1)});  // the the first client to tell it //
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
         L.wasB[b] = L.isB[b];                                                   // Remember the previous button    //
         R.wasB[b] = R.isB[b];                                                   // Remember the previous button    //
      }                                                                          //                                 //
   });                                                                           //                                 //
}                                                                                //                                 //
