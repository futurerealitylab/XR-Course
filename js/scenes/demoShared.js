import * as cg from "../render/core/cg.js";
import { controllerEventTypes, controllerMatrix } from "../render/core/controllerInput.js";

if (! window.server)
   window.server = new Server();
window.state = [0,1.5,0];

export const init = async model => {
   let cube = model.add('cube');
   model.animate(() => {
      state = server.synchronize('state');

      let hand = null;
      switch (controllerEventTypes()) {
      case 'leftTriggerPress' : case 'leftTriggerDrag' : hand = 'left' ; break;
      case 'rightTriggerPress': case 'rightTriggerDrag': hand = 'right'; break;
      }
      if (hand) {
         let m = cg.mMultiply(controllerMatrix[hand], cg.mInverse(model.getMatrix()));
         state = cg.mix(state, m.slice(12, 15), .5);
         server.broadcastGlobal('state');
      }
      cube.identity().move(state).scale(.02);
   });
}

