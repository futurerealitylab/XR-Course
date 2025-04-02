import * as cg from "../render/core/cg.js";
import { G2} from "../util/g2.js";

export const init = async model => {
   let g2L = new G2(false, 2400);
   let g2R = new G2(false, 2400);
   let objL = model.add('square').setTxtr(g2L.getCanvas()).view(0);
   let objR = model.add('square').setTxtr(g2R.getCanvas()).view(1);
   let delta = 16;
   model.animate(() => {
      g2L.update();
      g2R.update();
      objL.hud(true).move(-.5,-.65,0).scale(2.8);
      objR.hud(true).move( .5,-.65,0).scale(2.8);
      delta = .9 * delta + .1 * model.deltaTime;
   });
   let render = (g2, eye) => {
      let dx = -.25 * eye;
      g2.setColor('#80b0ff');
      g2.fillRect(dx-1,-1,.5,2);
      g2.fillRect(dx+.5,-1,.5,2);
      g2.fillRect(dx-.5,-1,1,.5);
      g2.fillRect(dx-.5,.5,1,.5);
      g2.setColor('#ffffff');
      g2.fillRect(dx-.4,-.4,.8,.8);
      g2.setColor('black');
      g2.textHeight(.008);
      g2.text(1/delta >> 0, dx, .16 + .1 * Math.sin(model.time), 'center');
      for (let i = -9 ; i <= 9 ; i++)
      for (let n = -9 ; n <= 9 ; n++) {
         let a = 9 - Math.abs(n);
         g2.text(9-a, dx + .015 * n - eye * .001 * a, .16 + (.018+.0003*a) * i, 'center');
      }
   }
   g2L.render = function() { render(g2L, -1); }
   g2R.render = function() { render(g2R,  1); }
}

