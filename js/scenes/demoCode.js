import * as cg from '../render/core/cg.js';

window.update = () => {};

export const init = async model => {
   window.ball = model.add('sphere');
   window.cos = Math.cos;
   window.sin = Math.sin;
   window.noise = cg.noise;

   codeEditor.initCode(`\
   update = time => ball.identity()
                        .move(0,1.6,0)
                        .scale(.1);
`);

   model.animate(() => {
      codeEditor.update();
      update(Date.now()/1000);
   });
}

