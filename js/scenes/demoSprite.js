import * as cg from "../render/core/cg.js";

/**********************************************************************

   This demo shows how to create sprites by texturing a box, using
   textures that are opaque in some places and transparent in others.

   In this example, the sprites are always oriented so that they
   face the viewer.

**********************************************************************/

export const init = async model => {
   let P = [], N = 100;

   let randomPointOnDisk = () => {
      let u = 1, v = 1;
      while (u*u + v*v > 1) {
         u = 2 * Math.random() - 1;
         v = 2 * Math.random() - 1;
      }
      return [u,v];
   }

   for (let n = 0 ; n < N ; n++) {
      model.add('cube').texture('./media/textures/tree.png');
      let uv = randomPointOnDisk();
      P.push([6 * uv[0], 0, 6 * uv[1]]);
   }
   model.move(0,.835,0).scale(.1);

   model.animate(() => {
      let m = views[0]._viewMatrix;
      for (let n = 0 ; n < N ; n++) {
         let p = P[n];
         model.child(n).setMatrix([m[0],m[4],m[ 8],0,
	                         //m[1],m[5],m[ 9],0, // We are choosing not to
	                              0,   1,    0,0, // face the viewer in y.
				   m[2],m[6],m[10],0,
				   p[0],p[1],p[ 2],1]).scale(1,1,.0001);

      }
   });
}

