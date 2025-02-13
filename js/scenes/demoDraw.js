import * as cg from "../render/core/cg.js";
import { G2 } from "../util/g2.js";
import { matchCurves } from "../render/core/matchCurves3D.js";

import { loadSound, playSoundAtPosition, playLoopingSoundAtPosition02, 
         stopLoopingSound02, updateSound02Position } from "../util/positional-audio.js";


// Audio Stuff

let drawSoundBuffer = null;
let magicSoundBuffer = null;

function preloadSounds() {
    Promise.all([
        loadSound('../../media/sound/SFXs/demoDraw/SFX_Draw_Magic_Mono_01.wav', buffer => magicSoundBuffer = buffer),
        loadSound('../../media/sound/SFXs/demoBalls/SFX_Ball_Drag_Mono_LP_01.wav', buffer => drawSoundBuffer = buffer)

    ])
    .then(() => {
        //console.log('All sounds loaded successfully');
    })
    .catch(error => {
        //console.error('An error occurred while loading sounds:', error);
    });
}


// Call this function at the start of application
preloadSounds();

export const init = async model => {
   let g2 = new G2().setAnimate(false);

   model.txtrSrc(1, g2.getCanvas());

   let drawings = [];

   model.customShader(`
      uniform int uWireTexture;
      --------------------------
      if (uWireTexture == 1) {
         float t = .5 + noise(400. * vAPos + 5. * vec3(0.,0.,mod(uTime, 100.)));
         float u = dot(eye, normal);
         t = t * t * (3. - t - t);
         opacity = 30. * pow(t, 9.) * u * u;
         color.g *= .02 * opacity;
      }
   `);
   let wires = model.add();
   wires.flag('uWireTexture');

   let addGlyphFromCurves = (name, drawing, f) => {
      matchCurves.addGlyphFromCurves(name, drawing, f);
      drawings.push({name: name, drawing: drawing});
   }

   // RED ORANGE YELLOW GREEN BLUE INDIGO VIOLET PINK WHITE GRAY BLACK BROWN

   let colors = [
      'red',
      '#ff8000',
      'yellow',
      '#40ff40',
      '#2080ff',
      '#9000ff',
      '#ff00a0',
      '#ff80c0',
      'white',
      '#606060',
      'black',
      '#400000',
   ];

   let helpMenu = model.add('square').move(.64,1.5,.5).turnY(-.8).scale(.125).txtr(1);

   g2.render = function() {
console.log('------------------');
      this.setFont('helvetica');
      this.setColor('#ff80ff80');
      this.fillRect(-1,-1,2,2);
      this.setColor('#ff80ff');
      this.textHeight(.07);
      this.fillText('Things you can draw', 0, .9, 'center');

      this.textHeight(.05);
      this.fillText('Stroke order:', -.9, .7);
      for (let i = 0 ; i < colors.length ; i++) {
         this.setColor(colors[i]);
         this.fillRect(-.27 + .1 * i, .655, .08, .08);
      }

      this.textHeight(.055);
      this.setColor('#ff80ff');
      let msg = (a,b,y) => {
         this.fillText(a+b, -.9  , y, 'left');
         this.fillText(a,   -.905, y, 'left');
      }
      msg('To draw:'   ,' Hold down the right trigger', -.60);
      msg('To erase:'  ,' Click the right trigger'    , -.725);
      msg('To animate:',' Click the left trigger'     , -.85);

      for (let n = 0 ; n < drawings.length ; n++) {
         let name    = drawings[n].name;
         let drawing = drawings[n].drawing;
         let x = -.75 + .5 * (n%4);
         let y =  .5 - .6 * (n/4>>0);
         this.setColor('#ff80ff');
         this.fillText(name, x, y, 'center');
         for (let i = 0 ; i < drawing.length ; i++) {
            this.setColor(colors[i]);
            let path = [];
            let nj = drawing[i].length;
            for (let j = 0 ; j < nj ; j++) {
               let p = drawing[i][j];
               path.push([x + .08 * p[0], y - .2 + .08 * p[1]]);
            }
            this.lineWidth(.005);
            this.drawPath(path.slice(0, nj-1));
            this.arrow(path[nj-2], cg.mix(path[nj-2], path[nj-1], .8));
            this.lineWidth(.001);
         }
      }
   }

   let strokes = [], ST = null, mode = null, timer;
   let isDrawing = false;

   let strokes_animate = (strokes, m, time, T) => {
      m = cg.mMultiply(cg.mTranslate(T[0],T[1],T[2]),
          cg.mMultiply(cg.mScale(T[3],T[3],T[3]*cg.ease(time/2)), m));
      return strokes_transform(strokes, m);
   }

   let resample = (src, ns) => {
      ns = ns !== undefined ? ns : 20;
      let dst = [];
      for (let n = 0 ; n < src.length ; n++)
         dst.push(matchCurves.resample(src[n], ns));
      return dst;
   }

   let strokes_transform = (src, m) => {
      let dst = [];
      for (let n = 0 ; n < src.length ; n++) {
         let stroke = [];
         for (let i = 0 ; i < src[n].length ; i++)
            stroke.push(cg.mTransform(m, src[n][i]));
         dst.push(matchCurves.resample(stroke, 20));
      }
      return dst;
   }

   let triangle = [ [ [0,1,0],[-.866,-.5,0],[.866,-.5,0],[0,1,0] ] ];

   let square = [ [ [-1,1,0],[-1,-1,0],[1,-1,0],[1,1,0],[-1,1,0] ] ];

   let pentagon = [ [
      [    0,    1,0],
      [-.951, .309,0],
      [-.588,-.809,0],
      [ .588,-.809,0],
      [ .951, .309,0],
      [    0,    1,0],
   ] ];

   let star = [ [
      [    0,    1,0],
      [-.588,-.809,0],
      [ .951, .309,0],
      [-.951, .309,0],
      [ .588,-.809,0],
      [    0,    1,0],
   ] ];

   let crescent = [[]];
   for (let n = 0 ; n <= 32 ; n++) {
      let x = -Math.sin(2*Math.PI * n / 32);
      let y =  Math.cos(2*Math.PI * n / 32);
      if (n >= 24) {
         let u = x, v = y;
         x = 1 - v;
         y = 1 - u;
      }
      crescent[0].push([x,y,0]);
   }

   let cube = [];
   for (let u = -1 ; u <= 1 ; u += 2)
   for (let v = -1 ; v <= 1 ; v += 2) {
      cube.push([ [u,v,-1], [u,v,1] ]);
      cube.push([ [v,-1,u], [v,1,u] ]);
      cube.push([ [-1,u,v], [1,u,v] ]);
   }

   let bird = time => {
      let theta1 = Math.sin(2 * time - 2.8) * .4 - .6;
      let theta2 = Math.cos(2 * time - 2.8) * .8;
      let C1 = .7 * Math.cos(theta1), S1 = .7 * Math.sin(theta1);
      let C2 = .7 * Math.cos(theta2), S2 = .7 * Math.sin(theta2);
      let c = [ 0, .1 + .5 * S1, 0 ];
      let b = [ c[0] - C1, c[1] - S1, 0 ];
      let a = [ b[0] - C2, b[1] + S2, 0 ];
      let d = [ c[0] + C1, c[1] - S1, 0 ];
      let e = [ d[0] + C2, d[1] + S2, 0 ];
      return [ [ a, b, c, d, e ] ];
   }

   let fish = time => {
      let S = .1 * Math.sin(4 * time);
      let dst = [
         cg.spline([
            [-1-.2*S,.3-S,0],
            [-.3,0,0],
            [.7,-.3,0],
            [1.05,0,0],
            [.7,.3,0],
            [-.3,0,0],
            [-1+.2*S,-.3-S,0]
         ]),
         [ [-1-.2*S,.3-S,0], [-1+.2*S,-.3-S,0] ],
      ];
      if (time > 0)
         dst.push([ [.55,.1,0], [.7,.1,0] ]);
      return dst;
   }

   let moon = time => {
      let hanzi = [
         [ [-.5,1,0],[-.5,-1,0] ],
         [ [-.5,1,0],[.5,1,0],[.5,-1,0] ],
         [ [-.5,.5,0],[.5,.5,0] ],
         [ [-.5,0,0],[.5,0,0] ],
      ];
      let shape = [
         cg.spline([[0,1,0],[0,0,0],[-.5,-1,0]]),
         cg.spline([[0,1,0],[.6,.4,0],[.6,-.3,0],[.25,-.75,0],[-.5,-1,0]]),
         [ [0,.1,0],[0,.11,0] ],
         [ [0,0,0],[0,.01,0] ],
      ];

      let t = cg.ease(time);

      let dst = [];
      for (let n = 0 ; n < hanzi.length ; n++) {
         dst.push([]);
         let a = cg.resampleCurve(hanzi[n], 20);
         let b = cg.resampleCurve(shape[n], 20);
         for (let i = 0 ; i < a.length ; i++)
            dst[n].push(cg.mix(a[i], b[i], t));
      }
      return dst;
   }

   addGlyphFromCurves('triangle', triangle, (time, T) =>
      matchCurves.animate(() => triangle, cg.mIdentity(), time, T));

   addGlyphFromCurves('square', square, (time, T) =>
      matchCurves.animate(() => square, cg.mIdentity(), time, T));

   addGlyphFromCurves('star', star, (time, T) =>
      matchCurves.animate(() => star, cg.mIdentity(), time, T));

   addGlyphFromCurves('crescent', crescent, (time, T) =>
      matchCurves.animate(() => crescent, cg.mIdentity(), time, T));

   addGlyphFromCurves('bird', bird(0), (time,T) =>
      matchCurves.animate(time => bird(time), cg.mIdentity(), time, T));

   addGlyphFromCurves('fish', fish(0), (time,T) =>
      matchCurves.animate(time => fish(time), cg.mIdentity(), time, T));

   addGlyphFromCurves('moon', moon(0), (time,T) =>
      matchCurves.animate(time => moon(time), cg.mIdentity(), time, T));

   let buildWires = curves => {
      while (wires.nChildren() > 0)
         wires.remove(0);
      for (let n = 0 ; n < curves.length ; n++)
         if (curves[n].length > 1) {
            let outer = wires.add(clay.wire(curves[n].length, 6, n));
            let inner = wires.add(clay.wire(curves[n].length, 6, n + 100));
            clay.animateWire(outer, .006, t => cg.sample(curves[n], t));
            clay.animateWire(inner, .003, t => cg.sample(curves[n], t));
         }
   }

   inputEvents.onPress = hand => {
      if (hand == 'right') {
         isDrawing = true;
         mode = 'draw';
         strokes.push([]);

         let emptyObj = model.add().move(cg.roundVec(4, inputEvents.pos(hand)));
         let objPos = emptyObj.getGlobalMatrix();
         playLoopingSoundAtPosition02(drawSoundBuffer, [objPos[12], objPos[13], objPos[14]]);
         model.remove(emptyObj);
      }
   }

   inputEvents.onDrag = hand => {
      if (hand == 'right'){
  
         for(let i=0;i<1000;i++)
         strokes[strokes.length-1].push(inputEvents.pos(hand));

         let emptyObj = model.add().move(cg.roundVec(4, inputEvents.pos(hand)));
         let objPos = emptyObj.getGlobalMatrix();
         updateSound02Position([objPos[12], objPos[13], objPos[14]]);
         model.remove(emptyObj);
      }

   }

   inputEvents.onRelease = hand => {
      if (hand == 'left')
         if (strokes.length > 0 && strokes[0].length > 1) {
            ST = matchCurves.recognize(strokes);
            mode = 'morph';
            timer = 0;

            let emptyObj = model.add().move(cg.roundVec(4, inputEvents.pos(hand)));
            let objPos = emptyObj.getGlobalMatrix();
            playSoundAtPosition(magicSoundBuffer, [objPos[12], objPos[13], objPos[14]]);
            model.remove(emptyObj);
         }
      if (hand == 'right')
         isDrawing = false;

      stopLoopingSound02();

   }

   inputEvents.onClick = hand => {
      if (hand == 'right') {
         ST = null;
         mode = null;
         strokes = [];
         buildWires(strokes);
      }
   }

   model.animate(() => {

      g2.update();

      if (isDrawing) {
         let curves = [];
	 for (let n = 0 ; n < strokes.length ; n++)
	    curves.push(matchCurves.resample(strokes[n], 100));
         buildWires(curves);
      }
      if (ST && mode == 'morph') {
         timer += 1.8 * model.deltaTime;
         if (timer < 1) {                         // MORPH AFTER RECOGNIZING
            strokes = matchCurves.mix(ST[0], ST[1], cg.ease(timer));
            buildWires(strokes);
         }
         else {                                   // ANIMATE AFTER MORPHING
            let glyph = matchCurves.glyph(ST[2]);
            if (glyph.code) {
               strokes = glyph.code(timer - 1, ST[3]);
               buildWires(strokes);
            }
         }
      }
   });
}

