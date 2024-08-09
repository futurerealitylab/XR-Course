import { RobotPicker } from "../render/core/robotPicker.js";

window.ik = [0,.7,.2];

export const init = async model => {
   model.control('ik', 'ik' , () => robot.ik = ! robot.ik);
   model.control('size', 'size' , () => robot.scale = 1.5 - robot.scale);
   let robot = model.robotPicker = new RobotPicker(model, [0,.5,0], .55, .45);
   inputEvents.onDrag = hand => {
      ik = inputEvents.pos(hand);
      server.broadcastGlobal('ik');
   }
   model.animate(() => {
      ik = server.synchronize('ik');
      robot.update(ik);
   });
}

