import { RobotPicker } from "../render/core/robotPicker.js";

export const init = async model => {
   model.control('ik', 'ik' , () => robot.ik = ! robot.ik);
   model.control('size', 'size' , () => robot.scale = 1.5 - robot.scale);
   let robot = model.robotPicker = new RobotPicker(model, [0,1.5,.5], .55, .45);
   let p = [0,1.7,.2];
   inputEvents.onDrag = hand => p = inputEvents.pos(hand);
   model.animate(() => robot.update(p));
}

