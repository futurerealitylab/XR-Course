import * as cg from "../render/core/cg.js";
import { loadSound, playSoundAtPosition, playLoopingSoundAtPosition02, 
         stopLoopingSound02, updateSound02Position} from "../util/positional-audio.js";
import { loadStereoSound, playStereoAudio } from "../util/stereo-audio.js";         
import { updateAvatars, avatars } from "../render/core/avatar.js";

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

const radius = 0.05; // ALL BALLS HAVE THE SAME RADIUS.

let ball;

let ballID = { left: -1, right: -1 }; // WHICH BALL IS IN EACH HAND?

// Update findBall to use ball.pos (since each ball is now { pos, type }).
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

// Create a message object that now includes a ball type (defaulting to 1).
let msg = (op, id, hand, type = 1) => {
   return { op: op, id: id, pos: cg.roundVec(4, inputEvents.pos(hand)), type: type };
}

export const init = async model => {
   playStereoAudio(backgroundSoundBuffer);

   let dragDistance = { left: 0, right: 0 };
   let prevHandPos = { left: [0, 0, 0], right: [0, 0, 0] };
   let spawnDistance = 0.05;

   // HANDLE CONTROLLER EVENTS FROM THIS CLIENT.
   inputEvents.onPress = hand => {
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
         // Find an unused ID.
         for (id = 0; balls[id] !== undefined; id++);
         // Send a create message; here we send a default type of 1.
         server.send('balls', msg('create', id, hand, 1));
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
         dragHistory[hand].shift(); // Remove oldest entry
      }
   };

   inputEvents.onRelease = hand => {
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
      let id = findBall(hand);
      let handPosition = cg.roundVec(4, inputEvents.pos(hand)); // Use the hand's position
      if (id >= 0) {
         server.send('balls', msg('delete', id, hand));
         // Optionally play a delete sound:
         // if (deleteSoundBuffer) playSoundAtPosition(deleteSoundBuffer, handPosition);
      } else {
         for (id = 0; balls[id] !== undefined; id++); // Find an unused ID.
         server.send('balls', msg('create', id, hand, 1));
         // Optionally play a create sound:
         // if (createSoundBuffer) playSoundAtPosition(createSoundBuffer, handPosition);
      }
   };

   let N = 50000;
   let fractalData1 = [];
   let worldCenter = [0, 0, 0];

   function random1(x) {
      let r = Math.sin(x * 1298461.13817 + 9847161.1231);
      return r - Math.floor(r);
   }
   model.txtrSrc(10, '../media/textures/particles-glow.png');

   let frameCount = 0;
   model.animate(() => {
      model.customShader(`
          uniform int uFractalBall, uFractalBackground;
          uniform float uParticleCount, uAvgDragDistanceR, uAvgDragDistanceL;
          --------------------------
        if (uFractalBall == 1) {
            // Example: apply a rotation if needed.
        }
        

          *********************

          // Specify precision for the vertex shader.
          uniform highp int uFractalBall, uFractalBackground;
          uniform highp float uParticleCount, uAvgDragDistanceR, uAvgDragDistanceL;

          float frac(float p){
            return p - floor(p);
          }

          float sin01(float p){
            return .5 + sin(p) * .5;
          }
          --------------------------
          if (uFractalBall == 1){
            if(vUV.x < 0. ){
               color = vec3(1., .8, .0);
            }
            else{
               color = vec3(sin01(worldPosition.x), sin01(worldPosition.y), sin01(worldPosition.z));
               color += .5;
            }
          }

          if (uFractalBackground == 1) {
            float y = vPos.y / 1000.;
            y = smoothstep(-.5, 1.5, y);

            float t = min(1., max(0., (uParticleCount - 200.) * .0002));

            vec3 colorUp = vec3(.5, .3, .7) * .2;
            vec3 colorDown = vec3(0.);
            color = mix(colorUp, colorDown, 1. - (y * t));
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
                     // Optionally play a delete sound:
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
               // Store the ball with both position and type.
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
     
      updateAvatars(model);

      let a = model.add().move(0, 1.6, 0).scale(1);
      for (let n in clients) {
         a._children.push(avatars[clients[n]].getRoot());
      }
   
      // RENDER THE 3D SCENE.
      while (model.nChildren() > 0)
         model.remove(0);

      let background = model.add('sphere').scale(1000, 1000, -1000).flag('uFractalBackground');

      fractalData1 = [];
      fractalData1.push({ s: 0.00001, p: [0, 0, 0] });

      // Example: Uncomment the following line to add a visual aid.
      // model.add('tubeY').move(worldCenter).color('white').scale(.001, 100, .001).dull();

      let uvs = [[0, 0, .5, .5], [.5, .5, 1, 1], [0, .5, .5, 1], [.5, 0, 1, .5]];
      function createFractalArm(id, position, scale, depth, uv) {
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
             fractalData1.push({ s: scale * 0.8, p: mirroredPos, t: uvs[randomInt] });
         }
     
         // Recursively generate the next level.
         let newPosUp = [
             position[0] + nDirection[0] * expansionFactor,
             position[1] + heightFactor + nDirection[1] * expansionFactor,
             position[2] + nDirection[2] * expansionFactor
         ];
         createFractalArm(id + 10, newPosUp, scale * scaleGrowth, depth - 1, uv);
      }

      // Example fractal arm for the right hand.
      createFractalArm(0, inputEvents.pos('right'), 0.15, 1, [-1, -1, 0, 0]);

      // Generate fractal arms for each ball.
      for (let id in balls) {
         // Pass the ball's position (balls[id].pos) instead of the whole object.
         createFractalArm(id, balls[id].pos, 0.02, 7, [0, 0, 1, 1]);

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
