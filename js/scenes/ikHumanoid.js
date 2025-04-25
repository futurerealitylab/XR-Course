import { buttonState, controllerMatrix, joyStickState } from "../render/core/controllerInput.js";
import { NPCSystem } from "../render/core/npc.js";
import * as cg from "../render/core/cg.js";
import { lcb, rcb } from '../handle_scenes.js';

let TAU = Math.PI * 2;

export const init = async model => {
   let lastButtonState = structuredClone(buttonState);
   let transitionStartTime = -100;
   let transitionDuration = 1;
   let getTransProg = () => clamp((model.time - transitionStartTime) / transitionDuration);
   
   /* Initialize the NPC System */
   let npcSystem = new NPCSystem(model, 16, 12, 16, 2);
   npcSystem.initRender(model);
   npcSystem.getRootNode().move(0,.5,-.5).scale(.1).move(-8,0,-8);


   let human = npcSystem.addNPC("humanoid", "human");
   
   let n_rootNPCs = npcSystem.getNPCsRootNode();
   
   let hitPosL = model.add("square").color(1,0,0);
   let hitPosR = model.add("square").color(0,0,1);

   let targetFootL = model.add("sphere12").color(0,0,1).opacity(.5).scale(.1,.1,.1);
   let targetFootR = model.add("sphere12").color(0,1,0).opacity(.5).scale(.1,.1,.1);

   /* Object in this list will shape the terrain system */
   let listObject = [];
   listObject.push(
      model.add("sphere12").color(1,.3,0).opacity(.5).move(0,.4,0).scale(.1).move(-4,0,-4).scale(2),
      // model.add("tube12"  ).color(0,1,0).opacity(.5).move(0,.5,0).scale(.1).move(0,0,.1).scale(2),
      model.add("cube"    ).color(1,.3,0).opacity(.5).move(0,.5,0).scale(.1).move(5,0,-6).scale(2,1,2).turnY(1),
   );

   n_rootNPCs.add("square").color(.1,.1,.1).scale(8,1,8).move(1,-.01,1).turnX(-TAU/4);

   /* Update the terrain to adapt to the meshes */
   npcSystem.adaptTerrainToMeshes(listObject);
   
   let hudFPS = new fps(model);

   let L = {}, R = {};

   model.animate(() => {
      hudFPS.update();

      if (buttonState.right[4].pressed - lastButtonState.right[4].pressed == 1
          && getTransProg()>= 1) {
         npcSystem.setTerrainVisibility(!npcSystem.terrainVisible);
      }

      hitPosL.scale(0);
      hitPosR.scale(0);
      
      let leftHitPosLocal = null;

      if (buttonState.left[0].pressed) {
         getIntersect(npcSystem.n_rootTerrain, "_NPCTerrain", L, lcb);
         if (L.isHit) {
            hitPosL.identity().move(L.globalPositionHit).move(0,.01,0).scale(.01).turnX(-TAU/4);
            leftHitPosLocal = L.positionHit;
         } 
      }

      /* Humanoid is controlled by pointing to the terrain and hold right trigger */
      let moveVec = [0,0,0];
      if (buttonState.right[0].pressed) {
         getIntersect(npcSystem.n_rootTerrain, "_NPCTerrain", R, rcb);
         if (R.isHit) {
            hitPosR.identity().move(R.globalPositionHit).move(0,.01,0).scale(.01).turnX(-TAU/4);
            let localPos = human.center;
            moveVec = [R.positionHit[0]-localPos[0], 0, R.positionHit[2]-localPos[2]];
            let d = cg.norm(moveVec);
            moveVec = d > .1 ? cg.scale(moveVec,  1/d) : [0,0,0];
         } 
      }
      let lookVec = leftHitPosLocal 
               ? [leftHitPosLocal[0]-human.center[0], 0, 
                  leftHitPosLocal[2]-human.center[2]] : null;
      npcSystem.setNPCMoveVec("human", moveVec);
      npcSystem.setNPCLookVec("human", lookVec);


      targetFootL.setMatrix(n_rootNPCs.getGlobalMatrix()).move(human.targetPosFootL).scale(.2,.2,.2);
      targetFootR.setMatrix(n_rootNPCs.getGlobalMatrix()).move(human.targetPosFootR).scale(.2,.2,.2);

      /* After set all NPCs' moving vector, call update() */
      npcSystem.update();

      lastButtonState = structuredClone(buttonState);   
   });
}

function getIntersect(node, form, D, xcb) {
   let mesh = clay.formMesh(form);
   if (!mesh) return;
   let mat = node.getGlobalMatrix();
   let invMat = cg.mInverse(mat);

   let makeRay = (ray, beam) => {
      let m = beam.beamMatrix();
      ray.V = cg.mTransform(invMat, [ m[12], m[13], m[14] ]);
      ray.W = cg.normalize(cg.mTransform(mat, [ -m[8],-m[9],-m[10],0 ]).slice(0,3));

      // ray.index = -1;
      ray.tMin = 1000;
      ray.isHit = false;
   }
   makeRay(D, xcb);
   for (let n = 0; n < mesh.length; n += 1*16) {
      let A = [ mesh[   n], mesh[   n+1], mesh[   n+2] ],
          B = [ mesh[16+n], mesh[16+n+1], mesh[16+n+2] ],
          C = [ mesh[32+n], mesh[32+n+1], mesh[32+n+2] ];
            
      let testRay = ray => {
         let t = cg.rayIntersectTriangle(ray.V, ray.W, A, B, C);
         if (t > 0 && t < ray.tMin) {
            ray.tMin = t;
            ray.isHit = true;
            // ray.index = mesh.order[n / (3*16) >> 1];
         }
      }
      testRay(D);
   }

   if (D.isHit) {
      D.positionHit = cg.add(D.V, cg.scale(D.W, D.tMin));
      D.globalPositionHit = cg.mTransform(mat, D.positionHit);
   }
}


function fps(model) {
   let f = model.add();
   let lastUpdateTime = -1;
   this.updateGap = .25;

   this.update = () => {
      f.hud().move(.5,.5,0).scale(.5,.5,.001).color(1,0,0);
      if (model.time - lastUpdateTime > this.updateGap) {
         f.textBox(((1 / model.deltaTime)>>0)+"");
         lastUpdateTime = model.time;
      }
   }
}

function clamp(x, min = 0, max = 1) {
   return Math.min(max, Math.max(min, x));
}
