import * as cg from "../render/core/cg.js";
import { Structure } from "../render/core/structure.js";
import { texts } from "../util/texts.js";

export const init = async model => {

   let S = new Structure();

   let T = '\n', nCols = 0;
   let lines = texts[0].split('\n');
   for (let row = 0 ; row < lines.length ; row++) {
      nCols = Math.max(nCols, lines[row].length);
      T += (row == 0 ? '  ' : '\n  ') + lines[row];
   }
   S.textHeight(.01);
   let textID = S.text(T, [0,1,0], nCols + 4, lines.length + 2);
/*
   S.lineWidth(.1).nSides(8).lineCap('square').flatShading(true);
   S.line([-.2,1,0],[.2,1,0]);
*/
   S.build(model);
   S.setText(textID, 10, 1, 'Hello there!');
   model.animate(() => {
      for (let i = 0 ; i < clients.length ; i++) {
         let id = clients[i], event;
	 while ((event = clientState.event(id)) !== undefined)
            console.log(id, event);
      }
      S.update();
      //model.identity().move(0,1.5,0).turnY(model.time);
   });
}

