import * as cg from "../render/core/cg.js";
import { G3 } from "../util/g3.js";
import { texts } from "../util/texts.js";

export const init = async model => {
   let heading = 'GOAL: TO BE ABLE TO EDIT TEXT\nLIKE THIS DIRECTLY IN XR.';
   let row = 22, col = 8;
   let g3 = new G3(model, draw => {
       let dx = .01323, dy = .022;
       let m = cg.mMultiply(clay.inverseRootMatrix, model.inverseViewMatrix());
       let x = m.slice(0,3);
       let z = m.slice(8,11);
       z = cg.normalize([z[0],0,z[2]]);
       let o = m.slice(12,15);
       let p = cg.add(o, cg.scale(z, -.5));
       draw.color('#ffffffc0').fill2D([[-.35,-.35,0],[.35,-.35,0],[.35,.35,0],[-.35,.35,0]], p);
       draw.textHeight(.011).font('Courier').color('#000000').text(texts[4], p, 'left', 0,.025);
       draw.textHeight(.011).font('Courier').color('#000000').text(heading, p, 'center', 0,-.28);
       draw.lineWidth(.002).color('#ff0000').draw2D([[-.31+dx*col,-.226+dy*row],[-.31+dx*col,-.208+dy*row]], p);
   });
   model.animate(() => g3.update());
}

