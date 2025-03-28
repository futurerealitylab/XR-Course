import * as cg from "../render/core/cg.js";
import { G3 } from "../util/g3.js";
import { texts } from "../util/texts.js";

export const init = async model => {
   let g3 = new G3(model, draw => {
      let s = [.05,.075,.1,.15,.2,.3];
      let p = [0,.8,0];
      draw.color('white').fill2D([[-.3,-.3],[.3,-.3],[.3,.3],[-.3,.3]], p);
      let d = draw.distance(p);
      let fade = (A,B,C,D) => [ 0,0,0, d<A || d>D ? 0 : d>B && d<C ? 1 : cg.ease(d<B ? (d-A)/(B-A) : (d-D)/(C-D)) ];
      if (d > .2)
         draw.textHeight(.03).color(fade(s[4],s[5],1000,1000)).text('A TALE OF\nTWO CITIES\n\nby\n\nCharles Dickens', p, 'center');
      if (d > .1 && d <= .3)
         draw.textHeight(.013).color(fade(s[2],s[3],s[4],s[5])).text(texts[1], p, 'left');
      if (d > .05 && d <= .15)
         draw.textHeight(.0068).color(fade(s[0],s[1],s[2],s[3])).text(texts[2], p, 'left');
      if (d <= .075)
         draw.textHeight(.004).color(fade(0,0,s[0],s[1])).text(texts[3], p, 'left');
   });

   model.animate(() => {
      g3.update();
   });
}

