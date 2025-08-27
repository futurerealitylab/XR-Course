import * as cg from "../render/core/cg.js";
import { Structure } from "../render/core/structure.js";
import { EditText } from "../render/core/editText.js";

export const init = async model => {
   header.innerHTML = '';
   clay.vrWidgets.remove(3); // HIDE "<OPEN>" OBJECT IN 3D SCENE.

   webcam._animate = true;
   model.txtrSrc(10, webcam);
   model.customShader(`
     uniform int uLine;
     ------------------------------------------------
     color = texture(uSampler[10],vec2(-1,1)*uv).rgb;
     if (uLine == 1 || uv.y < .65 && color.b > .25 && color.b > 1.1 * max(color.r, color.g))
        color = vec3(0);
     color = color * color;
   `);

   let vid = model.add('square').txtr(10).move(0,1.6,1-.6).scale(1.6*.6,1.2*.6,1);
   let lines = model.add().flag('uLine'), lineWidth = .002;
   let ctx = webcamCanvas.getContext('2d');
   let isPenDown = false;
   let P = [];

   model.animate(() => {
      let event;
      while (event = clientState.event(clientID)) {
         switch (event.type) {
	 case 'keydown':
            if (event.key == ' ') {
	       console.log('AAAAA');
	       if (! isPenDown)
	          P.push([]);
	       isPenDown = true;
            }
	    break;
         case 'keyup':
	    switch (event.key) {
	    case ' ':
	       isPenDown = false;
	       break;
            case 'Backspace':
	       P.pop();
	       break;
            case 'ArrowUp':
	       lineWidth *= 1.414;
	       break;
            case 'ArrowDown':
	       lineWidth /= 1.414;
	       break;
            }
            break;
         }
      }

      ctx.drawImage(webcam, 0, 0);
      let data = ctx.getImageData(0,0,640,480).data;
      let xs = 0, ys = 0, ns = 0;
      for (let i = 0 ; i < data.length*.65 ; i += 4) {
         let x = ((i >> 2) % 640     );
         let y = ((i >> 2) / 640 >> 0);
         let r = data[i]/255, g = data[i+1]/255, b = data[i+2]/255;
	 if (b > .25 && b > 1.1 * Math.max(r, g)) {
	    xs += x;
	    ys += y;
	    ns++;
	 }
      }
      if (ns > 10 && isPenDown) {
	 let x = (xs / ns - 320) / 320;
	 let y = (240 - ys / ns) / 240;
	 P[P.length-1].push([ -x * 1.6*.2, 1.6 + y * 1.2*.2, 1-.2 ]);
      }

      while (lines.nChildren())
         lines.remove(0);
      if (P.length > 0) {
         let S = new Structure('lines');
         S.nSides(3).lineWidth(lineWidth).lineCap('round');
         for (let n = 0 ; n < P.length ; n++)
	    for (let i = 0 ; i < P[n].length-1 ; i++)
               S.line(P[n][i], P[n][i+1]);
         S.build(lines);
         S.update();
      }
   });
}

