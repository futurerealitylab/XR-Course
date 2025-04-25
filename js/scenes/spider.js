import { buttonState, controllerMatrix, joyStickState } from "../render/core/controllerInput.js";
import { NPCSystem } from "../render/core/npc/npcSystem.js";
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

   /* Get Terrain Object for further use */
   let terrainObj = npcSystem.getTerrain();

   /* Robot1 with default rendering initialization */
   let robot1 = npcSystem.addNPC("octopod", "robot1");

   /* Do not initialize default rendering for Robot2 */
   let robot2 = npcSystem.addNPC("quadruped", "robot2", false);
   
   /* Custom Rendering for Robot2 */
   let n_rootNPCs = npcSystem.getNPCsRootNode();
   let m_robot2_body = n_rootNPCs.add("sphere12").scale(0);
   let arr_m_robot2_leg1 = [];
   let arr_m_robot2_leg2 = [];
   let arr_m_robot2_knee = [];
   let arr_m_robot2_foot = [];
   for (let i=0; i<4; i++) {
      arr_m_robot2_leg1.push(n_rootNPCs.add("tubeZ8").scale(0).color(0,0,1));
      arr_m_robot2_leg2.push(n_rootNPCs.add("tubeZ8").scale(0).color(0,1,.3));
      arr_m_robot2_knee.push(n_rootNPCs.add("sphere12").scale(0));
      arr_m_robot2_foot.push(n_rootNPCs.add("sphere12").scale(0));
   }
   
   let hitPosL = model.add("square").color(1,0,0);
   let hitPosR = model.add("square").color(0,0,1);

   /* Object in this list will shape the terrain system */
   let listObject = [];
   listObject.push(
      model.add("sphere12").color(0,1,0).opacity(.5).move(0,.5,0).scale(.1).move(-4,0,-4).scale(2),
      model.add("tube12"  ).color(0,1,0).opacity(.5).move(0,.5,0).scale(.1).move(0,0,.1).scale(2),
      model.add("cube"    ).color(0,1,0).opacity(.5).move(0,.5,0).scale(.1).move(5,0,-6).scale(2,1,2).turnY(1),
   );

   n_rootNPCs.add("square").color(.4,.4,.4).scale(8,1,8).move(1,-.01,1).turnX(-TAU/4);

   /* Update the terrain to adapt to the meshes */
   npcSystem.adaptTerrainToMeshes(listObject);
   
   let hudFPS = new fps(model);

   let L = {}, R = {};

   model.animate(() => {
      hudFPS.update();

      if (buttonState.right[4].pressed - lastButtonState.right[4].pressed == 1 && getTransProg()>= 1) {
         npcSystem.setTerrainVisibility(!npcSystem.terrainVisible);
      }

      /* Custom Rendering for Robot2 */
      m_robot2_body.identity().move(robot2.getBodyPos()).scale(.4);
      for (let i=0; i<4; i++) {
         let data = robot2.getLegPartsPos(i);
         let posRoot = data.root;
         let posKnee = data.knee;
         let posFoot = data.foot;
         arr_m_robot2_knee[i].identity().move(posKnee).scale(.2);
         arr_m_robot2_foot[i].identity().move(posFoot).scale(.2);
         arr_m_robot2_leg1[i].identity().move(cg.mix(posRoot,posKnee,.5)).aimZ(cg.subtract(posRoot,posKnee)).scale(.1,.1,cg.distance(posRoot,posKnee)/2);
         arr_m_robot2_leg2[i].identity().move(cg.mix(posKnee,posFoot,.5)).aimZ(cg.subtract(posKnee,posFoot)).scale(.1,.1,cg.distance(posKnee,posFoot)/2);
      }

      hitPosL.scale(0);
      hitPosR.scale(0);

      /* Robot1 is controlled by pointing to the terrain and hold left trigger */
      let v1 = [0,0,0];
      if (buttonState.left[0].pressed) {
         getIntersect(npcSystem.n_rootTerrain, "_NPCTerrain", L, lcb);
         if (L.isHit) {
            hitPosL.identity().move(L.globalPositionHit).move(0,.01,0).scale(.01).turnX(-TAU/4);
            let localPos = robot1.getBodyPos();
            v1 = ([L.positionHit[0]-localPos[0], 0, L.positionHit[2]-localPos[2]]);
            let d = cg.norm(v1);
            v1 = d >  2 ? cg.scale(v1,  1/d)
               : d > .5 ? cg.scale(v1, .5/d) : [0,0,0];
         } 
      }
      npcSystem.setNPCMoveVec("robot1", v1);

      /* Robot2 is controlled by pointing to the terrain and hold right trigger */
      let v2 = [0,0,0];
      if (buttonState.right[0].pressed) {
         getIntersect(npcSystem.n_rootTerrain, "_NPCTerrain", R, rcb);
         if (R.isHit) {
            hitPosR.identity().move(R.globalPositionHit).move(0,.01,0).scale(.01).turnX(-TAU/4);
            let localPos = robot2.getBodyPos();
            v2 = ([R.positionHit[0]-localPos[0], 0, R.positionHit[2]-localPos[2]]);
            let d = cg.norm(v2);
            v2 = d >  2 ? cg.scale(v2,  1/d)
               : d > .5 ? cg.scale(v2, .5/d) : [0,0,0];
         } 
      }
      npcSystem.setNPCMoveVec("robot2", v2);

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
