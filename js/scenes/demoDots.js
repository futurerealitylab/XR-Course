import * as cg from "../render/core/cg.js";

export const init = async model => {

   let N = 5000;

   model.customShader(`
      float rand(vec2 co){
         return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
      }
      uniform int uTriToHex;
      -------------------------------
      if (uTriToHex==1) {
         float u = vUV.x-.5, v = vUV.y-.5, w = -u-v-.5;
         float t = rand(vAPos.xy);
	 //color = vec3(0.);
	 if (u*u + v*v + w*w + t > .25)
	    discard;
      }
   `);
   model.flag('uTriToHex');

   let pointData = [];
   for (let n = 0 ; n < N ; n++) {
      let x = 1, y = 1, z = 1;
      while (x==1 || Math.abs(cg.noise(x,y,z+.5)) > .01) {
      //while (x*x + y*y + z*z > .25) {
         x = Math.random() - .5;
         y = Math.random() - .5;
         z = Math.random() - .5;
      }
      pointData.push([x,y,z]);
   }

   let vertexData = [];
   for (let n = 0 ; n < N ; n++)
      for (let i = 0 ; i < 3 ; i++)
         vertexData.push([ 0,0,0, 0,0,0, (i==1?1:0), (i==2?1:0) ]);

   clay.defineMesh('dots', clay.trianglesMesh(vertexData));

   let obj = model.add('dots').color(1,1,1);

   model.animate(() => {

      let vm = cg.mMultiply(clay.inverseRootMatrix, clay.root().inverseViewMatrix(0));
      let X = vm.slice(0,3);
      let Y = vm.slice(4,7);
      let Z = vm.slice(8,11);

      let D = [[0,0,0], [0,0,0], [0,0,0]];
      for (let i = 0 ; i < 3 ; i++) {
         let c = .07 * Math.cos(2 * Math.PI * i / 3);
         let s = .07 * Math.sin(2 * Math.PI * i / 3);
         for (let j = 0 ; j < 3 ; j++)
            D[i][j] = c * X[j] + s * Y[j];
      }

      let mesh = clay.getMesh('dots');
      for (let n = 0 ; n < 3*N ; n++)
         for (let j = 0 ; j < 3 ; j++) {
            mesh[16*n   + j] = pointData[n/3>>0][j] + D[n%3][j];
            mesh[16*n+3 + j] = Z[j];
         }

      obj.identity().move(0,1.6,0).scale(.6);
   });
}

