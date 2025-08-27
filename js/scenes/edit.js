import * as cg from "../render/core/cg.js";
import { Structure } from "../render/core/structure.js";

if (window.myText === undefined)
   window.myText = 'Now is the time for\nall good men\nto come to the aid\nof their party.';

export const init = async model => {
   let S = new Structure();
   let textID = S.textHeight(.06).text(myText, [0,1.6,0]);
   S.build(model);
   S.edit(textID, key => {
      if (S.isModifierKey('Control'))
         console.log('CONTROL', key);
   });
   model.customShader(`
      color = texture(uSampler[15],uv).rgb;
      opacity = color.r < .5 ? 1. : .5;
      color = vec3(1.);
   `);
   model.animate(() => {
      //S.setTextOrient(textID, model.time);
      S.update();
      myText = S.getText(textID);
   });
}
