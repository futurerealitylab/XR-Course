import * as cg from "../render/core/cg.js";

/******************************************************************

   This demo shows how to create your own custom triangles mesh.

******************************************************************/

export const init = async model => {
   let a = [-1, 0, 0, -1, 0, 0], A = [ 1, 0, 0,  1, 0, 0],
       b = [ 0,-1, 0,  0,-1, 0], B = [ 0, 1, 0,  0, 1, 0],
       c = [ 0, 0,-1,  0, 0,-1], C = [ 0, 0, 1,  0, 0, 1];
   clay.defineMesh('smooth_octahedron', clay.trianglesMesh([
      a,b,C, a,B,c, A,b,c, A,B,C, a,C,B, A,c,B, A,C,b, a,c,b
   ]));
   let myObj = model.add('smooth_octahedron');

   model.move(0,1.5,0).scale(.15).animate(() => {
      myObj.identity().turnZ(model.time/2).turnY(model.time/2).turnZ(model.time);
   });
}

