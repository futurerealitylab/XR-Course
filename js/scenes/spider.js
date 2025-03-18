import { buttonState, controllerMatrix, joyStickState } from "../render/core/controllerInput.js";
import { NPCSystem } from "../render/core/npc.js";
import * as cg from "../render/core/cg.js";

let TAU = Math.PI * 2;

export const init = async model => {
   let lastButtonState = structuredClone(buttonState);
   let transitionStartTime = -100;
   let transitionDuration = 1;
   let getTransProg = () => clamp((model.time - transitionStartTime) / transitionDuration);
   
   let NPCSys = new NPCSystem(model, 16, 16);
   NPCSys.initRender(model);
   NPCSys.getRootNode().move(0,.5,0).scale(.1).move(-8,0,-16);
   let terrainObj = NPCSys.getTerrain();

   let robot1 = NPCSys.addNPC("octopod", "robot1");
   
   
   let hudFPS = new fps(model);

   model.animate(() => {
      hudFPS.update();

      if (buttonState.right[4].pressed - lastButtonState.right[4].pressed == 1 && getTransProg()>= 1) {
         terrainObj.randomize();
         terrainObj.generateMesh();
         robot1.resetPosY();
         transitionStartTime = model.time;
      }
      let fb = -joyStickState.left.y;
      let rl = +joyStickState.left.x;
      let dir = Math.atan2(rl,fb)
      let movVec = (fb || rl)
         ? [Math.sin(dir),0,-Math.cos(dir)] : [0,0,0];

      NPCSys.setNPCMoveVec("robot1", movVec);
      NPCSys.update();

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
