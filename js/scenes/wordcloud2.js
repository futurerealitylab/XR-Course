import * as cg from "../render/core/cg.js";                                      //
import { lcb, rcb } from '../handle_scenes.js';                                  // Import the two controller beams.
import { wordatlas } from "../util/wordatlas.js";                                // Import the word atlas.
                                                                                 //
server.init('wordcloudInput', {});                                               // This API is for message passing.
window.wordcloudState = { pos : '' };                                            // This API is for sharing state
                                                                                 // between clients.
export const init = async model => {                                             //
   let N = wordatlas.length / 4;                                                 // Maintain a ray object for both
   let L = {}, R = {};                                                           // the left and right controller.
                                                                                 //
   let particles = model.add('particles').info(N).move(0,1.5,0).scale(.6)        // Create a custom mesh form for
                        .setTxtr('media/textures/wordatlas.jpg');                // this number of particles.
   let data = [];                                                                //
   for (let n = 0 ; n < N ; n++) {                                               // The wordatlas database contains
      let u  = wordatlas[4*n + 1] / 1844;                                        // the position and scale of each
      let du = wordatlas[4*n + 2] / 1844;                                        // word in the atlas.
      let v  = wordatlas[4*n + 3] / 1844;                                        //
      let dv =                37 / 1844;                                         //
      data.push({                                                                //
         p: [ Math.random()-.5, Math.random()-.5, Math.random()-.5 ],            // Initially, give each particle
         s: [ du, dv ],                                                          // a random position in a cube
         t: [ u, v, u+du, v+dv ],                                                // that is one unit in length on
      });                                                                        // each side.
   }                                                                             //
                                                                                 //
   inputEvents.onPress   = hand => (hand=='left' ? L : R).isDown = true;         // Track when a trigger is pressed
   inputEvents.onRelease = hand => (hand=='left' ? L : R).isDown = false;        // and also when it is released.
                                                                                 //
   model.animate(() => {                                                         //
      server.sync('wordcloudInput', msgs => {                                    // Respond to input messages from
         for (let id in msgs)                                                    // other clients by setting the
            data[msgs[id].i].p = cg.unpack(msgs[id].p,-1,1);                     // positions of individual tiles.
      });                                                                        //
                                                                                 //
      wordcloudState = server.synchronize('wordcloudState');                     // At every animation frame, the
      if (clientID == clients[0]) {                                              // first client sends a packed
         let pos = [];                                                           // string to all other clients
         for (let n = 0 ; n < N ; n++)                                           // that contains the location of
            pos.push(data[n].p);                                                 // every tile. This requires 2
         wordcloudState.pos = cg.pack(pos.flat(), -1, 1);                        // text characters per number, or
         server.broadcastGlobal('wordcloudState');                               // 6 text characters per tile.
      }                                                                          //
      else if (wordcloudState.pos) {                                             // All other clients receive
         let pos = cg.unpack(wordcloudState.pos, -1, 1);                         // and unpack this data string.
         for (let n = 0 ; n < N ; n++)                                           //
            for (let i = 0 ; i < 3 ; i++)                                        // Note that only the first client
               data[n].p[i] = pos[3 * n + i];                                    // is allowed to set set the
      }                                                                          // positions of word tiles.
                                                                                 //
      for (let n = 0 ; n < N ; n++) {                                            //
         let select = L.index == n || R.index == n;                              // While a tile is at a controller
         data[n].c = select ? [1,.5,.5] : [1,1,1];                               // ray, tint that tile pink and
	 data[n].s = [ wordatlas[4*n + 2] / 1844 * (select ? 1.5 : 1) ,          // display it in a larger size.
                                       37 / 1844 * (select ? 1.5 : 1) ];         //
      }                                                                          //
                                                                                 // All the tiles are in one mesh
      particles.setParticles(data);                                              // for rendering, requiring only
                                                                                 // a single draw call.
      let mesh = clay.formMesh('particles,' + particles.getInfo());              //
      if (mesh) {                                                                // Use the inverse of the object's
         let invMatrix = cg.mInverse(particles.getGlobalMatrix());               // matrix to transform the ray.
                                                                                 // This is much more efficient
         let initRay = ray => {                                                  // than using the forward matrix
            let m = (ray == L ? lcb : rcb).beamMatrix();                         // to transform every tile.
            ray.V = cg.mTransform(invMatrix, [m[12], m[13], m[14]]);             //
            ray.W = cg.mTransform(invMatrix, [-m[8],-m[9],-m[10],0]).slice(0,3); // Initialize the ray's V and W,
            ray.V = cg.add(ray.V, cg.scale(ray.W, 0.11));                        // and set the ray index to -1,
            if (! ray.isDown || ray.index < 0) {                                 // indicating that it has not yet
               ray.index = -1;                                                   // hit any tiles.
               ray.t = 1000;                                                     //
            }                                                                    //
            if (ray.isDragging = ray.index >= 0 && ray.wasDown && ray.isDown) {  // If either controller is already
               let p = cg.add(ray.V, cg.scale(ray.W, ray.t));                    // dragging a tile, then just move
               data[ray.index].p = p;                                            // that tile, and send a message
               server.send('wordcloudInput', {i:ray.index, p:cg.pack(p,-1,1)});  // the the first client to tell it
            }                                                                    // the tile's new position.
         }                                                                       //
         initRay(L);                                                             //
         initRay(R);                                                             //
                                                                                 //
         if (! L.isDragging || ! R.isDragging)                                   // If either controller is not
            for (let n = 0 ; n < mesh.length ; n += 3*16) {                      // dragging a tile, then we must
               let A = [ mesh[   n], mesh[   n+1], mesh[   n+2] ],               // find the nearest tile, if any,
                   B = [ mesh[16+n], mesh[16+n+1], mesh[16+n+2] ],               // that the controller ray hits.
                   C = [ mesh[32+n], mesh[32+n+1], mesh[32+n+2] ];               //
               let testRay = ray => {                                            // To do this, we perform a ray
                  if (! ray.isDragging) {                                        // triangle intersection with both
                     let t = cg.rayIntersectTriangle(ray.V, ray.W, A, B, C);     // of the tile's two component
                     if (t > 0 && t < ray.t) {                                   // triangles. When we are done,
                        ray.t = t;                                               // the ray will contain the index
                        ray.index = mesh.order[n / (3*16) >> 1];                 // and the distance of the nearest
                     }                                                           // tile that it intersects.
                  }                                                              //
               }                                                                 //
               testRay(L);                                                       //
               testRay(R);                                                       //
            }                                                                    //
      }                                                                          //
      L.wasDown = L.isDown;                                                      // Remember the previous trigger
      R.wasDown = R.isDown;                                                      // state for the event logic at
   });                                                                           // the next animation frame.
}                                                                                //
