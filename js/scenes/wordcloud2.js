import * as cg from "../render/core/cg.js";                                      //                                 //
import { buttonState } from '../render/core/controllerInput.js';                 // Import the button state.        //
import { lcb, rcb } from '../handle_scenes.js';                                  // Import the controller beams.    //
import { wordatlas } from "../util/wordatlas.js";                                // Import the word atlas data.     //
                                                                                 //                                 //
window.wordcloudState = { yaw : 0, pos : '' };                                   // Initializze shared state.       //
server.init('wordcloudInput', {});                                               // Initialize message passing.     //
                                                                                 //                                 //
export const init = async model => {                                             //                                 //
   model.control('l','turn left' ,()=>server.send('wordcloudInput',{yaw:-10}));  // Use 'l' and 'r' keys to rotate  //
   model.control('r','turn right',()=>server.send('wordcloudInput',{yaw:+10}));  // the word cloud left and right.  //
   model.control('a','sort tiles',()=>server.send('wordcloudInput',{sort:-1}));  //                                 //
   model.control('n','sort tiles',()=>server.send('wordcloudInput',{sort: 0}));  //                                 //
   model.control('z','sort tiles',()=>server.send('wordcloudInput',{sort: 1}));  //                                 //
                                                                                 //                                 //
   let N = wordatlas.length / 4;                                                 // Maintain a ray object for both  //
   let L = {}, R = {};                                                           // the left and right controller.  //
   let yaw = 0, sort = 0;                                                        //                                 //
   let Y = [];                                                                   //                                 //
                                                                                 //                                 //
   let particles = model.add('particles').info(N)                                // Create a custom mesh form for   //
                        .setTxtr('media/textures/wordatlas.jpg');                // this number of particles.       //
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
   inputEvents.onPress   = hand => (hand=='left' ? L : R).isDown = true;         // Track when a trigger is pressed //
   inputEvents.onRelease = hand => (hand=='left' ? L : R).isDown = false;        // and also when it is released.   //
                                                                                 //                                 //
   model.animate(() => {                                                         //                                 //
      if (buttonState.left [1].pressed) server.send('wordcloudInput',{yaw:-1});  // Pressing a side trigger turns   //
      if (buttonState.right[1].pressed) server.send('wordcloudInput',{yaw: 1});  // the cloud about the Y axis.     //
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
         for (let id in msgs) {                                                  // other clients.                  //
            let msg = msgs[id];                                                  //                                 //
	    if (msg.yaw)                                                         // A message can vary the yaw      //
	       wordcloudState.yaw = wordcloudState.yaw+msg.yaw*model.deltaTime;  // rotation angle for all clients. //
            else if (msg.sort !== undefined)
	       sort = msg.sort;
            else                                                                 //                                 //
               data[msg.i].p = cg.unpack(msg.p,-1,1);                            // A message can set the location  //
         }                                                                       // of a single tile.               //
      });                                                                        //                                 //
                                                                                 //                                 //
      for (let n = 0 ; n < N ; n++) {                                            //                                 //
         let select = L.index == n || R.index == n;                              // While a tile is at a controller //
         data[n].c = select ? [1,.5,.5] : [1,1,1];                               // ray, tint that tile pink and    //
         data[n].s = [ wordatlas[4*n + 2] / 1844 * (select ? 1.2 : .75) ,        // display it in a larger size.    //
                                       37 / 1844 * (select ? 1.2 : .75) ];       //                                 //
      }                                                                          //                                 //
                                                                                 // All the tiles are in one mesh   //
      particles.setParticles(data);                                              // for rendering, requiring only   //
                                                                                 // a single draw call.             //
      let mesh = clay.formMesh('particles,' + particles.getInfo());              //                                 //
      if (mesh) {                                                                // Use the inverse of the object's //
         let invMatrix = cg.mInverse(particles.getGlobalMatrix());               // matrix to transform the ray.    //
                                                                                 // This is much more efficient     //
         let initRay = ray => {                                                  // than using the forward matrix   //
            let m = (ray == L ? lcb : rcb).beamMatrix();                         // to transform every tile.        //
            ray.V = cg.mTransform(invMatrix, [m[12], m[13], m[14]]);             //                                 //
            ray.W = cg.mTransform(invMatrix, [-m[8],-m[9],-m[10],0]).slice(0,3); // Initialize the ray's V and W    //
            ray.V = cg.add(ray.V, cg.scale(ray.W, 0.11));                        // and set the ray index to -1,    //
            if (! ray.isDown || ray.index < 0) {                                 // indicating that it has not yet  //
               ray.index = -1;                                                   // hit any tiles.                  //
               ray.t = 1000;                                                     //                                 //
            }                                                                    //                                 //
            if (ray.isDragging = ray.index >= 0 && ray.wasDown && ray.isDown) {  // If either controller is already //
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
      L.wasDown = L.isDown;                                                      // Remember the previous trigger   //
      R.wasDown = R.isDown;                                                      // state for the event logic at    //
   });                                                                           // the next animation frame.       //
}                                                                                //                                 //
