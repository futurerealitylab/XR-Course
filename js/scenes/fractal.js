import * as cg from "../render/core/cg.js";
import { loadSound, playSoundAtPosition, playLoopingSoundAtPosition02, 
         stopLoopingSound02, updateSound02Position } from "../util/positional-audio.js";


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


function preloadSounds() {
    Promise.all([
        loadSound('../../media/sound/SFXs/demoBalls/SFX_Ball_Create_Mono_01.wav', buffer => createSoundBuffer = buffer),
        loadSound('../../media/sound/SFXs/demoBalls/SFX_Ball_Delete_Mono_01.wav', buffer => deleteSoundBuffer = buffer),
        loadSound('../../media/sound/SFXs/demoBalls/SFX_Ball_Drag_Mono_LP_01.wav', buffer => dragSoundBuffer = buffer)

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

   let dragDistance = {left: 0, right: 0};
   let prevHandPos = {left: [0,0,0], right: [0,0,0]};
   let spawnDistance = 0.05;

   // HANDLE CONTROLLER EVENTS FROM THIS CLIENT.
   inputEvents.onPress = hand => {
      ballID[hand] = findBall(hand);
      if (ballID[hand] >= 0){
         let emptyObj = model.add().move(cg.roundVec(4, inputEvents.pos(hand)));
         let objPos = emptyObj.getGlobalMatrix();
         playLoopingSoundAtPosition02(dragSoundBuffer, [objPos[12], objPos[13], objPos[14]]);
         model.remove(emptyObj);
      }
   }

   inputEvents.onDrag = hand => {

      if (ballID[hand] >= 0){
         server.send('balls', msg('move', ballID[hand], hand));
         let emptyObj = model.add().move(cg.roundVec(4, inputEvents.pos(hand)));
         let objPos = emptyObj.getGlobalMatrix();
         updateSound02Position([objPos[12], objPos[13], objPos[14]]);
         model.remove(emptyObj);
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


   let N = 5000;
   let fractalData1 = [];
   let worldCenter = [0, 0, 0];

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
         }

          if (uFractalBackground == 1) {
            float starDensity = 0.005;
            float brightness = 2.0;
            vec3 starDir = normalize(worldPosition); 
            float starValue = noise(starDir * 0.005);
            float starMask = step(1.0 - starDensity, frac(starValue * 1500.5453));
            float depthFactor = clamp(1.0 - length(worldPosition) * 0.002, 0.1, 1.0);
            vec3 starColor = vec3(starMask * brightness * depthFactor);
            color = mix(color, starColor, starMask);
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
                     playSoundAtPosition(deleteSoundBuffer, [objPos[12], objPos[13], objPos[14]]);
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
                     playSoundAtPosition(createSoundBuffer, [objPos[12], objPos[13], objPos[14]]);
                     model.remove(emptyObj);
                     //console.log('add ball sound');
                  }
               }
               balls[msg.id] = msg.pos;
            }
         }
      });


      //MAKE BALLS MOVE
      
      for (let id in balls) {
        // balls[id][2]-=.01;
      }

     // RENDER THE 3D SCENE.
      while (model.nChildren() > 0)
         model.remove(0);

      let background = model.add('sphere').scale(1000,1000,-1000).color('black').flag('uFractalBackground');

      fractalData1 = [];
      fractalData1.push({s: 0.00001, p: [0,0,0]});
      let worldCenter = [0,0,0];
       function createFractalArm(position, scale, depth) {
        if (depth === 0 || fractalData1.length >= N) return;

        fractalData1.push({ s: scale * 0.8, p: [...position] });

        let expansionFactor = 8.5;
        let heightFactor = 4.5 * scale;
        let scaleGrowth = 2;

        let direction = [
            position[0] - worldCenter[0],
            position[1] - worldCenter[1],
            position[2] - worldCenter[2]
        ];
        let length = Math.sqrt(direction[0] ** 2 + direction[2] ** 2);
        let angle = Math.atan2(direction[2], direction[0]);

        let newPos = [
            position[0] + Math.cos(angle) * scale * expansionFactor,
            position[1] + heightFactor,
            position[2] + Math.sin(angle) * scale * expansionFactor
        ];

        createFractalArm(newPos, scale * scaleGrowth, depth - 1);
    }

   for (let id in balls) {
      createFractalArm(balls[id], 0.02, 15); // Start with given ball positions
   }
   let particles = model.add('particles').info(N).texture('../media/textures/snowflake.png').flag('uFractalBall');
   particles.setParticles(fractalData1);
   
   });
}

