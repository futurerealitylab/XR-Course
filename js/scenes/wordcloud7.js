import * as cg from "../render/core/cg.js";                                      // Import the CG library.          //
import { buttonState } from '../render/core/controllerInput.js';                 // Import the button state.        //
import { XRSharing } from '../render/core/xrSharing.js';                         // Import xr sharing.              //
import { lcb, rcb } from '../handle_scenes.js';                                  // Import the controller beams.    //
import { text } from "../util/lottery.js";                                       // Import the story text data.     //
                                                                                 //                                 //
window.w6S = { yaw: 0, drag: {}, pos: '' };                                      // Initialize shared state.        //
server.init('wcI', {});                                                          // Initialize message passing.     //
                                                                                 //                                 //
export const init = async model => {                                             //                                 //
   let xrSharing = new XRSharing(model);                                         // Use the xr Sharing library.     //
   xrSharing.setHandSharing(true);
   let message = msg => server.send('wcI', msg);                                 // Send messages between clients.  //
   let r = t => (1000 * t >> 0) / 1000;                                          // Truncate floating pt numbers.   //
   let T = text.replace(/\s+/g, ' ').trim().split(' ');                          // Turn text corpus into an array. //
                                                                                 //                                 //
   let words = [];                                                               // When the scene loads, build an  //
   let sorted = T.slice().sort();                                                // array of words from the corpus, //
   for (let n = 0 ; n < sorted.length ; n++)                                     // together with word count.       //
      if (n == 0 || sorted[n] != sorted[n-1])                                    //                                 //
         words.push({ key:sorted[n], count:1 });                                 // Sort the words into descending  //
      else                                                                       // order of word count.            //
         words[words.length-1].count++;                                          //                                 //
   words = words.sort((a,b) => b.count - a.count);                               //                                 //
                                                                                 //                                 //
   let makeSet = (N, f) => {                                                     // Create arrays of pairs and of   //
      let p = {}, q = [];                                                        // triples of consecutive words.   //
      for (let n = 0 ; n < N ; n++) {                                            //                                 //
         let key = f(n);                                                         // Count the number of each pair   //
         if (! p[key])                                                           // and each triple, and sort into  //
            p[key] = 0;                                                          // descending order of number of   //
         p[key]++;                                                               // occurances.                     //
      }                                                                          //                                 //
      for (let key in p)                                                         //                                 //
         q.push({ key:key, count:p[key] });                                      //                                 //
      return q.sort((a,b) => b.count - a.count);                                 //                                 //
   }                                                                             //                                 //
   let pairs   = makeSet(T.length-1, n => T[n]+' '+T[n+1]);                      //                                 //
   let triples = makeSet(T.length-2, n => T[n]+' '+T[n+1]+' '+T[n+2]);           //                                 //
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
   context.font = '37px Arial';                                                  // Draw onto that canvas in order  //
   let textWidth = text => context.measureText(text).width;                      // to build the texture image that //
   let x = 10, y = 31;                                                           // contains all the word text.     //
                                                                                 //                                 //
   for (let n = 0 ; n < words.length ; n++) {                                    //                                 //
      context.fillText(words[n].key, x, y);                                      //                                 //
      let dx = textWidth(words[n].key) + 11;                                     //                                 //
      wordatlas.push(words[n].key, x-3>>0, dx-3>>0, y-30>>0);                    // Also build the atlas that tells //
      x += dx;                                                                   // where to find each word in the  //
      if (n<words.length-1 && x+textWidth(words[n+1].key)>canvas.width-9) {      // texture image, and the width of //
         x = 10;                                                                 // that texture tile.              //
         y += 40;                                                                //                                 //
      }                                                                          //                                 //
   }                                                                             //                                 //
                                                                                 //                                 //
   model.control('l','turn left'  ,() => message({ yaw: -10 }));                 // Use 'l' and 'r' keys to rotate  //
   model.control('r','turn right' ,() => message({ yaw: +10 }));                 // the word cloud left and right.  //
                                                                                 //                                 //
   let N = wordatlas.length / 4;                                                 // Maintain a ray object for both  //
   let L = { isB: [], wasB: [] };                                                // the left and right controller.  //
   let R = { isB: [], wasB: [] };                                                // the left and right controller.  //
                                                                                 //                                 //
   let whois = {};                                                               // Keep track of name labels.      //
   let yaw = 0;                                                                  //                                 //
   let driftCount = 0;                                                           //                                 //
   let P = [];                                                                   //                                 //
                                                                                 //                                 //
   let wordcloud = model.add('particles').info(N).setTxtr(canvas);               // Create a custom wordcloud mesh. //
                                                                                 //                                 //
   let hands = model.add();                                                      // Prepare to show the controller  //
                                                                                 // positions and aim directions.   //
   let data = [];                                                                //                                 //
   for (let n = 0 ; n < N ; n++) {                                               // The wordatlas database contains //
      let u  = wordatlas[4*n + 1] / 1844;                                        // the position and scale of each  //
      let du = wordatlas[4*n + 2] / 1844;                                        // word in the atlas.              //
      let v  = wordatlas[4*n + 3] / 1844;                                        //                                 //
      let dv =                 40 / 1844;                                        //                                 //
      let x = .5, y = Math.random()-.5, z = .5;                                  // Initially, place the wordcloud  //
      while (x*x + z*z > .25) { x = Math.random()-.5; z = Math.random()-.5; }    // randomly in a cylinder 1 meter  //
      data.push({ p: [x, y, z], t: [u, v, u+du, v+dv], });                       // high by 1 meter in diameter.    //
   }                                                                             //                                 //
                                                                                 //                                 //
   model.animate(() => {                                                         //                                 //
                                                                                 //                                 //
      xrSharing.update();                                                        // Sync xr shared state.           //
                                                                                 //                                 //
      w6S = server.synchronize('w6S');                                           // Synchronize state betw clients. //
                                                                                 //                                 //
      for (let b = 0 ; b < 6 ; b++) {                                            // Track my button presses.        //
         L.isB[b] = buttonState.left [b].pressed;                                //                                 //
         R.isB[b] = buttonState.right[b].pressed;                                //                                 //
      }                                                                          //                                 //
                                                                                 //                                 //
      if (clientID == clients[0]) {                                              // First client controls behavior. //
         let sort  = 0;                                                          //                                 //
         let drift = 0;                                                          //                                 //
         for (let id in xrS) {                                                   // Respond to any user's buttons:  //
            let s = xrS[id];                                                     //                                 //
            if (s.left [1]) w6S.yaw -= model.deltaTime;                          //    Rotate the word cloud.       //
            if (s.right[1]) w6S.yaw += model.deltaTime;                          //                                 //
            if (s.left [4]) sort = -1;                                           //    Sort words alphabetically.   //
            if (s.right[4]) sort =  1;                                           //                                 //
            if (s.left [5]) drift = 1;                                           //    Drift words toward word      //
            if (s.right[5]) drift = 1;                                           //    pairs from the source text.  //
         }                                                                       //                                 //
                                                                                 //                                 //
         if (sort) {                                                             //                                 //
            for (let i = 0 ; i < N ; i++) {                                      // Optionally sort tiles in y,     //
               let a = N * Math.random() >> 0;                                   // from a to z or from z to a.     //
               let b = N * Math.random() >> 0;                                   //                                 //
               if (a != b && ! P[a] && ! P[b]) {                                 //                                 //
                  let A = data[a].p;                                             //                                 //
                  let B = data[b].p;                                             //                                 //
                  let D = cg.subtract(B, A);                                     //                                 //
                  if (D[1] * D[1] > D[0] * D[0] + D[2] * D[2]) {                 //                                 //
                     let wordA = wordatlas[4*a].toLowerCase();                   //                                 //
                     let wordB = wordatlas[4*b].toLowerCase();                   //                                 //
                     if (wordA < wordB == sort * A[1] < sort * B[1]) {           //                                 //
                        P[b] = { a: B, b: A, t: 0 };                             //                                 //
                        P[a] = { a: A, b: B, t: 0 };                             //                                 //
                     }                                                           //                                 //
                  }                                                              //                                 //
               }                                                                 //                                 //
            }                                                                    //                                 //
            for (let n = 0 ; n < N ; n++)                                        //                                 //
               if (P[n]) {                                                       //                                 //
                  data[n].p = cg.mix(P[n].a, P[n].b, P[n].t);                    //                                 //
                  P[n].t = Math.min(1, P[n].t + .003);                           //                                 //
                  if (P[n].t >= 1)                                               //                                 //
                     delete P[n];                                                //                                 //
               }                                                                 //                                 //
         }                                                                       //                                 //
                                                                                 //                                 //
         if (drift) {                                                            // Optionally drift words to other //
            let findWordTile = word => {                                         // words that had appeared next to //
               for (let i = 0 ; 4 * i < wordatlas.length ; i++)                  // them in the source text, by     //
                  if (wordatlas[4 * i] == word)                                  // by doing these three things:    //
                     return i;                                                   //                                 //
               return -1;                                                        //                                 //
            }                                                                    //                                 //
            for (let n = 0 ; n < pairs.length ; n++) {                           // (1) Words from the same word    //
               let pair = pairs[n].key;                                          //     pair drift together.        //
               let k = pair.indexOf(' ');                                        //                                 //
               let a = findWordTile(pair.substring(0,k));                        //                                 //
               let b = findWordTile(pair.substring(k+1));                        //                                 //
               if (a != b) {                                                     //                                 //
                  let d = cg.normalize(cg.subtract(data[a].p, data[b].p));       //                                 //
                  d = cg.scale(d, .0003);                                        //                                 //
                  data[a].p = cg.subtract(data[a].p, d);                         //                                 //
                  data[b].p = cg.add     (data[b].p, d);                         //                                 //
               }                                                                 //                                 //
            }                                                                    //                                 //
                                                                                 //                                 //
            for (let a = 0 ; a < N ; a++) {                                      // (2) Words very near each other  //
               for (let k = 0 ; k < 100 ; k++) {                                 //     repel one another.          //
                  let b = driftCount++ % N;                                      //                                 //
                  if (b != a) {                                                  //                                 //
                     let d = cg.subtract(data[a].p, data[b].p);                  //                                 //
                     d = cg.scale(d, .00003 / cg.dot(d,d));                      //                                 //
                     data[a].p = cg.add     (data[a].p, d);                      //                                 //
                     data[b].p = cg.subtract(data[b].p, d);                      //                                 //
                  }                                                              //                                 //
               }                                                                 //                                 //
            }                                                                    //                                 //
            for (let a = 0 ; a < N ; a++)                                        // (3) Scale everything down a bit //
               data[a].p = cg.scale(data[a].p, .99);                             //     to maintain cloud size.     //
         }                                                                       //                                 //
                                                                                 // Send an encoded data            //
         let pos = [];                                                           // string to all other clients     //
         for (let n = 0 ; n < N ; n++)                                           // that contains the location of   //
            pos.push(data[n].p);                                                 // every tile. This requires 2     //
         w6S.pos = cg.pack(pos.flat(), -1, 1);                                   // text characters per number, or  //
         server.broadcastGlobal('w6S');                                          // 6 text characters per tile.     //
      }                                                                          //                                 //
      else if (w6S.pos) {                                                        // All other clients receive       //
         let pos = cg.unpack(w6S.pos, -1, 1);                                    // and unpack this data string.    //
         for (let n = 0 ; n < N ; n++)                                           //                                 //
            for (let i = 0 ; i < 3 ; i++)                                        // Note that only the first client //
               data[n].p[i] = pos[3 * n + i];                                    // is allowed to set set the       //
      }                                                                          // positions of word tiles.        //
                                                                                 //                                 //
      yaw = cg.mixAngle(yaw, w6S.yaw, .1);                                       // Smooth out the yaw value.       //
      wordcloud.identity().move(0,1.5,0).turnY(yaw).scale(.8);                   // Prepare to render the cloud.    //
                                                                                 //                                 //
      server.sync('wcI', msgs => {                                               // Respond to messages.            //
         for (let id in msgs) {                                                  //                                 //
            let msg = msgs[id];                                                  // Messages can do various things: //
                 if (msg.pos) data[msg.i].p = cg.unpack(msg.pos,-1,1);           //   position a tile.              //
            else if (msg.press) w6S.drag && (w6S.drag[msg.i] = 1);               //   select a tile.                //
            else if (msg.release) delete w6S.drag[msg.i];                        //   unselect a tile.              //
            else if (msg.yaw) w6S.yaw = r(w6S.yaw + msg.yaw * model.deltaTime);  //   rotate the entire word cloud  //
         }                                                                       //                                 //
      });                                                                        //                                 //
                                                                                 //                                 //
      for (let n = 0 ; n < N ; n++) {                                            //                                 //
         let select = L.index == n || R.index == n || (w6S.drag && w6S.drag[n]); // by any client's controller ray, //
         data[n].c = select ? [1,.5,.5] : [1,1,1];                               // highlight that tile by tinting  //
         data[n].s = [ wordatlas[4*n + 2] / 1844 * (select ? 1.0 : .65) ,        // it pink and displaying it in a  //
                                       37 / 1844 * (select ? 1.0 : .65) ];       // larger size.                    //
      }                                                                          //                                 //
                                                                                 // All the tiles are in one mesh   //
      wordcloud.setParticles(data);                                              // for rendering, requiring only   //
                                                                                 // a single draw call.             //
      let mesh = clay.formMesh('particles,' + wordcloud.getInfo());              //                                 //
      if (mesh) {                                                                // Using the object's inverse      //
         let invMatrix = cg.mInverse(wordcloud.getGlobalMatrix());               // matrix to transform the ray is  //
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
         L.wasB[b] = L.isB[b];                                                   // Remember my last button state.  //
         R.wasB[b] = R.isB[b];                                                   //                                 //
      }                                                                          //                                 //
                                                                                 //                                 //
      for (let id in xrS) {                                                      // For every user wearing an XR    //
         if (! xrS[id].head)                                                     // headset:                        //
            continue;                                                            //                                 //
                                                                                 //                                 //
         if (! whois[id]) {                                                      // Use user's head loc to identify //
            whois[id] = model.add().color(0,.5,1);                               // that user to all other users.   //
            whois[id].q = [0,0,0];                                               //                                 //
            whois[id].name = 'Guest';                                            // But be ready to remove any name //
            whois[id].count = 0;                                                 // label after it is no longer in  //
         }                                                                       // use by an active client.        //
         if (xrS[id].name)                                                       //                                 //
            whois[id].name = xrS[id].name;                                       //                                 //
                                                                                 //                                 //
         let hm = cg.unpackMatrix(xrS[id].head);                                 // For a client in an XR headset,  //
         let p = cg.add(hm.slice(12,15), [0,.2,0]);                              // use their head matrix to place  //
         let q = whois[id].q;                                                    // a name label above their head.  //
         if (q[0] == p[0] && q[1] == p[1] && q[2] == p[2])                       //                                 //
            whois[id].count++;                                                   // If a name label position has    //
         if (whois[id].count >= 10)                                              // not moved after 10 frames of    //
            whois[id].scale(0);                                                  // animation, then assume that it  //
         else {                                                                  // is inactive and scale it to     //
            whois[id].identity().move(p).scale(.1).textBox(whois[id].name, .2);  // zero instead of displaying it.  //
            whois[id].count = 0;                                                 //                                 //
         }                                                                       //                                 //
         whois[id].q = p;                                                        //                                 //
      }                                                                          //                                 //
                                                                                 //                                 //
      while (hands.nChildren())                                                  // Show the position and aiming    //
         hands.remove(0);                                                        // direction of both controllers   //
      for (let id in xrS)                                                        // for every user who is wearing   //
         for (let hand in {left:{}, right:{}})                                   // an XR headset.                  //
            if (xrS[id][hand] && xrS[id][hand].mat) {                            //                                 //
	       let mat = cg.unpackMatrix(xrS[id][hand].mat);                     //                                 //
	       hands.add('coneZ').setMatrix(mat).move(0,0,-.02).scale(.005,.005,.02).turnY(Math.PI).color(1,0,0);   //
	    }                                                                    //                                 //
   });                                                                           //                                 //
}                                                                                //                                 //
