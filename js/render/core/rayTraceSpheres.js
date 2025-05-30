import * as cg from "./cg.js";
import { EyeScreens } from "./eyeScreens.js";

export function RayTraceSpheres(model, S) {
   let eyeScreens = new EyeScreens(model);
   eyeScreens.root().flag('uRayTraceSpheres');
   let N = S.length;

   model.customShader(`
      uniform int uRayTraceSpheres;
      uniform vec4 uL[4];
      uniform vec4 uS[`+N+`];
      uniform vec3 uC[`+N+`];

      float raySphere(vec3 V, vec3 W, vec4 S) {     // Ray trace to a sphere. Returns distance
         V -= S.xyz;                                // to sphere, or -1 if ray misses sphere.
         float b = dot(V, W);
         float d = b * b - dot(V, V) + S.w * S.w;
         return d < 0. ? -1. : -b - sqrt(d);
      }
      vec3 shadeSphere(vec3 p, vec4 s, vec3 c) {    // Shade a sphere, checking if any other
         vec3 N = normalize(p - s.xyz);             // sphere casts a shadow.
         vec3 color = .1 * c;
         for (int l = 0 ; l < 4 ; l++) {
            vec3 lDir = uL[l].xyz;
            float t = -1.;
            for (int n = 0 ; n < `+N+` ; n++)
               t = max(t, raySphere(p, lDir, uS[n]));
            if (t < 0.) {
               vec3 R = 2. * N * dot(N, lDir) - lDir;
               color += uL[l].w * ( c.rgb * .9 * max(0., dot(N, lDir))
                                  + 2. * vec3(pow(max(0., R.z), 20.)) );
            }
         }
         return color;
      }
      ---------------------------------------------------------------------
      if (uRayTraceSpheres == 1) {
         vec3 V = vec3(.063*float(uViewIndex),0.,0.);            // Find nearest sphere on ray.
         vec3 W = normalize(vec3(2.*vUV.x-1.,1.-2.*vUV.y,-.75)); // If no hits, opacity = 0.
         opacity = 0.;
         float tMin = 1000.;
         for (int n = 0 ; n < `+N+` ; n++) {
            float t = raySphere(V, W, uS[n]);
            if (t > 0. && t < tMin) {
               color = shadeSphere(V + t * W, uS[n], uC[n]);
               opacity = 1.;
               tMin = t;
            }
         }
      }
   `);
   
   this.update = () => {
      eyeScreens.update();

      model.setUniform('4fv','uL', [.5,.5,.5,1, -.5,-.5,-.5,.2, .7,-.7,0,.2, -.7,.7,0,.2]);

      let m = cg.mMultiply(clay.root().viewMatrix(0), worldCoords);
      let s = [];
      for (let n = 0 ; n < N ; n++)
         s.push(cg.mTransform(m, S[n].slice(0,3)),S[n][3]);
      model.setUniform('4fv', 'uS', s.flat()); // Send transformed sphere geometry to shader.
   
      let c = [];
      for (let n = 0 ; n < N ; n++)
         c.push(S[n].slice(4,7));
      model.setUniform('3fv', 'uC', c.flat()); // Send sphere colors to shader.
   }
}

