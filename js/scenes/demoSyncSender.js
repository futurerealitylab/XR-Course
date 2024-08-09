import * as cg from "../render/core/cg.js";
import { g2 } from "../util/g2.js";
import { uiBox } from "../render/core/UIBox.js";

let button1State = 'send';
let slider1Value = 0.1;

export const init = async model => {

   let button1Box = uiBox('button', model,
      () => {
         g2.setColor('#ffa0a0');
	     g2.fillRect(0,0,1,1);
         g2.setColor('#000000');
         g2.setFont('helvetica');
         g2.textHeight(.4); g2.fillText(button1State, .5,.5, 'center');
      },
       () => {
           let str = localStorage.getItem("BoundInfo");
           str = str.concat("+");
           str = str.concat(localStorage.getItem("OriginCoords"));
           server.set((15 * slider1Value >> 0).toString(), str);
           button1State = 'sent';
       },
   );
   console.log('button1Box', button1Box);
   button1Box.move(-.06,.6,0).scale(.02);

   let slider1Box = uiBox('slider', model,
      () => {
         g2.setColor('#ffffff');
	     g2.fillRect(0,0,1,1);
         g2.setColor('#000000');
         g2.fillPath([[.5,.1],[.4,.25],[.6,.25]]);
         g2.fillPath([[.5,.9],[.4,.75],[.6,.75]]);
         g2.setColor('#800000');
         g2.setFont('helvetica');
         g2.textHeight(.4);
         g2.fillText('' + (15 * slider1Value >> 0), .5, .5, 'center');
      },
      value => slider1Value = value,
   );
   slider1Box.move(0,.6,0).scale(.02);

   model.animate(() => {
      button1Box.update();
      slider1Box.update();
   });
}

