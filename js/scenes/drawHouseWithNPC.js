/*
   Some ideas for where to take this next:

   We can allow each user to create things other than houses, by
   saying other words while drawing.

   Houses could have roofs by default, and not stack. In that version,
   maybe you cannot draw where there is already a house, and if 
   you try to move a house into another house, it will not go there.

   After a house exists, maybe you can use some combination of speech
   and gesture to add things like a roof or doors or windows, etc.

   We can also add npcs to the scene, and have them walk around.
   If we add doors to the houses, and add special buildings like
   stores and churches, that will motivate the npcs to move from
   one place to another. The npcs could also have a preference for
   moving along roads and paths, and should not run into each other.
*/

import * as cg from "../render/core/cg.js";
import { NPCSystem } from "../render/core/npc/npcSystem.js";
import { G3 } from "../util/g3.js";

server.init('dhS', { d: {}, h: [], t: {}, npc: {} });

export const init = async model => {

   let types = 'house,road,roof'.split(',');

   window.onSpeech = (speech, id) => {
      if (clientState.pinch(id, 'left', 1))
         for (let n = 0 ; n < types.length ; n++)
            if (speech.indexOf(types[n]) >= 0)
               dhS.t[id] = types[n];
   }

   let isL1p = {}, isR1p = {}, L1p = {}, R1p = {};
   let isL2p = {}, isR2p = {}, L2p = {}, R2p = {};
   let np = {}, y0 = 1;

   let g3 = new G3(model, draw => {
      draw.color('#000000');
      draw.lineWidth(.003);
      for (let id in dhS.d) {
         let d = dhS.d[id];
         for (let n = 0 ; n < d.length - 1 ; n++)
            draw.line(d[n], d[n+1]);
      } 
   });
   model.add('cube').move(0,1,0).scale(.5,.001,.5).opacity(.7);

   let houses = model.add();

   let scaling = 32;
   let npcSystem = new NPCSystem(model, scaling, scaling/5, scaling, 32/scaling);
   npcSystem.initRender(model);
   npcSystem.getRootNode().move(0,1,0).move(-.5,0,-.5).scale(1/scaling);
   let matNPCSystem = npcSystem.getRootNode().getGlobalMatrix();
   let matNPCSystemInv = cg.mInverse(matNPCSystem);

   let posGlobalToLocal = (pos) => {
      if (!pos) return [0,0,0];
      return cg.mTransform(matNPCSystemInv, pos);
   }
   let localToNPCWorld = (local) => cg.scale(local, scaling/32);

   npcSystem.setTerrainVisibility(true);

   let isTerrainNeedUpdate = false;
   setTimeout(() => isTerrainNeedUpdate = true, 100); // Trigger the update after load the houses data

   // Host controls all the NPCs' movement
   if (clientID == clients[0]) {
      setInterval(() => {
         let r = Math.random;
         for (let npcId of Object.keys(npcSystem.dictNPC)) {
               let destination = [scaling*r(), 0, scaling*r()];
               dhS.npc[npcId] = cg.roundVec(3, destination);
         }
      }, 6000);
   }

   let hudFPS = new fps(model);

   model.animate(() => {
      dhS = server.synchronize('dhS');
      if (clientID == clients[0]) {
         for (let n = 0 ; n < clients.length ; n++) {
            let id = clients[n];
            if (! dhS.d[id])
               dhS.d[id] = [];
            let d = dhS.d[id];

            let isL1 = clientState.pinch (id, 'left' , 1);
            let isR1 = clientState.pinch (id, 'right', 1);
            let L1   = clientState.finger(id, 'left' , 1);
            let R1   = clientState.finger(id, 'right', 1);

            let isL2 = clientState.pinch (id, 'left' , 2);
            let isR2 = clientState.pinch (id, 'right', 2);
            let L2   = clientState.finger(id, 'left' , 2);
            let R2   = clientState.finger(id, 'right', 2);

            // Pinch with the left hand to draw with the right hand.

            if (isL1 && ! isR1 && ! isR2)
               d.push([R1[0],y0,R1[2]]);

            // When you stop drawing, your drawing is replaced by something.

            if (! isR1 && isL1p[id] && ! isL1) {

               // We are letting people specify different types of things
               // while drawing, but so far we are only creating houses.

               let type = dhS.t[id];
               delete dhS.t[id];
               if (! type)
                  type = 'house';

               switch (type) {
               case 'house':
                  let xlo = 10, zlo = 10, xhi = -10, zhi = -10;
                  for (let n = 0 ; n < d.length ; n++) {
                     xlo = Math.min(xlo, d[n][0]);
                     xhi = Math.max(xhi, d[n][0]);
                     zlo = Math.min(zlo, d[n][2]);
                     zhi = Math.max(zhi, d[n][2]);
                  }
                  dhS.d[id] = [];
                  dhS.h.push(cg.roundVec(3, [ (xlo+xhi)/2,
                                              (zlo+zhi)/2,
                                              Math.max(.02, (xhi-xlo)/2),
                                              Math.max(.02, (zhi-zlo)/2), .03 ]));
                  console.log("House Added");
                  setTimeout(() => isTerrainNeedUpdate = true, 100);
                  break;
               }
            }

            // Start pinching with your right hand to select the nearest house.

            if (! isR1p[id] && isR1 || ! isR2p[id] && isR2) {
               delete np[id];
               let dMin = 10, x = R1[0], z = R1[2];
               for (let n = 0 ; n < dhS.h.length ; n++) {
                  let h = dhS.h[n], xc = h[0], zc = h[1], xr = h[2], zr = h[3];
                  if (x > xc - xr && x < xc + xr && z > zc - zr && z < zc + zr) {
                     let d = Math.max(Math.abs(x - xc), Math.abs(z - zc));
                     if (d < dMin) {
                        dMin = d;
                        np[id] = n;
                     }
                  }
               }
            }

            // Pinch with your right index finger to move a house.

            if (isR1 && np[id] !== undefined) {
               let n = np[id];
               let h = dhS.h[n];

               if (h[0] !== R1[0] || h[1] !== R1[2]) {
                  h[0] = R1[0];
                  h[1] = R1[2];
                  console.log("House Moved");
                  isTerrainNeedUpdate = true;
               }
            }

            // Pinch with your right middle finger to vary house height.
            // If house height becomes negative, the house is deleted.

            if (isR2 && np[id] !== undefined) {
               let n = np[id];
               let h = dhS.h[n];

               if (R2[1] - R2p[id][1] !== 0) {
                  h[4] += R2[1] - R2p[id][1];
                  console.log("House Updated");
                  isTerrainNeedUpdate = true;
               }
               if (h[4] < 0) {
                  dhS.h.slice(n, 1);
                  delete np[id];
               }
            }

            // Update the terrain when R1 and R2 is not pinching.
            if (!isR1 && !isR2 && isTerrainNeedUpdate) {
               npcSystem.adaptTerrainToMeshes(houses._children, true);
               console.log("Terrain Updated")
               isTerrainNeedUpdate = false;
            }

            // Add NPC
            if (isL2p[id] && !isL2) {
               let lPos_rh = posGlobalToLocal(R1);
               dhS.npc[Date.now()] = cg.roundVec(3, localToNPCWorld(lPos_rh));
               console.log("NPC added at", ...lPos_rh);
            }

            isL1p[id] = isL1;
            isR1p[id] = isR1;
            L1p[id]   = L1;
            R1p[id]   = R1;

            isL2p[id] = isL2;
            isR2p[id] = isR2;
            L2p[id]   = L2;
            R2p[id]   = R2;
         }
         server.broadcastGlobal('dhS');
      }

      g3.update();

      // Houses created later stack on top of houses created earlier.

      while (houses.nChildren() > 0)
         houses.remove(0);
      for (let n = 0 ; n < dhS.h.length ; n++) {
         let h = dhS.h[n];
         let y = y0;
         for (let i = n-1 ; i >= 0 ; i--) {
            let hi = dhS.h[i];
            if (h[0] > hi[0]-hi[2] && h[0] < hi[0]+hi[2] &&
                h[1] > hi[1]-hi[3] && h[1] < hi[1]+hi[3])
               y += 2 * hi[4];
         }
         houses.add('cube').move(h[0],y+h[4],h[1]).scale(h[2],h[4],h[3]).opacity(.7);
      }

      /* Command the NPCs */
      for (let [npcId, npcTarget] of Object.entries(dhS.npc)) {
         let npcObj = npcSystem.getNPC(npcId);
         if (!npcObj) npcObj = npcSystem.addNPC("humanoid", npcId, true, npcTarget);
         let posCurrent = npcObj.center;
         let moveVec = cg.normalize(cg.subtract(npcTarget, posCurrent));
         npcSystem.setNPCMoveVec(npcId, moveVec);
      }

      npcSystem.update();
      hudFPS.update();
   });
}

function fps(model) {
   let f = model.add();
   let lastUpdateTime = -1;
   this.updateGap = .25;

   this.update = () => {
      f.hud().move(.5,.5,.5).scale(.5,.5,.001).color(1,0,0);
      if (model.time - lastUpdateTime > this.updateGap) {
         f.textBox(((1 / model.deltaTime)>>0)+"");
         lastUpdateTime = model.time;
      }
   }
}
