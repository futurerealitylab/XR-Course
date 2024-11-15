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
   }

   inputEvents.onRelease = hand => {
      ballID[hand] = -1;
      stopLoopingSound02();
   }

   

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

   model.animate(() => {
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

      // RENDER THE 3D SCENE.

      while (model.nChildren() > 0)
         model.remove(0);
      for (let id in balls)
         model.add('sphere').move(balls[id]).scale(radius);
   });
}

