import * as cg from "./cg.js";
import { EyeScreens } from "./eyeScreens.js";


export function RayTraceCubes(model, matrices, colors, isTexture) {
   let T = s => isTexture ? s : '';
   let eyeScreens = new EyeScreens(model);
   eyeScreens.root().flag('uRayTraceCubes');
   let N = matrices.length;

   model.customShader(`
      uniform int uRayTraceCubes;
      uniform vec3 uCol[`+N+`];
      uniform vec4 uA[`+N+`],uB[`+N+`],uC[`+N+`],uD[`+N+`],uE[`+N+`],uF[`+N+`];

      vec3 normal;
      mat3 rayH(vec4 V, vec4 W, vec4 H, vec4 A, vec4 B, mat3 M) {
         float v = dot(H,V);
         float w = dot(H,W);
	 float t = - v / w;
	 if (w > 0.)
	    M[0][1] = min(M[0][1], t);
         else if (t > M[0][0]) {
	    M[0][0] = t;
	    M[1] = H.xyz;
`+T(`
  	    vec4 p = V + t * W;
  	    M[2][0] = dot(A,p); // Compute (u,v) for texture mapping.
  	    M[2][1] = dot(B,p);
`)+`
	 }
	 return M;
      }
`+T(`
      float wavy(float t) { t = .5 - .5 * cos(12.56 * t); return t * t * (3.-t-t); }
`)+`
      ---------------------------------------------------------------------
      if (uRayTraceCubes == 1) {
         vec4 V = vec4(.063*float(uViewIndex),0.,0.,1.);
         vec4 W = normalize(vec4(2.*vUV.x-1.,1.-2.*vUV.y,-.75,0.));
         opacity = 0.;
	 color = vec3(1.);
	 vec4 hLo;
	 float tLo = 1000.;
	 for (int n = 0 ; n < `+N+` ; n++) {
            mat3 M = mat3(-1000.,1000.,0., 0.,0.,0., 0.,0.,0.);
	    M = rayH(V, W, uA[n], uB[n], uC[n], M); if (M[0][0] > M[0][1]) continue;
	    M = rayH(V, W, uB[n], uC[n], uD[n], M); if (M[0][0] > M[0][1]) continue;
	    M = rayH(V, W, uC[n], uD[n], uE[n], M); if (M[0][0] > M[0][1]) continue;
	    M = rayH(V, W, uD[n], uE[n], uF[n], M); if (M[0][0] > M[0][1]) continue;
	    M = rayH(V, W, uE[n], uF[n], uA[n], M); if (M[0][0] > M[0][1]) continue;
	    M = rayH(V, W, uF[n], uA[n], uB[n], M); if (M[0][0] > M[0][1]) continue;
	    if (M[0][0] > 0. && M[0][0] < M[0][1] && M[0][0] < tLo) {
	       tLo = M[0][0];
	       opacity = 1.;
	       vec3 nor = normalize(M[1]);
	       color = uCol[n] * (.5 + .5 * nor.x);
`+T(`
  	       color *= 1. - wavy(M[2][0]) * wavy(M[2][1]);
`)+`
	    }

         }
      }
   `);

   let cube = [ [1,0,0,-1], [0,1,0,-1], [0,0,1,-1], [-1,0,0,-1], [0,-1,0,-1], [0,0,-1,-1] ];

   this.update = () => {
      eyeScreens.update();

      let vm = cg.mMultiply(clay.root().viewMatrix(0), worldCoords);
      let m = [];
      for (let n = 0 ; n < N ; n++)
         m.push(cg.mTranspose(cg.mInverse(cg.mMultiply(vm, matrices[n]))));

      let a = [], b = [], c = [], d = [], e = [], f = [];
      for (let n = 0 ; n < N ; n++) {
         a.push(cg.mTransform(m[n], cube[0]));
         b.push(cg.mTransform(m[n], cube[1]));
         c.push(cg.mTransform(m[n], cube[2]));
         d.push(cg.mTransform(m[n], cube[3]));
         e.push(cg.mTransform(m[n], cube[4]));
         f.push(cg.mTransform(m[n], cube[5]));
      }
      model.setUniform('4fv', 'uA', a.flat());
      model.setUniform('4fv', 'uB', b.flat());
      model.setUniform('4fv', 'uC', c.flat());
      model.setUniform('4fv', 'uD', d.flat());
      model.setUniform('4fv', 'uE', e.flat());
      model.setUniform('4fv', 'uF', f.flat());

      model.setUniform('3fv', 'uCol', colors.flat());
   }
}

