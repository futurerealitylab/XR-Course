import * as cg from "../render/core/cg.js";
import { Structure } from "../render/core/structure.js";

export const init = async model => {

   let V = [ [-1,-1,-1], [ 1,-1,-1], [-1, 1,-1], [ 1, 1,-1],
             [-1,-1, 1], [ 1,-1, 1], [-1, 1, 1], [ 1, 1, 1] ];

   let S = new Structure();
   S.nSides(24).lineCap('butt');

   S.lineWidth(.1);
   S.line(V[0],V[1]).line(V[2],V[3]).line(V[4],V[5]).line(V[6],V[7]);
   S.line(V[0],V[2]).line(V[1],V[3]).line(V[4],V[6]).line(V[5],V[7]);
   S.line(V[0],V[4]).line(V[1],V[5]).line(V[2],V[6]).line(V[3],V[7]);

   S.taper(.5);
   for (let n = 0 ; n < V.length ; n++)
      S.line(V[n], cg.scale(V[n], .5));

   for (let n = 0 ; n < V.length ; n++)
      V[n] = cg.scale(V[n], .5);

   S.taper(0).lineWidth(.05);
   S.line(V[0],V[1]).line(V[2],V[3]).line(V[4],V[5]).line(V[6],V[7]);
   S.line(V[0],V[2]).line(V[1],V[3]).line(V[4],V[6]).line(V[5],V[7]);
   S.line(V[0],V[4]).line(V[1],V[5]).line(V[2],V[6]).line(V[3],V[7]);

   S.build(model);
   S.sizes([.1]);
   model.animate(() => {
      model.identity().move(0,1,0).turnY(model.time);
      S.update();
   });
}

