import * as cg from "../render/core/cg.js";
import { G3 } from "../util/g3.js";
import { texts } from "../util/texts.js";

export const init = async model => {
   let g3 = new G3(model, draw => {
      let t = 4/3
      let s = [.2,.25,.31,.386,.48,.6];
      let p = [0,1.5,0];
      draw.color('white').fill2D([[-.4,-.4],[.4,-.4],[.4,.4],[-.4,.4]], p);
      let d = draw.distance(p);
      let fade = (A,B,C,D) => [ 0,0,0, cg.ease(cg.plateau(A,B,C,D,d)) ];
      if (d > s[4]) {
         draw.textHeight(t*.04 ).color(fade(s[4],s[5],1000,1000)).text('A TALE OF\nTWO CITIES', p, 'center',0, .1*t);
         draw.textHeight(t*.025).color(fade(s[4],s[5],1000,1000)).text('by\n\nCharles Dickens', p, 'center',0,-.1*t);
      }
      if (d > s[2] && d <= s[5]) draw.textHeight(t*.013 ).color(fade(s[2],s[3],s[4],s[5])).text(texts[1], p, 'left');
      if (d > s[0] && d <= s[3]) draw.textHeight(t*.0074).color(fade(s[0],s[1],s[2],s[3])).text(texts[2], p, 'left');
      if (            d <= s[1]) draw.textHeight(t*.004 ).color(fade(  0,   0 ,s[0],s[1])).text(texts[3], p, 'left');
   });

   model.animate(() => {
      g3.update();
   });
}

