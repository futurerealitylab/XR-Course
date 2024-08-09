import { controllerMatrix, buttonState, joyStickState } from "../render/core/controllerInput.js";

/******************************************************************

   This demo shows a variety of objects that can be
   rendered or textured in the system.

******************************************************************/

export const init = async model => {
   let cube = model.add('cube').texture('../media/textures/brick.png');
   let tube1 = model.add('tubeX').color(1,0,0);
   let tube2 = model.add('tubeY').color(0,1,0);
   let tube3 = model.add('tubeZ').color(0,0,1);
   let donut = model.add('donut').texture('../media/textures/brick.png');
   let ball = model.add('sphere').color(1,1,0);

   let eye = model.add();
   eye.add('sphere');
   eye.add('sphere').color(0,0,0);

   model.move(0,1.5,0).scale(.3).animate(() => {
      cube.identity().move(Math.sin(model.time),0,0)
                     .turnX(model.time)
                     .turnY(model.time)
                     .turnZ(model.time)
                     .scale(.4);
      tube1.identity().move(0, .5,0).scale(.2);
      tube2.identity().move(0, .0,0).scale(.2);
      tube3.identity().move(0,-.5,0).scale(.2);
      ball.identity().move(-.5,Math.abs(Math.sin(3*model.time)),0).scale(.2);
      donut.identity().move(.5,.5,0).turnY(model.time).scale(.2);

      eye.identity().move(0,1.5,0)
                    .turnX(Math.sin(2.1*model.time))
                    .turnY(Math.sin(1.0*model.time)).scale(.3);
      eye.child(1).identity()
                  .move(0,0,.6).scale([.6,.6,.5])
                  .color(0,0,.5 + .5 * Math.sin(3 * model.time));
   });
}

