import * as cg from "../render/core/cg.js";
import { loadSound, playSoundAtPosition, playLoopingSoundAtPosition02, 
         stopLoopingSound02, updateSound02Position} from "../util/positional-audio.js";
import { loadStereoSound, playStereoAudio } from "../util/stereo-audio.js";         


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


server.init('balls', {});             // INITIALIZE GLOBAL STATE OBJECT.

const radius = 0.05;                  // ALL BALLS HAVE THE SAME RADIUS.

let ball;

let ballID = { left: -1, right: -1 }; // WHICH BALL IS IN EACH HAND?

let findBall = hand => {              // FIND THE BALL LOCATED AT THE
   if(!balls) return 0;
   let dMin = 10000, idMin = -1;      // 'left' OR 'right' HAND, IF ANY.
   for (let id in balls) {
      let d = cg.distance(inputEvents.pos(hand), balls[id]);
      if (d < dMin) {
         dMin = d;
         idMin = id;
      }
   }
   return dMin < 2 * radius ? idMin : -1;
}

// FUNCTION TO CREATE A MESSAGE OBJECT.

let msg = (op, id, hand) => {
   return { op: op, id: id, pos: cg.roundVec(4, inputEvents.pos(hand)) };
}



export const init = async model => {
   playStereoAudio(backgroundSoundBuffer);

   let dragDistance = {left: 0, right: 0};
   let prevHandPos = {left: [0,0,0], right: [0,0,0]};
   let spawnDistance = 0.05;

   // HANDLE CONTROLLER EVENTS FROM THIS CLIENT.
   inputEvents.onPress = hand => {
      ballID[hand] = findBall(hand);

      let emptyObj = model.add().move(cg.roundVec(4, inputEvents.pos(hand)));
      let objPos = emptyObj.getGlobalMatrix();
      playLoopingSoundAtPosition02(dragSoundBuffer, [objPos[12], objPos[13], objPos[14]]);
      model.remove(emptyObj);

   }

   inputEvents.onDrag = hand => {


      let emptyObj = model.add().move(cg.roundVec(4, inputEvents.pos(hand)));
      let objPos = emptyObj.getGlobalMatrix();
      updateSound02Position([objPos[12], objPos[13], objPos[14]]);
      model.remove(emptyObj);


      if (ballID[hand] >= 0){
         server.send('balls', msg('move', ballID[hand], hand));

      }
      else{
         let handPosition = cg.roundVec(4, inputEvents.pos(hand));
         dragDistance[hand] +=   Math.abs(handPosition[0] - prevHandPos[hand][0])+
                           Math.abs(handPosition[1] - prevHandPos[hand][1])+
                           Math.abs(handPosition[2] - prevHandPos[hand][2]);
         if(dragDistance[hand] >= spawnDistance){
            let id = findBall(hand);
            for (id = 0; balls[id] !== undefined; id++); // FIND AN UNUSED ID.
            server.send('balls', msg('create', id, hand));
            dragDistance[hand] = 0;
         }
         prevHandPos[hand] = handPosition;
      }
   }

   inputEvents.onRelease = hand => {
      ballID[hand] = -1;
      stopLoopingSound02();
      dragDistance[hand] = 0;
   }
   inputEvents.onDoublePress = hand => {
     // for (let id = 0; id < balls.length; id++) {
     //     server.send('balls', msg('delete', id, hand));
     // }
  };
  

   inputEvents.onClick = hand => {
       let id = findBall(hand);
       let handPosition = cg.roundVec(4, inputEvents.pos(hand)); // Use the hand's position
       if (id >= 0) {
           server.send('balls', msg('delete', id, hand));
           // Play delete sound at the ball's position
           // if (deleteSoundBuffer) playSoundAtPosition(deleteSoundBuffer, handPosition);
       } else {
           for (id = 0; balls[id] !== undefined; id++); // FIND AN UNUSED ID.
           server.send('balls', msg('create', id, hand));
           // Play create sound at the new ball's position
           // if (createSoundBuffer) playSoundAtPosition(createSoundBuffer, handPosition);
       }
   }


   let N = 50000;
   let fractalData1 = [];
   let worldCenter = [0, 0, 0];

   function random1(x){
      let r = Math.sin(x * 1298461.13817+9847161.1231);
      return r - Math.floor(r);
   }

   model.animate(() => {
      model.customShader(`
          uniform int uFractalBall, uFractalBackground;
          --------------------------
          if (uFractalBall == 1){
            //apos.xyz += noise(apos.xyz + uTime * .5) * aNor * .5;
            //pos.xyz = obj2Clip(apos.xyz);
          }

          *********************

          // Have to specify precision here because vertex shaders support
          // highp as default and we have to match precision.

          uniform highp int uFractalBall, uFractalBackground;

          float frac(float p){
            return p-floor(p);
          }

          float sin01(float p){
            return .5+sin(p)*.5;
          }
          --------------------------
          if (uFractalBall == 1){
             color = vec3(sin01(worldPosition.x),sin01(worldPosition.y),sin01(worldPosition.z));
             color += .5;
          }

          if (uFractalBackground == 1) {
            float starDensity = 0.05;  // Adjust density (higher = more stars)
            float brightness = 2.9;     // Adjust star brightness
            float flicker = 0.2;        // Control the star size sharpness
            float scale = 150.0;        // Scale factor for star distribution
            float baseStarRadius = 0.00004; // Base size of the stars
        
            // Generate a pseudo-random star field based on UV coordinates
            vec2 uv = vUV * scale;  // Scale UV for more variation
            // uv.x += noise(vec3(uTime)+uv.x * 3.);
            // uv.y += noise(vec3(uTime)+uv.y * 5.);
            vec2 grid = floor(uv);  // Discrete grid cells
            vec2 id = fract(uv);    // Fractional part for positioning stars (local star coordinates)
        
            // Random seed for star placement
            float starSeed = dot(grid, vec2(12.9898, 78.233)); 
            float starValue = fract(sin(starSeed) * 43758.5453);
        
            // Randomize star size using a secondary noise function
            float sizeSeed = fract(sin(starSeed * 1.5) * 43758.5453);
            float starRadius = baseStarRadius + sizeSeed * 0.3; // Random size variation
        
            // // Compute distance from the center of the star
            // float dist = length(id - vec2(0.5));

            // Continuous movement using a sine wave
            float speed = 0.2 + sizeSeed * 0.3;   // Random movement speed
            float amplitude = 0.5 + sizeSeed * 0.5; // Random movement range
            float yOffset = amplitude * sin(uTime * speed + starSeed * 10.0); // Movement offset

            // Adjust the star’s vertical position
            float dist = length(id - vec2(0.5, 0.5 + yOffset)); // Modify Y position
        
            // Make the stars blink using a sine wave over time
            float timeFactor = 0.5 + .5 * sin(uTime * 0.2 + starSeed * 10.0); // Slow flickering
        
            // Create a circular mask with fading edges
            float starMask = smoothstep(starRadius, starRadius - flicker, dist) * step(starValue, starDensity);
        
            // Depth fade effect to simulate distance
            float depthFactor = clamp(1.0 - length(uv) * 0.002, 0.1, 1.0);
        
            // Star color and blending with background
            vec3 starColor = vec3(starMask * brightness * depthFactor * timeFactor); // Apply flickering
            color = 1.-mix(color, starColor, starMask);
            color *= 0.01;
        }
        
          
       `);

      // RESPOND TO MESSAGES SENT FROM ALL CLIENTS.
      server.sync('balls', (msgs, msg_clientID) => {
         for (let id in msgs) {
            let msg = msgs[id];
            if (msg.op == 'delete')
            {
               if (balls[msg.id] != null) 
               {
                  if (deleteSoundBuffer)
                  {
                     let emptyObj = model.add().move(msg.pos);
                     let objPos = emptyObj.getGlobalMatrix();
                     //playSoundAtPosition(deleteSoundBuffer, [objPos[12], objPos[13], objPos[14]]);
                     model.remove(emptyObj);
                     //console.log('delete ball sound');

                  }
               }
               delete balls[msg.id];
            }
            else
            {
               if (balls[msg.id] == null)
               {
                  if (createSoundBuffer)
                  {
                     let emptyObj = model.add().move(msg.pos);
                     let objPos = emptyObj.getGlobalMatrix();
                     //playSoundAtPosition(createSoundBuffer, [objPos[12], objPos[13], objPos[14]]);
                     model.remove(emptyObj);
                     //console.log('add ball sound');
                  }
               }
               balls[msg.id] = msg.pos;
            }
         }
      });

      let worldCenter = [0,0,0];
      let ceilingHeight = 10;

      //MAKE BALLS MOVE
      
      for (let id in balls) {
         let ball = balls[id];
         if(!ball) continue;
         let dir = [
             ball[0] - worldCenter[0],
             ball[1] - worldCenter[1],
             ball[2] - worldCenter[2]
         ];
     
         let length = Math.sqrt(dir[0] ** 2 + dir[1] ** 2 + dir[2] ** 2);
         if (length > 0) {
             dir = [dir[0] / length, dir[1] / length, dir[2] / length];
         }
   
         let speed = 0.004 + 0.0005 * random1(id);
         balls[id] = [
             ball[0] + dir[0] * speed,
             ball[1] + dir[1] * speed,
             ball[2] + dir[2] * speed
         ];
     }
     

     // RENDER THE 3D SCENE.
      while (model.nChildren() > 0)
         model.remove(0);

     // let background = model.add('sphere').scale(1000,1000,-1000).flag('uFractalBackground');

      fractalData1 = [];
      fractalData1.push({s: 0.00001, p: [0,0,0]});

      model.add('tubeY').move(worldCenter).color('white').scale(.001, 100, .001).dull();

      function createFractalArm(position, scale, depth, isUp) {
         if (!position || depth === 0 || fractalData1.length >= N) return;
     
         let expansionFactor = 1.5;
         let heightFactor = 1.0;
         let scaleGrowth = 1.5;
         let scaleGrowthDown = .5;
         let angleStep = (Math.PI * 2) / 6; // 6 symmetric copies
     
         // Compute the base direction from world center
         let direction = [
             position[0] - worldCenter[0],
             0,
             position[2] - worldCenter[2]
         ];
         let length = Math.sqrt(direction[0] ** 2 + direction[1] ** 2 + direction[2] ** 2);

         let nDirection = direction;
         if (length !== 0) { // Avoid division by zero
            nDirection = [
               direction[0] / length,
               direction[1] / length,
               direction[2] / length
            ];
         }
         let baseAngle = Math.atan2(direction[2], direction[0]); // Angle relative to center
     
         // Create 6 mirrored particles
         for (let i = 0; i < 6; i++) {
             let angle = baseAngle + i * angleStep; // Rotate around the world center
     
             let mirroredPos = [
                 worldCenter[0] + Math.cos(angle) * Math.sqrt(direction[0] ** 2 + direction[2] ** 2),
                 position[1], // Keep the same height
                 worldCenter[2] + Math.sin(angle) * Math.sqrt(direction[0] ** 2 + direction[2] ** 2)
             ];
             if(mirroredPos[1]>ceilingHeight){
               mirroredPos[1] = ceilingHeight - mirroredPos[1] + ceilingHeight;
             }

             fractalData1.push({ s: scale * 0.8, p: mirroredPos });
         }
     
         // Recursively generate the next level
         let newPosUp = [
             position[0] + nDirection[0] * expansionFactor,
             position[1] + heightFactor + nDirection[1] * expansionFactor, // Increase height
             position[2]+ nDirection[2] * expansionFactor
         ];
         createFractalArm(newPosUp, scale * scaleGrowth, depth - 1);
      }


// Filter out balls that are too far away
for (let id in balls) {
   createFractalArm(balls[id], 0.15, 5); // Start with given ball positions

   // Ensure correct condition checking
   if (Math.abs(balls[id][0]) > 50 || Math.abs(balls[id][1]) > 50 || Math.abs(balls[id][2]) > 50) {
       server.send('balls', msg('delete', id, 'left')); // Send delete message

       // Convert id to integer since for...in provides string keys
       let index = parseInt(id);
       if (!isNaN(index)) {
           balls.splice(index, 1); // Remove the ball from the array
       }
   }
}

   let particles = model.add('particles').info(N).texture('../media/textures/magic_orb.png').flag('uFractalBall');
   particles.setParticles(fractalData1);
   


   if(!balls){
      server.init('balls', {});  
   }
   });
}

