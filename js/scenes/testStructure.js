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
   S.textHeight(.02);
   let textID = S.text(T, [0,1.3,0], nCols + 4, lines.length + 2);

   S.build(model);
   S.setText(textID, 10, 1, 'Hello there!');
   S.edit(textID);
   model.animate(() => {
      S.update();
   });
}

