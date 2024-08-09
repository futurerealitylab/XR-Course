import * as cg from "../render/core/cg.js";
import { controllerMatrix, buttonState, joyStickState } from "../render/core/controllerInput.js";

/******************************************************************

   This is a model inspired by the robot sketch from
   the whiteboard in our classroom. It shows an example
   of a hierarchical object with rotating joints.

******************************************************************/

export const init = async model => {
   let robot = model.add().color(.7,.7,.7);
   let base  = robot.add();
   let spine = base.add();
   let neck  = spine.add();
   let head  = neck.add();

   let leftShoulder  = neck.add();
   let leftElbow     = leftShoulder.add();
   let leftWrist     = leftElbow.add();
   let leftFinger    = leftWrist.add();
   let leftFingertip = leftFinger.add();
   let leftThumb     = leftWrist.add();
   let leftThumbtip  = leftThumb.add();

   let rightShoulder  = neck.add();
   let rightElbow     = rightShoulder.add();
   let rightWrist     = rightElbow.add();
   let rightFinger    = rightWrist.add();
   let rightFingertip = rightFinger.add();
   let rightThumb     = rightWrist.add();
   let rightThumbtip  = rightThumb.add();

   spine.add('sphere').scale(.10);
   neck .add('sphere').scale(.10);

   leftShoulder .add('sphere').scale(.09);
   leftElbow    .add('sphere').scale(.085);
   leftWrist    .add('sphere').scale(.07);
   leftFinger   .add('sphere').scale(.05);
   leftFingertip.add('sphere').scale(.025);
   leftThumb    .add('sphere').scale(.05);
   leftThumbtip .add('sphere').scale(.025);

   rightShoulder .add('sphere').scale(.09);
   rightElbow    .add('sphere').scale(.085);
   rightWrist    .add('sphere').scale(.07);
   rightFinger   .add('sphere').scale(.05);
   rightFingertip.add('sphere').scale(.025);
   rightThumb    .add('sphere').scale(.05);
   rightThumbtip .add('sphere').scale(.025);

   head.add('cube'  ).scale(.25);
   head.add('sphere').move(-.4,.1,0).scale(.04);
   head.add('sphere').move( .4,.1,0).scale(.04);
   head.add('tubeX' ).move(-.3,.1,0).scale(.1,.02,.02);
   head.add('tubeX' ).move( .3,.1,0).scale(.1,.02,.02);

   // EYES

   head.add('tubeZ' ).move( .11,.1,.25).scale(.08,.09,.001).color(1,1,1);
   head.add('tubeZ' ).move(-.11,.1,.25).scale(.08,.09,.001).color(1,1,1);

   // PUPILS

   let leftPupil  = head.add('sphere').color(0,0,0);
   let rightPupil = head.add('sphere').color(0,0,0);

   // NOSE

   head.add('tubeZ' ).move(0,-.03,.25).scale(.04,.04,.07).color(.5,.5,.5);

   // MOUTH

   head.add('cube'  ).move(0,-.15,.25).scale(.09,.015,.01).color(0,0,0);

   let bs = model.add('tubeZ');
   let sn = model.add('tubeZ');
   let nh = model.add('tubeZ');

   let nls   = model.add('tubeZ');
   let lsle  = model.add('tubeZ');
   let lelw  = model.add('tubeZ');
   let lwlf  = model.add('tubeZ');
   let lflft = model.add('tubeZ');
   let lwlt  = model.add('tubeZ');
   let ltltt = model.add('tubeZ');

   let nrs   = model.add('tubeZ');
   let rsre  = model.add('tubeZ');
   let rerw  = model.add('tubeZ');
   let rwrf  = model.add('tubeZ');
   let rfrft = model.add('tubeZ');
   let rwrt  = model.add('tubeZ');
   let rtrtt = model.add('tubeZ');

   let limb = (a,b,c,r) => {
      if (r === undefined) r = .012;
      a.color(.7,.7,.7);
      let B = b.getMatrixFromRoot().slice(12, 15);
      let C = c.getMatrixFromRoot().slice(12, 15);
      a.setMatrix(cg.mMultiply(cg.mTranslate(cg.mix(B,C,.5)),
                  cg.mMultiply(cg.mAimZ(cg.subtract(C,B), [0,0,1]),
		               cg.mScale(r,r,.5*cg.distance(B,C)))));
   }

   model.animate(() => {

      let shimmy = Math.sin(3 * model.time);
      let shrug = Math.sin(10 * model.time);
      let grip = .5 + .5 * Math.sin(10 * model.time);

      let t = .5 - .5 * Math.sin(model.time);
      for (let i = 0 ; i < 3 ; i++)
         t = t * t * (3 - t - t);
      let gazeX = 2 * t - 1;
      let gazeY = 0;

      leftPupil .identity().move( .11+.04*gazeX,.1+.04*gazeY,.25).scale(.05,.05,.01);
      rightPupil.identity().move(-.11+.04*gazeX,.1+.04*gazeY,.25).scale(.05,.05,.01);

      let leftTrigger  = buttonState.left[0].pressed;
      let rightTrigger = buttonState.right[0].pressed;

      let lcm = controllerMatrix.left;

      robot.color(leftTrigger ? [1,0,0] : [.7,.7,.7]);

      robot.identity().move(0,1.5,0).scale(.3);
      base .identity().move(0,0,0).turnZ(-.1 * shimmy);
      spine.identity().move(0,.3,0).turnZ(.2 * shimmy);
      neck .identity().move(0,.6,.0).turnZ(-.1 * shimmy);
      head .identity().move(0,.55,0).turnY(Math.sin(model.time));

      leftShoulder .identity().turnZ( .1 * shrug).move( .45,0,0);
      leftElbow    .identity().turnZ(-.1 * shrug).move(0,-.55,0);
      leftWrist    .identity().move(0,-.55,0);
      leftFinger   .identity().turnZ( .3).move(0,-.3,0);
      leftFingertip.identity().turnZ(-.5).move(0,-.25,0);
      leftThumb    .identity().turnZ(-.4).move(0,-.25,0);
      leftThumbtip .identity().turnZ( .6).move(0,-.20,0);

      rightShoulder .identity().turnZ(-.1 * shrug).move(-.45,0,0);
      rightElbow    .identity().turnZ( .1 * shrug).move(0,-.55,0);
      rightWrist    .identity().move(0,-.55,0);
      rightFinger   .identity().turnZ(-.3).move(0,-.3,0);
      rightFingertip.identity().turnZ( .5).move(0,-.25,0);
      rightThumb    .identity().turnZ( .4).move(0,-.25,0);
      rightThumbtip .identity().turnZ(-.6).move(0,-.20,0);

      limb(bs, base, spine);
      limb(sn, spine, neck);
      limb(nh, neck, head);

      limb(nls  , neck, leftShoulder);
      limb(lsle , leftShoulder, leftElbow);
      limb(lelw , leftElbow, leftWrist);
      limb(lwlf , leftWrist, leftFinger, .009);
      limb(lflft, leftFinger, leftFingertip, .008);
      limb(lwlt , leftWrist, leftThumb, .009);
      limb(ltltt, leftThumb, leftThumbtip, .008);

      limb(nrs  , neck, rightShoulder);
      limb(rsre , rightShoulder, rightElbow);
      limb(rerw , rightElbow, rightWrist);
      limb(rwrf , rightWrist, rightFinger, .009);
      limb(rfrft, rightFinger, rightFingertip, .008);
      limb(rwrt , rightWrist, rightThumb, .009);
      limb(rtrtt, rightThumb, rightThumbtip, .008);
   });
}

