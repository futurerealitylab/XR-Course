import * as cg from "../render/core/cg.js";
import { G3 } from "../util/g3.js";

/*
   I need to be able to fetch the vector perpendicular to the screen.
*/

let art = [];
let artNames = ["Jackson-Pollock-Autumn-Rhythm", "Salvador-Dali-Th-Persistence-of-Memory", "Georgia-OKeeffe-jimson-weed-white-flower", "Campbells_Soup_Cans_by_Andy_Warhol"];
let N = 4; // number of artwork
for (let n = 0 ; n < artNames.length ; n ++) {
   let image = new Image();
   art.push({
      image: image,
      name: artNames[n],
      //sound: sound, 
   });
   let filename = 'media/metaMuseum/' + artNames[n] + '.jpg';
   image.src = filename;
}

export const init = async model => {
   let g3 = new G3(model, draw => {
      let dMin = 10000;
      for (let n = 0 ; n < art.length ; n++) {
         let s = 1;
     let theta = 2 * Math.PI * n / art.length;
     let cos = 3*Math.cos(theta);
     let sin = 3*Math.sin(theta);
         let p = [cos,1.5,sin];
         let d = draw.distance(p);
     if (d > 0) {
            let image = art[n].image;
            draw.image(image, p, 0,0, 0,s);
            let A = .25, B = .3, C = .5, D = .6;
            let t = 1 - cg.plateau(B,D,100,100,d);
            let u = cg.plateau(A,B,C,D,d);
            if(d < D) {
                let text = "getting close to " + art[n].name;
                // let text = "getting close to " + d;
                draw.color([0,0,0,u]).textHeight(s*.027).text(text, p);
            }
        }
      }
   });

   model.animate(() => {
      g3.update();
   });
}

