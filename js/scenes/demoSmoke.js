import { Diagram } from "../render/core/diagram.js";
import * as cg from "../render/core/cg.js";

export const init = async model => {
   let N = 3;
   let s = .3;
   let y = 1.1;

   model.add('tubeY').move(0,y-.29,0).scale(.005,.04,.005);
   model.add('tubeY').move(0,y-.25,0).scale(.0045,.0001,.0045).color(.05,0,0);
   let smoke = model.add().flag('uSmoke');
   model.txtrSrc(2, '../media/textures/shadow.png');
   for (let n = 0 ; n < N ; n++)
      smoke.add('cube')
           .txtr(2)
           .move(0,0,s*(2*n/N-1)).scale(s,s,.001);

   model.customShader(`
      uniform int uSmoke;
      -------------------------------
      if (uSmoke == 1) {
	 color = vec3(1.);
	 opacity = .5;

         vec3 C = worldPosition - vec3(0.,`+y+`,0.);
	 C = (uIRM * vec4(C, 1.)).xyz;
	 float t = max(.9, 1. - C.y);
	 t = t * t * t;
	 C.x *= t;
	 C.z *= t;

	 float t2 = max(.9, 1.2 - C.y);
	 C.x *= t2;
	 C.z *= t2;

	 float r = length(C / vec3(.5,1.5,.5));
	 if (r > .3)
	    discard;
	 opacity *= 1. - r / .3;

	 float p = abs(noise(worldPosition *  7. - .1 * uTime))
	         + abs(noise(worldPosition * 14. - .1 * uTime) / 2.);
	 if (p > .25)
	    discard;
         opacity *= 1. - p / .25;

	 opacity *= 1.7 * t;
      }

   `);

   model.animate(() => {
      smoke.identity().move(0,y,0).faceViewer().scale(.5,1.5,.5);
   });
}
