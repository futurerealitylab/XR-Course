import { RobotPicker } from "../render/core/robotPicker.js";

window.ik = [0,1.2,.2];

export const init = async model => {
model.control('ik', 'ik' , () => robot.ik = ! robot.ik);
model.control('size', 'size' , () => robot.scale = 1.5 - robot.scale);
let robot = model.robotPicker = new RobotPicker(model, [0,1,0], .55, .45);

codeEditor.initCode(`\
let robotRGB = [.3,.3,.3];
let motorRGB = [.1,.5,1];

this.root  = model.add().color(robotRGB);
let base   = this.root.add().move(0,.147,0);
let turret = base.add().color(motorRGB);
let limb1  = base.add().color(motorRGB);
let limb2  = base.add().color(robotRGB);

base.add('cube').move(0,-.121,0).scale(.1,.026,.1);

turret.add('tubeY8').move(0,.08-.15,0).scale(.064,.024,.064).turnY(Math.PI/8);
turret.add('cube'  ).move(0,.12-.15,0).scale(.0245,.03 ,.059);
turret.add('tubeX' ).move(0,.15-.15,0).scale(.0245,.06 ,.059);
turret.add('tubeX' ).move(-.03,   0,0).scale(.03 ,.01 ,.01);

limb1.add('cube' ).move(-.05,L1/2-.01,0).scale(.01,L1/2+.01,.01).color(robotRGB);
limb1.add('tubeX').move(-.05,L1      ,0).scale(.02,.05,.05);
limb1.add('tubeX').move(-.03,L1      ,0).scale(.03,.01,.01);

limb2.add('cube'  ).move(0,L2/2-.01,0).scale(.01,LEN2/2+.01,.01).color(robotRGB);
limb2.add('sphere').move(0,L2      ,0).scale(.03);
`);

   inputEvents.onDrag = hand => {
      ik = inputEvents.pos(hand);
      server.broadcastGlobal('ik');
   }
   model.animate(() => {
      ik = server.synchronize('ik');
      codeEditor.update();
      robot.update(ik);
   });
}

