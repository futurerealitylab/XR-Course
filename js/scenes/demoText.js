import * as cg from "../render/core/cg.js";
import { G2 } from "../util/g2.js";
//delete window.clientID;

window.etext = { col: 0, row: 0, text: '' };

export const init = async model => {

   // EDITABLE CODE

   let g2 = new G2();

   g2.setFont('courier');
   g2.setColor('#00000080');
   g2.fillRect(0,0,1,1);
   g2.setColor('white');
   g2.textHeight(.02);
   g2.fillText(etext.text, .0113, .98, 'left');

   model.txtrSrc(3, g2.getCanvas());

   let obj = model.add();
   let cursor = obj.add('cube').color('blue');
   let screen = obj.add('cube').txtr(3);

   let wasInteractMode = false;

   model.animate(() => {
      etext = server.synchronize('etext');

      // ONLY RENDER THE HANDS WHEN THEY ARE LIFTED OFF THE KEYBOARD

      for (let hand in {left:0, right:1})
         clay.handsWidget.visible(hand, (inputEvents.pos(hand)[1] - 52 * .0254) / .1);

      // THE SCREEN TURNS TO FACE THE USER

      {
         let m = cg.mMultiply(clay.inverseRootMatrix, clay.pose.transform.matrix);
         let Z = m.slice(8,11);
         let X = cg.normalize(cg.cross([0,1,0], Z));
         m = [X[0],X[1],X[2],0, 0,1,0,0, Z[0],Z[1],Z[2],0, 0,1.6,0,1];
	 let s = interactMode == 3 ? .5 : .25;
         obj.setMatrix(m).scale(s,s,.0001);
      }

      let c = etext.col, r = etext.row, t = etext.text;

      // THE FOLLOWING LOGIC IS ONLY EXECUTED ON A COMPUTER (A CLIENT WITH A KEYBOARD)

      if (interactMode == 3) {
         if (! wasInteractMode) {
	    editText.setCol(c);
	    editText.setRow(r);
	    editText.setText(t);
	    wasInteractMode = true;
	 }
         c = editText.getCol();
         r = editText.getRow();
         t = editText.getText();
         if (c != etext.col || r != etext.row || t !== etext.text) {
            etext = { col: c, row: r, text: t };
	    server.broadcastGlobal('etext');
         }
      }

      cursor.identity().move(-.966+.024*c,.957-.04*r,-.002).scale(.012,.02,.001);
   });
}
