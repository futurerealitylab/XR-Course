import * as cg from "../render/core/cg.js";
import { G2 } from "../util/g2.js";
export const init = async model => {
   let B = [[0,0,0,0, 0,0,0,0],
            [0,0,0,0, 0,0,0,0]];
   let cube = model.add('cube');
   let beam = [ model.add('tubeZ'), model.add('tubeZ') ];
   let state = ['none','none'];
   let hand = ['left','right'];

   let g2 = new G2();
   g2.setColor('white');
   g2.fillRect(0,0,1,1);
   g2.setColor('black');
   g2.textHeight(.08);
   g2.lineWidth(.001);
   g2.setFont('courier');
   for (let h = 0 ; h < 2 ; h++) {
      let x = .2 + .55 * h;
      g2.fillText(state[h], x, .93, 'center');
      for (let n = 0 ; n < 8 ; n++)
         g2.fillText(cg.decimal(B[h][n],2),x,.78-.09*n-.06*(n>3));
   }

   model.txtrSrc(3, g2.getCanvas());

   cube.txtr(3);
   
   model.animate(() => {
      for (let h = 0 ; h < 2 ; h++) {
         for (let n = 0 ; n < 3 ; n++) {
            B[h][  n] = clay.handsWidget.fingerBend(hand[h],1,n+1);
            B[h][4+n] = clay.handsWidget.fingerBend(hand[h],2,n+1);
         }
         B[h][3] = B[h][0] + B[h][1] + B[h][2];
         B[h][7] = B[h][4] + B[h][5] + B[h][6];
	 state[h] = B[h][0]<1 && B[h][3]>1.5 && B[h][7]>3 ? 'trigger'
	          : B[h][0]<1 && B[h][7]>3 ? 'point' : '---';
         let m = clay.handsWidget.getMatrix(hand[h], 1, 0).slice();
	 m = cg.mMultiply(clay.inverseRootMatrix,m);
	 beam[h].setMatrix(m).move(0,0,-10).scale(.0005,.0005,10)
	                     .color(10,0,0).dull();
	 if (state[h] == '---')
	    beam[h].scale(0);
	 else if (state[h] == 'trigger')
	    beam[h].scale(3,3,1);
      }
      cube.identity().move(0,1.6,0).scale(.2);
   });
}

