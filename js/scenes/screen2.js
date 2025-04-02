import * as cg from "../render/core/cg.js";
import { G2} from "../util/g2.js";

export const init = async model => {
   let g2 = [], sc = [], delta = 16, mF = [], mI = [];
   for (let view = 0 ; view <= 1 ; view++) {
      g2[view] = new G2(false, 2400);
      sc[view] = model.add('square').setTxtr(g2[view].getCanvas()).view(view);
   }
   let projectPoint = (p, view) => cg.mTransform(mI[view], p);
   model.animate(() => {
      for (let view = 0 ; view <= 1 ; view++) {
         mF[view] = cg.mMultiply(clay.inverseRootMatrix,clay.root().inverseViewMatrix(view));
         mI[view] = cg.mInverse(mF[view]);
         sc[view].setMatrix(mF[view]).move(0,-.22,-.7);
         g2[view].update();
      }
      delta = .9 * delta + .1 * model.deltaTime;
   });
   let render = (g2, view) => {
      let eye = 2 * view - 1;
      let dx = -.1 * eye;
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

      g2.setColor('#0000ff');
      g2.lineWidth(.005);
      let P = [];
      for (let z = -.1 ; z <= .1 ; z += .2)
      for (let y = -.1 ; y <= .1 ; y += .2)
      for (let x = -.1 ; x <= .1 ; x += .2) {
         let p = projectPoint([x,1.5+y,z], view);
	 P.push([-p[0]/p[2], -p[1]/p[2], -.7]);
      }
      g2.line(P[0],P[4]); g2.line(P[1],P[5]); g2.line(P[2],P[6]); g2.line(P[3],P[7]);
      g2.line(P[0],P[2]); g2.line(P[1],P[3]); g2.line(P[4],P[6]); g2.line(P[5],P[7]);
      g2.line(P[0],P[1]); g2.line(P[2],P[3]); g2.line(P[4],P[5]); g2.line(P[6],P[7]);
   }
   for (let view = 0 ; view <= 1 ; view++)
      g2[view].render = function() { render(g2[view], view); }
}

