import { buttonState, controllerMatrix, joyStickState } from "../render/core/controllerInput.js";
import { NPCSystem } from "../render/core/npc.js";
import * as cg from "../render/core/cg.js";

let TAU = Math.PI * 2;

export const init = async model => {
   let lastButtonState = structuredClone(buttonState);
   let transitionStartTime = -100;
   let transitionDuration = 1;
   let getTransProg = () => clamp((model.time - transitionStartTime) / transitionDuration);
   
   /* Initialize the NPC System */
   let npcSystem = new NPCSystem(model, 16, 16);
   npcSystem.initRender(model);
   npcSystem.getRootNode().move(0,.5,0).scale(.1).move(-8,0,-16);

   /* Get Terrain Object for further use */
   let terrainObj = npcSystem.getTerrain();

   /* Robot1 with default rendering initialization */
   let robot1 = npcSystem.addNPC("octopod", "robot1");

   /* Do not initialize default rendering for Robot2 */
   let robot2 = npcSystem.addNPC("quadruped", "robot2", false);
   
   /* Custom Rendering for Robot2 */
   let n_rootNPCs = npcSystem.getNPCsRootNode();
   let m_robot2_body = n_rootNPCs.add("sphere").scale(0);
   let arr_m_robot2_leg1 = [];
   let arr_m_robot2_leg2 = [];
   let arr_m_robot2_knee = [];
   let arr_m_robot2_foot = [];
   for (let i=0; i<4; i++) {
      arr_m_robot2_leg1.push(n_rootNPCs.add("tubeZ").scale(0).color(0,0,1));
      arr_m_robot2_leg2.push(n_rootNPCs.add("tubeZ").scale(0).color(0,1,.3));
      arr_m_robot2_knee.push(n_rootNPCs.add("sphere").scale(0));
      arr_m_robot2_foot.push(n_rootNPCs.add("sphere").scale(0));
   }
   
   let hudFPS = new fps(model);

   model.animate(() => {
      hudFPS.update();

      /* Randomize terrain on button A press */
      if (buttonState.right[4].pressed - lastButtonState.right[4].pressed == 1 && getTransProg()>= 1) {
         terrainObj.randomize();
         terrainObj.generateMesh();
         robot1.resetPosY();
         robot2.resetPosY();
         transitionStartTime = model.time;
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

      /* Robot1 is controlled by left joystick */
      let fb = joyStickState.left.y;
      let rl = joyStickState.left.x;
      npcSystem.setNPCMoveVec("robot1", [rl, 0, fb]);

      /* Robot2 is walking in circle */
      npcSystem.setNPCMoveVec("robot2", [Math.sin(model.time), 0, -Math.cos(model.time)]);

      /* After set all NPCs' moving vector, call update() */
      npcSystem.update();

      lastButtonState = structuredClone(buttonState);   
   });
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
