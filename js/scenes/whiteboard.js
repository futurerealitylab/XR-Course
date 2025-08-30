import * as cg from "../render/core/cg.js";
import { Structure } from "../render/core/structure.js";
import { EditText } from "../render/core/editText.js";
import { matchCurves } from "../render/core/matchCurves3D.js";

export const init = async model => {
   header.innerHTML = '';
   clay.vrWidgets.remove(3); // HIDE "<OPEN>" OBJECT IN 3D SCENE.

   webcam._animate = true;
   model.txtrSrc(10, webcam);
   model.customShader(`
     uniform int uLine, uColor;
     ------------------------------------------------
     color = texture(uSampler[10],vec2(-1,1)*uv).rgb;
     if (uv.y < .65 && color.b > .25 && color.b > 1.1 * max(color.r, color.g))
        color = uColor==0 ? vec3(0)
	      : uColor==1 ? vec3(1,0,0)
	      : uColor==2 ? vec3(0,1,0) : vec3(0,0,1);
     if (uLine == 1)
        color = 3. * color;
     color = color * color;
   `);

   let vid = model.add('square').txtr(10).move(0,1.6,1-.6).scale(1.6*.6,1.2*.6,1);
   let lines = model.add().flag('uLine'), lineWidth = .002, colorIndex = 0;
   let colors = [[0,0,0],[1,0,0],[0,1,0],[0,0,1]];
   let ctx = webcamCanvas.getContext('2d');
   let isPenDown = false, isRotate = false;
   let P = [], sketches = [], p = [0,0,0];
   let ST, T;
   let nStart = 0;

   model.animate(() => {

      let penDown = () => {
         if (! isPenDown) {
	    P.push([]);
	    P[P.length-1].lineWidth  = lineWidth;
	    P[P.length-1].colorIndex = colorIndex;
         }
	 isPenDown = true;
      }
      let penMove = (x,y) => {
         x = (x - 320) / 320;
         y = (240 - y) / 240;
         p = [ x * 1.6*.2, 1.6 + y * 1.2*.2, 1-.2 ];
         if (isPenDown) {
	    let curve = P[P.length-1];
	    if (curve.length == 0 || cg.distance(p, curve[curve.length-1]) > 0)
	       curve.push(p);
         }
      }
      let penUp = () => isPenDown = false;

      let event;
      while (event = clientState.event(clientID)) {
         switch (event.type) {
	 case 'mousedown': penDown(); break;
	 case 'mousemove': penMove(event.x * 640 / screen.width,
	                           event.y * 480 / (screen.height + 140) + 40); break;
	 case 'mouseup'  : penUp(); break;
	 case 'keydown':
            if (event.key == ' ')
	       penDown();
	    break;
         case 'keyup':
	    switch (event.key) {
	    case ' ':
	       penUp();
	       break;
	    case 's':
	       nStart = P.length;
	       break;
	    case 'e':
	       sketches.push(P.slice(nStart));
	       ST = matchCurves.recognize(sketches[sketches.length-1]);
	       P = P.slice(0, nStart);
	       T = 0;
	       break;
	    case 'r':
	       isRotate = ! isRotate;
	       break;
            case 'Backspace':
	       let isDeleteSketch = false;
	       for (let i = 0 ; i < sketches.length ; i++) {
	          let sketch = sketches[i];
		  if ( p[0] >= sketch.xlo && p[0] <= sketch.xhi &&
		       p[1] >= sketch.ylo && p[1] <= sketch.yhi ) {
                     sketches.splice(i, 1);
		     isDeleteSketch = true;
		     break;
                  }
               }
	       if (! isDeleteSketch)
	          P.pop();
	       break;
            case 'ArrowUp':
	       lineWidth *= 1.414;
	       break;
            case 'ArrowDown':
	       lineWidth /= 1.414;
	       break;
            case 'ArrowLeft':
	       colorIndex = (colorIndex + colors.length-1) % colors.length;
	       break;
            case 'ArrowRight':
	       colorIndex = (colorIndex + 1) % colors.length;
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
      if (ns > 20)
         penMove(640-xs/ns, ys/ns);

      if (ST) {
	 let sketch = sketches[sketches.length-1];
         if (T < 1) {
	    T = Math.min(1, T + 2 * model.deltaTime);
            let P = matchCurves.mix(ST[0], ST[1], cg.ease(T));
	    for (let n = 0 ; n < sketch.length ; n++) {
	       P[n].lineWidth  = sketch[n].lineWidth;
	       P[n].colorIndex = sketch[n].colorIndex;
	    }
	    sketches[sketches.length-1] = P;
         }
	 else {
	    ST = null;
	    let xlo = 1000, ylo = xlo, xhi = -xlo, yhi = -ylo;
	    for (let n = 0 ; n < sketch.length ; n++) {
	       let P = sketch[n];
	       for (let i = 0 ; i < P.length ; i++) {
	          xlo = Math.min(xlo, P[i][0]);
	          xhi = Math.max(xhi, P[i][0]);
	          ylo = Math.min(ylo, P[i][1]);
	          yhi = Math.max(yhi, P[i][1]);
	       }
	    }
	    sketch.xlo = xlo;
	    sketch.ylo = ylo;
	    sketch.xhi = xhi;
	    sketch.yhi = yhi;
         }
      }

      model.setUniform('1i', 'uColor', colorIndex);
      lines.identity().move(0,0,.8).turnY(isRotate ? model.time : 0).move(0,0,-.8);
      while (lines.nChildren())
         lines.remove(0);
      if (P.length > 0 || sketches.length > 0) {
         let S = new Structure('lines');
         S.nSides(24).lineCap('round');
	 let addCurves = P => {
            for (let n = 0 ; n < P.length ; n++) {
               S.lineWidth(P[n].lineWidth ?? .01);
	       S.color(colors[P[n].colorIndex]);
	       S.curve(P[n]);
            }
	 }
	 addCurves(P);
         for (let i = 0 ; i < sketches.length ; i++)
	    addCurves(sketches[i]);
         S.build(lines);
         S.update();
      }
   });
}

