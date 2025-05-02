import * as cg from "../render/core/cg.js";
import { G3 } from "../util/g3.js";
import { descriptions } from "../util/descriptions.js";

/*
   I need to be able to fetch the vector perpendicular to the screen.
*/

let art = [];
for (let n = 0 ; n < descriptions.length ; n += 3) {
   let image = new Image();
   art.push({
      image: image,
      artist: descriptions[n],
      title: descriptions[n+1],
      text: descriptions[n+2],
   });
   let filename = 'media/art/' + String.fromCharCode(97 + (n/3>>0)) + '.jpg';
   image.src = filename;
}

export const init = async model => {
   let g3 = new G3(model, draw => {
      let dMin = 10000;
      for (let n = 0 ; n < art.length ; n++) {
         let s = 0.3;
	 let theta = 2 * Math.PI * n / art.length;
	 let cos = 1.6*Math.cos(theta);
	 let sin = 1.6*Math.sin(theta);
         let p = [cos,1.5,sin];
         let d = draw.distance(p);
	 if (d > 0) {
            let image = art[n].image;
            draw.image(image, p, 0,0, 0,s);
	    if (image.width) {
	       if (! art[n].description) {
	          let text = art[n].text;
		  let nk = 70 * image.width / image.height >> 0;
                  let k = nk;
                  while (k < text.length) {
		     while (text.charAt(k) != ' ')
		        k--;
                     text = text.substring(0,k) + '\n' + text.substring(k);
                     k += nk;
                  }
		  art[n].description = text;
	       }
	       let A = .25, B = .3, C = .5, D = .6;
	       let t = 1 - cg.plateau(B,D,100,100,d);
	       if (t > 0) {
	          let w = s * image.width / image.height;
	          draw.color([1,1,1,.5*t]).fill2D([[-w,-s],[w,-s],[w,s],[-w,s]], p);
	          let u = cg.plateau(A,B,C,D,d);
		  if (u > 0) {
	             draw.color([0,0,0,u]).textHeight(s*.07).text(art[n].title , p, 'center', 0, .5*s);
	             draw.color([0,0,0,u]).textHeight(s*.05).text(art[n].artist, p, 'center', 0,-.5*s);
                  }
	          let v = cg.plateau(0,0,A,B,d);
		  if (v > 0)
	             draw.color([0,0,0,v]).textHeight(s*.027).text(art[n].description, p);
               }
	    }
	 }
      }
   });

   model.animate(() => {
      g3.update();
   });
}

