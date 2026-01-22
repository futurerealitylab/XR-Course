import * as cg from "../render/core/cg.js";
import { G3 } from "../util/g3.js";

import {
   createSoundSource,
   playSound,
   updatePosition,
   setSourceDistanceRange
} from "../util/spatial-audio.js";

let art = [];
let artNames = [
   "Jackson-Pollock-Autumn-Rhythm",
   "Salvador-Dali-Th-Persistence-of-Memory",
   "Georgia-OKeeffe-jimson-weed-white-flower",
   "Campbells_Soup_Cans_by_Andy_Warhol"
];

let artSoundFiles = [
   "Jackson_Pollock.wav",
   "Dali.wav",
   "Georgia_OKeeffe.wav",
   "Andy_Warhol.wav"
];

let N = 4;

for (let n = 0 ; n < artNames.length ; n++) {
   let image = new Image();
   art.push({
      image: image,
      name: artNames[n],
      soundFile: artSoundFiles[n],
   });
   let filename = 'media/metaMuseum/' + artNames[n] + '.jpg';
   image.src = filename;
}

export const init = async model => {

   for (let n = 0; n < art.length; n++) {
      let theta = 2 * Math.PI * n / art.length;
      let cos = 3 * Math.cos(theta);
      let sin = 3 * Math.sin(theta);
      let p = [cos, 1.5, sin];

      let url = `media/sound/metaMuseum/interviews/${art[n].soundFile}`;

      await createSoundSource(n, url, p, true, 1.0);
      setSourceDistanceRange(n, 0.05, 0.5);
      playSound(n);
   }

   let g3 = new G3(model, draw => {
      for (let n = 0 ; n < art.length ; n++) {
         let s = 1;
         let theta = 2 * Math.PI * n / art.length;
         let cos = 3 * Math.cos(theta);
         let sin = 3 * Math.sin(theta);
         let p = [cos, 1.5, sin];

         updatePosition(n, p);

         let d = draw.distance(p);
         if (d > 0) {
            let image = art[n].image;
            draw.image(image, p, 0, 0, 0, s);

            let A = .25, B = .3, C = .5, D = .6;
            let u = cg.plateau(A, B, C, D, d);

            if (d < D) {
               let text = "getting close to " + art[n].name;
               draw.color([0, 0, 0, u]).textHeight(s * .027).text(text, p);
            }
         }
      }
   });

   model.animate(() => {
      g3.update();
   });
}
