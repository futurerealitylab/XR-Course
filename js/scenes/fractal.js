import * as cg from "../render/core/cg.js";
import { loadSound, playSoundAtPosition, playLoopingSoundAtPosition02, 
         stopLoopingSound02, updateSound02Position} from "../util/positional-audio.js";
import { loadStereoSound, playStereoAudio } from "../util/stereo-audio.js";         
import { updateAvatars, avatars } from "../render/core/avatar.js";
import { G2 } from "../util/g2.js";
import { matchCurves } from "../render/core/matchCurves3D.js";
import { buttonState } from "../render/core/controllerInput.js";

/*
   To do:
       While holding a ball with one hand, you should be able to
       then hold down the trigger of the other controller to bring
       up a menu that lets you modify the color of the ball.
*/

// Audio Stuff

let createSoundBuffer = null;
let deleteSoundBuffer = null;
let dragSoundBuffer = null;
let backgroundSoundBuffer = null;


let drawSoundBuffer = null;
let magicSoundBuffer = null;

function preloadSounds() {
    Promise.all([
        loadSound('../../media/sound/SFXs/demoBalls/SFX_Ball_Create_Mono_01.wav', buffer => createSoundBuffer = buffer),
        loadSound('../../media/sound/SFXs/demoBalls/SFX_Ball_Delete_Mono_01.wav', buffer => deleteSoundBuffer = buffer),
        loadSound('../../media/sound/SFXs/demoBalls/SFX_Ball_Drag_Mono_LP_01.wav', buffer => dragSoundBuffer = buffer),
        loadStereoSound('../../media/sound/SFXs/demoMoon/Amb_Moon_Stereo_LP_01.wav', buffer => backgroundSoundBuffer = buffer)
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

server.init('balls', {}); // INITIALIZE GLOBAL STATE OBJECT.
let avatarTimer = 0;
let avatarTimer2 = 0;
let blinkTime = 0;
let blinkTime2 = 0;

const radius = 0.05; // ALL BALLS HAVE THE SAME RADIUS.

let ball;

let ballID = { left: -1, right: -1 }; // WHICH BALL IS IN EACH HAND?

let findBall = hand => {
   if (!balls) return 0;
   let dMin = 10000, idMin = -1;
   for (let id in balls) {
      let d = cg.distance(inputEvents.pos(hand), balls[id].pos);
      if (d < dMin) {
         dMin = d;
         idMin = id;
      }
   }
   return dMin < 2 * radius ? idMin : -1;
}

let msg = (op, id, hand, type = 1) => {
   return { op: op, id: id, pos: cg.roundVec(4, inputEvents.pos(hand)), type: type };
}

let msgPos = (op, id, position, type = 1) => {
   return { op: op, id: id, pos: position, type: type };
}

export const init = async model => {


let g2 = new G2(true);

   model.txtrSrc(1, g2.getCanvas());
   let wires = model.add();
   let drawings = [];


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
   //let helpMenu = model.add('square').move(0,1.5,0).scale(.5).txtr(1);

   let drawHelpMenu = () => {
      g2.setFont('helvetica');
      g2.setColor('#ff80ff80');
      g2.fillRect(-1,-1,2,2);
      g2.setColor('#ff80ff');
      g2.textHeight(.07);
      g2.fillText('Things you can draw', 0, .9, 'center');

      g2.textHeight(.05);
      g2.fillText('Stroke order:', -.9, .7);
      for (let i = 0 ; i < colors.length ; i++) {
         g2.setColor(colors[i]);
         g2.fillRect(-.27 + .1 * i, .655, .08, .08);
      }

      g2.textHeight(.055);
      g2.setColor('#ff80ff');
      let msg = (a,b,y) => {
         g2.fillText(a+b, -.9  , y, 'left');
         g2.fillText(a,   -.905, y, 'left');
      }
      msg('To draw:'   ,' Hold down the right trigger', -.60);
      msg('To erase:'  ,' Click the right trigger'    , -.725);
      msg('To animate:',' Click the left trigger'     , -.85);

      for (let n = 0 ; n < drawings.length ; n++) {
         let name    = drawings[n].name;
         let drawing = drawings[n].drawing;
         let x = -.75 + .5 * (n%4);
         let y =  .5 - .6 * (n/4>>0);
         g2.setColor('#ff80ff');
         g2.fillText(name, x, y, 'center');
         for (let i = 0 ; i < drawing.length ; i++) {
            g2.setColor(colors[i]);
            let path = [];
            let nj = drawing[i].length;
            for (let j = 0 ; j < nj ; j++) {
               let p = drawing[i][j];
               path.push([x + .08 * p[0], y - .2 + .08 * p[1]]);
            }
            g2.lineWidth(.005);
            g2.drawPath(path.slice(0, nj-1));
            g2.arrow(path[nj-2], cg.mix(path[nj-2], path[nj-1], .8));
            g2.lineWidth(.001);
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



   //----------------------DRAW ABOVE, FRACTAL BELOW-------------------------



   playStereoAudio(backgroundSoundBuffer);

   let dragDistance = { left: 0, right: 0 };
   let prevHandPos = { left: [0, 0, 0], right: [0, 0, 0] };
   let spawnDistance = 0.05;

   // HANDLE CONTROLLER EVENTS FROM THIS CLIENT.
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

//----------------------DRAW ABOVE, FRACTAL BELOW------------------------

      ballID[hand] = findBall(hand);

      let emptyObj = model.add().move(cg.roundVec(4, inputEvents.pos(hand)));
      let objPos = emptyObj.getGlobalMatrix();
      playLoopingSoundAtPosition02(dragSoundBuffer, [objPos[12], objPos[13], objPos[14]]);
      model.remove(emptyObj);
   };

   const dragHistorySize = 10;
   let dragHistory = { left: [], right: [] };

   function calculateAverageDrag(hand) {
      if (dragHistory[hand].length === 0) return 0;
      let sum = dragHistory[hand].reduce((a, b) => a + b, 0);
      return sum / dragHistory[hand].length;
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
      //----------------------DRAW ABOVE, FRACTAL BELOW------------------------
      let handPosition = cg.roundVec(4, inputEvents.pos(hand));

      let movement = Math.abs(handPosition[0] - prevHandPos[hand][0]) +
                     Math.abs(handPosition[1] - prevHandPos[hand][1]) +
                     Math.abs(handPosition[2] - prevHandPos[hand][2]);

      dragDistance[hand] += movement;
      if (!dragHistory[hand]) dragHistory[hand] = [];
      dragHistory[hand].push(movement);

      if (dragHistory[hand].length > dragHistorySize) {
         dragHistory[hand].shift(); // Remove oldest entry
      }

      if (dragDistance[hand] >= spawnDistance) {
         let id = findBall(hand);
         for (id = 0; balls[id] !== undefined; id++);
         //server.send('balls', msg('create', id, hand, 1));
         dragDistance[hand] = 0;
      }

      let avgDragDistance = calculateAverageDrag(hand);

      model.setUniform('1f', `uAvgDragDistance${hand.charAt(0).toUpperCase()}`, avgDragDistance);

      prevHandPos[hand] = handPosition;
   };

   inputEvents.onMove = hand => {
      if (inputEvents.isPressed(hand)) return;
      if (!dragHistory[hand]) dragHistory[hand] = [];
      dragHistory[hand].push(0);

      if (dragHistory[hand].length > dragHistorySize) {
         dragHistory[hand].shift();
      }
   };

   inputEvents.onRelease = hand => {
      if (hand == 'right')
         isDrawing = false;

      //----------------------DRAW ABOVE, FRACTAL BELOW------------------------

      ballID[hand] = -1;
      stopLoopingSound02();
      dragDistance[hand] = 0;
   };

   inputEvents.onDoublePress = hand => {
      // Optionally delete all balls on double press.
      // for (let id in balls) {
      //     server.send('balls', msg('delete', id, hand));
      // }
   };

   inputEvents.onClick = hand => {
      if (hand == 'right') {
         ST = null;
         mode = null;
         strokes = [];
         timer = 0;
         buildWires(strokes);
      }
      //----------------------DRAW ABOVE, FRACTAL BELOW------------------------
      
      // let id = findBall(hand);
      // let handPosition = cg.roundVec(4, inputEvents.pos(hand)); // Use the hand's position
      // if (id >= 0) {
      //    server.send('balls', msg('delete', id, hand));
      //    // Optionally play a delete sound:
      //    // if (deleteSoundBuffer) playSoundAtPosition(deleteSoundBuffer, handPosition);
      // } else {
      //    for (id = 0; balls[id] !== undefined; id++); // Find an unused ID.
      //    server.send('balls', msg('create', id, hand, 1));
      //    // Optionally play a create sound:
      //    // if (createSoundBuffer) playSoundAtPosition(createSoundBuffer, handPosition);
      // }
      
   };

   let N = 50000;
   let fractalData1 = [];
   let worldCenter = [0, 0, 0];

   function random1(x) {
      let r = Math.sin(x * 1298461.13817 + 9847161.1231);
      return r - Math.floor(r);
   }
   model.txtrSrc(10, '../media/textures/particles-glow.png');


   let glyphToID = (g)=>{
      if(g=='square')
         return 0;
      if(g=='triangle')
         return 3;
      if(g=='star')
         return 2;
      if(g=='crescent')
         return 1;
      return -1;
   }

   let currentGlyphName = "";
   timer = 0;
   let isMorphing = false;
   //--------------------------------ANIMATE---------------------------------------
   let frameCount = 0;
   model.animate(() => {
      avatarTimer += 0.005 * (cg.noise(model.time,model.time,model.time)/2+0.5);
      avatarTimer2 += 0.002 * (cg.noise(model.time,model.time,model.time));
      while (model.nChildren() > 0)
         model.remove(0);


      wires = model.add();
      wires.flag('uWireTexture');

      if(buttonState.right[4].pressed){
         if (strokes.length > 0 && strokes[0].length > 1) {
            ST = matchCurves.recognize(strokes);
            mode = 'morph';
            timer = 0;

            let emptyObj = model.add().move(cg.roundVec(4, inputEvents.pos(hand)));
            let objPos = emptyObj.getGlobalMatrix();
            playSoundAtPosition(magicSoundBuffer, [objPos[12], objPos[13], objPos[14]]);
            model.remove(emptyObj);
         }
      }


   //drawHelpMenu();


   let curves = [];
   for (let n = 0 ; n < strokes.length ; n++)
      curves.push(matchCurves.resample(strokes[n], 100));

   buildWires(curves);

   //calculate center of the first stroke
   let curvePos = inputEvents.pos('right');
   let totalPos = [0,0,0];
   if(curves[0]){
      let len = curves[0].length;
      for (let i = 0 ; i < len ; i++){
         totalPos[0] += curves[0][i][0];
         totalPos[1] += curves[0][i][1];
         totalPos[2] += curves[0][i][2];
      }
      curvePos[0] = totalPos[0] / len;
      curvePos[1] = totalPos[1] / len;
      curvePos[2] = totalPos[2] / len;
   }
   if(!curvePos || !curvePos[0] || curvePos[0] == NaN){
      curvePos = inputEvents.pos('right');
   }

   if (ST && mode == 'morph') {
      timer += 1.8 * model.deltaTime;
      if (timer < 1) {                         // MORPH AFTER RECOGNIZING
         strokes = matchCurves.mix(ST[0], ST[1], cg.ease(timer));
         buildWires(strokes);
      }
      else {                                   // ANIMATE AFTER MORPHING
         isMorphing = true;
         let glyph = matchCurves.glyph(ST[2]);
         if (glyph.code) {
            strokes = glyph.code(timer - 1, ST[3]);
            buildWires(strokes);
         }

         if(glyph.name && (currentGlyphName != glyph.name)){
            currentGlyphName = glyph.name;
            let glyphID = glyphToID(currentGlyphName);
            if(glyphID >= 0){  
               let id = findBall('right');
               for (id = 0; balls[id] !== undefined; id++);
               server.send('balls', msgPos('create', id, curvePos, glyphID));
            }
         }
      }

      if(timer > 2.5){
         isMorphing = false;
      }
   }
   model.setUniform('1f', 'uDrawingOpacity', Math.min(1.0, Math.max(0.0, 2.0 - timer)));
   model.setUniform('1f', 'uParticleOpacity', !isMorphing ? 1.0 : 1.0 - Math.min(1.0, Math.max(0.0, 2.0 - timer)));

   //----------------------DRAW ABOVE, FRACTAL BELOW-------------------------



      model.customShader(`
          uniform int uFractalBall, uFractalBackground,uController,uHead,uBody,uEyee;
          uniform float uParticleCount, uAvgDragDistanceR, uAvgDragDistanceL;
          uniform float uDrawingOpacity, uParticleOpacity;
          --------------------------
         if (uHead == 1) {
            apos.xyz += noise(apos.xyz + uTime * .5) * aNor * .2;
            pos.xyz = obj2Clip(apos.xyz);
         }
         if (uBody == 1) {
            apos.xyz += noise(apos.xyz + uTime * .5) * aNor * .5;
            pos.xyz = obj2Clip(apos.xyz);
         }
        

          *********************

          // Specify precision for the vertex shader.
          uniform highp int uFractalBall, uFractalBackground, uWireTexture,uController,uHead,uBody,uEyee;
          uniform highp float uParticleCount, uAvgDragDistanceR, uAvgDragDistanceL;
          uniform highp float uDrawingOpacity, uParticleOpacity;

          float frac(float p){
            return p - floor(p);
          }

          float sin01(float p){
            return .5 + sin(p) * .5;
          }
          --------------------------
           if (uEyee == 1) {
         color = vec3(0.02);
            //opacity = .8;
         }
         if (uHead == 1) {
         color = vec3(1.);
            opacity = .8;
         }
            if (uBody == 1) {
         color = vec3(1.);
            opacity = .8;
         }
          if(uController == 1){
            color = vec3(1., .95, 0.56);
            opacity = .9;
          }
            
          if (uFractalBall == 1){
            if(vUV.x < 0. ){
               color = vec3(1., .8, .0);
            }
            else{
               color = vec3(sin01(worldPosition.x), sin01(worldPosition.y), sin01(worldPosition.z));
               color += .5;
            }
            opacity *= uParticleOpacity;
          }

          if (uFractalBackground == 1) {
            float y = vPos.y / 1000.;
            y = smoothstep(-.5, 1.5, y);

            float t = min(1., max(0., (uParticleCount - 200.) * .0002));

            vec3 colorUp = vec3(.5, .3, .7) * .2;
            vec3 colorDown = vec3(0.);
            color = mix(colorUp, colorDown, 1. - (y * t));
          }

         if (uWireTexture == 1) {
            float t = .5 + noise(400. * vAPos + 5. * vec3(0.,0.,mod(uTime, 100.)));
            float u = dot(eye, normal);
            t = t * t * (3. - t - t);
            opacity = 30. * pow(t, 9.) * u * u;
            color.g *= .02 * opacity;
            opacity *= uDrawingOpacity;
         }
       `);

      // RESPOND TO MESSAGES SENT FROM ALL CLIENTS.
      server.sync('balls', (msgs, msg_clientID) => {
         for (let id in msgs) {
            let msg = msgs[id];
            if (msg.op == 'delete') {
               if (balls[msg.id] != null) {
                  if (deleteSoundBuffer) {
                     let emptyObj = model.add().move(msg.pos);
                     let objPos = emptyObj.getGlobalMatrix();
                     // playSoundAtPosition(deleteSoundBuffer, [objPos[12], objPos[13], objPos[14]]);
                     model.remove(emptyObj);
                  }
               }
               delete balls[msg.id];
            } else {
               if (balls[msg.id] == null) {
                  if (createSoundBuffer) {
                     let emptyObj = model.add().move(msg.pos);
                     let objPos = emptyObj.getGlobalMatrix();
                     // Optionally play a create sound:
                     // playSoundAtPosition(createSoundBuffer, [objPos[12], objPos[13], objPos[14]]);
                     model.remove(emptyObj);
                  }
               }
               balls[msg.id] = { pos: msg.pos, type: msg.type };
            }
         }
      });

      let worldCenter = [0, 0, 0];
      let ceilingHeight = 10;

      // MAKE BALLS MOVE
      for (let id in balls) {
         let ballObj = balls[id];
         if (!ballObj) continue;
         let pos = ballObj.pos;
         if (!ballObj.pos) continue;
         let dir = [
             pos[0] - worldCenter[0],
             pos[1] - worldCenter[1],
             pos[2] - worldCenter[2]
         ];
     
         let length = Math.sqrt(dir[0] ** 2 + dir[1] ** 2 + dir[2] ** 2);
         if (length > 0) {
             dir = [dir[0] / length, dir[1] / length, dir[2] / length];
         }
   
         let speed = 0.004 + 0.0015 * random1(id);
         ballObj.pos = [
             pos[0] + dir[0] * speed,
             pos[1] + dir[1] * speed,
             pos[2] + dir[2] * speed
         ];
      }
     
      // updateAvatars(model);

      // let a = model.add().move(0, 1.6, 0).scale(1);
      // for (let n in clients) {
      //    a._children.push(avatars[clients[n]].getRoot());
      // }
   
      // RENDER THE 3D SCENE.

      let background = model.add('sphere').scale(1000, 1000, -1000).flag('uFractalBackground');

      let avatarFake = model.add().move(0,1,0).scale(.8);
      let avatarFakeHead = avatarFake.add('sphere').scale(0.1).color(1,1,1)
      .turnX(Math.sin(5 * avatarTimer))
      .turnZ(Math.sin(avatarTimer2))
      .turnY(0.6)
      .flag('uHead');
      let eyeDist = 0.4;
      let eyeHeight = 0.1;
      let t = model.time;
      if (t > blinkTime)
         blinkTime = t + 1.5 + 2 * Math.random();
      let eyeScale = blinkTime - t > .1 ? .16 : 0.0;
      let avatarFakeBody = avatarFake.add('sphere').scale(0.12, 0.4, 0.12).move(0,-1.1,0).color(1,1,1).flag('uBody');
      let avatarFakeEyeR = avatarFakeHead.add('sphere').move(eyeDist, eyeHeight, 1.1).scale(eyeScale, eyeScale, .01).color(0, 0, 0).flag('uEyee');
      let avatarFakeEyeL = avatarFakeHead.add('sphere').move(-eyeDist, eyeHeight, 1.1).scale(eyeScale,eyeScale, .01).color(0, 0, 0).flag('uEyee');

      let avatarFake2 = model.add().move(1,1.1,0).scale(.8);
      let avatarFakeHead2 = avatarFake2.add('sphere').scale(0.1).color(1,1,1)
      //.turnX(Math.sin(avatarTimer + 0.145))
      .turnZ(Math.sin(5 * avatarTimer + 0.1))
      .turnY(-1.57).flag('uHead');
      let t2 = model.time + 374.4891;
      if (t2 > blinkTime2)
         blinkTime2 = t2 + 1.5 + 2 * Math.random();
      let eyeScale2 = blinkTime2 - t2 > .1 ? .3 : 0.01;
      let avatarFakeBody2 = avatarFake2.add('sphere').scale(0.12, 0.4, 0.12).move(0,-1.1,0).color(1,1,1).flag('uBody');
      let avatarFakeEyeR2 = avatarFakeHead2.add('sphere').move(eyeDist, eyeHeight, 1.1).scale(eyeScale, eyeScale, .01).color(0, 0, 0).flag('uEyee');
      let avatarFakeEyeL2 = avatarFakeHead2.add('sphere').move(-eyeDist, eyeHeight, 1.1).scale(eyeScale, eyeScale, .01).color(0, 0, 0).flag('uEyee');

      fractalData1 = [];
      fractalData1.push({ s: 0.00001, p: [0, 0, 0] });

      // Example: Uncomment the following line to add a visual aid.
      // model.add('tubeY').move(worldCenter).color('white').scale(.001, 100, .001).dull();

      let uvs = [[0, 0, .5, .5], [.5, .5, 1, 1], [0, .5, .5, 1], [.5, 0, 1, .5]];
      function createFractalArm(id, position, scale, depth, uv, type, isFirst = false) {
         if (!position || depth === 0 || fractalData1.length >= N) return;
         
         let expansionFactor = 1.5 * scale;
         let heightFactor = 0.75 * scale;
         let scaleGrowth = 1.8;
         let angleStep = (Math.PI * 2) / 6; // 6 symmetric copies
     
         // Compute the base direction from world center.
         let direction = [
             position[0] - worldCenter[0],
             0,
             position[2] - worldCenter[2]
         ];
         let length = Math.sqrt(direction[0] ** 2 + direction[1] ** 2 + direction[2] ** 2);

         let nDirection = direction;
         if (length !== 0) { // Avoid division by zero.
            nDirection = [
               direction[0] / length,
               direction[1] / length,
               direction[2] / length
            ];
         }
         let baseAngle = Math.atan2(direction[2], direction[0]); // Angle relative to center.
     
         // Create 6 mirrored particles.
         for (let i = 0; i < 6; i++) {
             let angle = baseAngle + i * angleStep;
             let mirroredPos = [
                 worldCenter[0] + Math.cos(angle) * Math.sqrt(direction[0] ** 2 + direction[2] ** 2),
                 position[1], // Keep the same height.
                 worldCenter[2] + Math.sin(angle) * Math.sqrt(direction[0] ** 2 + direction[2] ** 2)
             ];
             if (mirroredPos[1] > ceilingHeight) {
               mirroredPos[1] = ceilingHeight - mirroredPos[1] + ceilingHeight;
             }
             let randomInt = Math.floor(random1(id * 100 + i) * 4);
             fractalData1.push({ s: scale * 0.8 * (isFirst ? 10.0 : 1.0), p: mirroredPos, t: uvs[type] });
         }
     
         let newPosUp = [
             position[0] + nDirection[0] * expansionFactor,
             position[1] + heightFactor + nDirection[1] * expansionFactor,
             position[2] + nDirection[2] * expansionFactor
         ];
         createFractalArm(id + 10, newPosUp, scale * scaleGrowth, depth - 1, uv, type);
      }


      //createFractalArm(0, inputEvents.pos('right'), 0.15, 1, [-1, -1, 0, 0], 0);

      for (let id in balls) {
         createFractalArm(id, balls[id].pos, 0.02, 7, [0, 0, 1, 1], balls[id].type, true);

         if (Math.abs(balls[id].pos[0]) > 50 ||
             Math.abs(balls[id].pos[1]) > 50 ||
             Math.abs(balls[id].pos[2]) > 50) {
             server.send('balls', msg('delete', id, 'left'));
             delete balls[id];
         }
      }

      let particles = model.add('particles')
                           .info(N)
                           .txtr(10)
                           .flag('uFractalBall');
      particles.setParticles(fractalData1);
      
      model.setUniform('1f', 'uParticleCount', fractalData1.length);
      model.setUniform('1f', 'uAvgDragDistanceL', calculateAverageDrag('left'));
      model.setUniform('1f', 'uAvgDragDistanceR', calculateAverageDrag('right'));

      if (!balls) {
         server.init('balls', {});  
      }
   });
};
