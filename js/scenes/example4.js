import * as cg from "../render/core/cg.js";
import { buttonState, joyStickState } from "../render/core/controllerInput.js";

export const init = async model => {
   let groundPos = [0,0.8,-1];
   let ground = model.add('tubeY').move(groundPos).scale(.8,.001,.8).color(.2,.5,.1);
   let snowman = model.add();

   let base  = snowman.add();
   let waist = base   .add();
   let neck  = waist  .add();

   let chest = waist  .add('sphere');
   let armL  = waist  .add('tubeX').color(.5,.2,.1);
   let armR  = waist  .add('tubeX').color(.5,.2,.1);

   let head  = neck   .add('sphere');
   let eyeL  = head   .add('sphere').color('black').dull();
   let eyeR  = head   .add('sphere').color('black').dull();
   let brim  = neck   .add('tubeY').move(0,.07,0).scale(.1,.003,.1).color(.1,.05,.05);
   let hat   = neck   .add('tubeY').move(0,.12,0).scale(.06,.04,.06).color(.1,.05,.05);

   let belly = snowman.add('sphere');

   let isHappy = 0;
   let handPos = [0,1.1,0];

   inputEvents.onMove    = hand => { }
   inputEvents.onPress   = hand => isHappy = 1;
   inputEvents.onDrag    = hand => handPos = inputEvents.pos(hand);
   inputEvents.onRelease = hand => isHappy = 0;
   inputEvents.onClick   = hand => { }

   model.animate(() => {

      let t1 = Math.sin( 3 * model.time) * isHappy;
      let t2 = Math.sin(12 * model.time) * isHappy;
      let es = .018/.08 * (cg.noise(0,0,2*model.time) < .25);
      let N = [];
      for (let i = 0 ; i < 7 ; i++)
         N.push(cg.noise(i * 100, 0, (i==3?1:.5) * model.time));

      snowman.identity().move(isHappy ? handPos : groundPos).turnZ(.2*t1).scale(3);

      base.identity()               .turnZ(.1  * N[0]);
      waist.identity().move(0,.35,0).turnZ(.15 * N[1])
                                    .turnY(.15 * N[2]);
      neck .identity().move(0,.18,0);

      chest.identity().scale(.125);
      armL .identity().move(-.11, .05,  0 ).turnZ(-.1+.2*t2+.3*N[3]).turnY(.3*N[4]).move(-.11,0,0).scale(.11,.01,.01);
      armR .identity().move( .11, .05,  0 ).turnZ( .1-.2*t2-.3*N[3]).turnY(.3*N[4]).move( .11,0,0).scale(.11,.01,.01);

      head .identity().turnY(.5 * N[5])
                      .turnX(.2 * N[6])
                      .scale(.08);
      eyeL .identity().move(-.4,  .1 ,  1 ).turnY(-.35).scale(es,es,es*.1);
      eyeR .identity().move( .4,  .1 ,  1 ).turnY( .35).scale(es,es,es*.1);

      belly.identity().move(  0 , .15,  0 ).scale(.15);
   });
}

