/******************************************************************

   This demo shows how you can embed an entire ray tracer
   inside the fragment shader.

   As with any change to the fragment shader, you need to
   set a flag (in this case uRayTrace) so that the ray tracing
   code will run only for the object(s) that you select.

   You can also see here how to toggle Heads-Up Display (HUD)
   mode for the object that is running the ray tracing shader
   code, by using 'h' mode toggle.

******************************************************************/

export const init = async model => {
   let screen = model.add('cube');
   let isHUD = false;
   model.control('h', 'toggle HUD', () => isHUD = ! isHUD);

   model.animate(() => {
      let m = views[0]._viewMatrix, c = .5*Math.cos(model.time), s = .5*Math.sin(model.time);
      if (isHUD)
         model.hud();
      else
         model.setMatrix([m[0],m[4],m[8],0,m[1],m[5],m[9],0,m[2],m[6],m[10],0,0,1.6,-1,1]);
      model.scale(.4,.4,.0001);

      model.flag('uRayTrace');
      model.setUniform('4fv','uL', [.5,.5,.5,1., -.5,-.5,-.5,.2, .7,-.7,0,.2, -.7,.7,0,.2]);
      model.setUniform('4fv','uS', [c,s,0,0, s,0,c,0, 0,c,s,0, -c,-s,0,0]);
      model.setUniform('4fv','uC', [1,1,0,2., 0,1,1,2, 1,0,1,2, 0,1,0,2]);

      model.customShader(`
         uniform int uRayTrace;
         uniform vec4 uC[4], uL[4], uS[4];
         vec4 light[4], sphere[4];
         float raySphere(vec3 V, vec3 W, vec4 S) {
            V -= S.xyz;
            float b = dot(V, W);
            float d = b * b - dot(V, V) + S.w * S.w;
            return d < 0. ? -1. : -b - sqrt(d);
         }
         vec3 shadeSphere(vec3 p, vec4 s, vec4 c) {
            vec3 N = normalize(p - s.xyz);
            vec3 color = .1 * c.rgb;
            for (int l = 0 ; l < 4 ; l++) {
               vec3 lDir = light[l].xyz;
               float lBrightness = light[l].w;
               float t = -1.;
               for (int i = 0 ; i < 4 ; i++)
                  t = max(t, raySphere(p, lDir, sphere[i]));
               if (t < 0.) {
                  vec3 R = 2. * N * dot(N, lDir) - lDir;
                  color += lBrightness * ( c.rgb * .9 * max(0., dot(N, lDir))
                                         + c.a * vec3(pow(max(0., R.z), 10.)) );
               }
            }
            return color;
         }
         ---------------------------------------------------------------------
	 if (uRayTrace == 1) {
	    float fl = -1. / uProj[3].z; // FOCAL LENGTH OF VIRTUAL CAMERA
            for (int i = 0 ; i < 4 ; i++) {
               light[i]  = vec4((uView * vec4(uL[i].xyz,0.)).xyz,uL[i].w);
               sphere[i] = vec4((uView * uS[i]).xyz,.25) - vec4(0.,0.,fl,0.);
            }
            vec3 V = vec3(0.);
            vec3 W = normalize(vec3(2.*vUV.x-1.,1.-2.*vUV.y,-fl));
            float tMin = 1000.;
            for (int i = 0 ; i < 4 ; i++) {
               float t = raySphere(V, W, sphere[i]);
               if (t > 0. && t < tMin) {
                  tMin = t;
                  color = shadeSphere(t * W, sphere[i], uC[i]);
               }
            }
            if (tMin == 1000.)
               opacity = 0.;
         }
      `);
   });
}
