import * as cg from "../render/core/cg.js";
import { loadSound, playSoundAtPosition, playLoopingSoundAtPosition, stopLoopingSound ,
         playLoopingSoundAtPosition02, playLoopingSoundAtPosition03, playLoopingSoundAtPosition04} from "../util/positional-audio.js";
import { loadStereoSound, playStereoAudio } from "../util/stereo-audio.js";



// Audio Stuff

let forestAmbienceBuffer = null;
let createSoundBuffer = null;
let deleteSoundBuffer = null;
let birdSoundBuffer_01 = null;
let birdSoundBuffer_02 = null;
let birdSoundBuffer_03 = null;
let birdSoundBuffer_04 = null;

function preloadSounds() {
    Promise.all([
        loadSound('../../media/sound/SFXs/demoBalls/SFX_Ball_Create_Mono_01.wav', buffer => createSoundBuffer = buffer),
        loadStereoSound('../../media/sound/SFXs/demoForest/Amb_Forest_Stereo_LP_01.wav', buffer => forestAmbienceBuffer = buffer),
        loadSound('../../media/sound/SFXs/demoBalls/SFX_Ball_Delete_Mono_01.wav', buffer => deleteSoundBuffer = buffer),
        loadSound('../../media/sound/SFXs/demoForest/SFX_Forest_Bird_Mono_01.wav', buffer => birdSoundBuffer_01 = buffer),
        loadSound('../../media/sound/SFXs/demoForest/SFX_Forest_Bird_Mono_02.wav', buffer => birdSoundBuffer_02 = buffer),
        loadSound('../../media/sound/SFXs/demoForest/SFX_Forest_Bird_Mono_03.wav', buffer => birdSoundBuffer_03 = buffer),
        loadSound('../../media/sound/SFXs/demoForest/SFX_Forest_Bird_Mono_04.wav', buffer => birdSoundBuffer_04 = buffer)
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


server.init('birds', {});             // INITIALIZE GLOBAL STATE OBJECT.

const radius = 0.05;                  // ALL BIRDS HAVE THE SAME RADIUS.

let bird;
let counter = 0;




let birdID = { left: -1, right: -1 }; // WHICH BIRD IS IN EACH HAND?

let findBird = hand => {              // FIND THE BIRD LOCATED AT THE
   let dMin = 10000, idMin = -1;      // 'left' OR 'right' HAND, IF ANY.
   for (let id in birds) {
      let d = cg.distance(inputEvents.pos(hand), birds[id]);
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
   inputEvents.onPress = hand => birdID[hand] = findBird(hand);

   inputEvents.onDrag = hand => {

      if (birdID[hand] >= 0)
         server.send('birds', msg('move', birdID[hand], hand));
   }


   playStereoAudio(forestAmbienceBuffer);


   inputEvents.onRelease = hand => birdID[hand] = -1;

   

   inputEvents.onClick = hand => {
       let id = findBird(hand);
       let handPosition = cg.roundVec(4, inputEvents.pos(hand)); // Use the hand's position
       if (id >= 0) {
           server.send('birds', msg('delete', id, hand));
           // Play delete sound at the bird's position
           // if (deleteSoundBuffer) playSoundAtPosition(deleteSoundBuffer, handPosition);
       } else {
           for (id = 0; birds[id] !== undefined; id++); // FIND AN UNUSED ID.
           server.send('birds', msg('create', id, hand));
           // Play create sound at the new bird's position
           // if (createSoundBuffer) playSoundAtPosition(createSoundBuffer, handPosition);
       }
   }


   model.animate(() => {
      // RESPOND TO MESSAGES SENT FROM ALL CLIENTS.
      server.sync('birds', (msgs, msg_clientID) => {
         


         for (let id in msgs) {
            let msg = msgs[id];
            if (msg.op == 'delete')
            {
               if (birds[msg.id] != null) 
               {
                  if (deleteSoundBuffer)
                  {
                     let emptyObj = model.add().move(msg.pos);
                     let objPos = emptyObj.getGlobalMatrix();
                     playSoundAtPosition(deleteSoundBuffer, [objPos[12], objPos[13], objPos[14]]);
                     stopLoopingSound();
                     model.remove(emptyObj);
                     //console.log('delete bird sound');
                     if (counter > 0)
                     {
                        counter = counter - 1;
                     }

                  }
               }
               delete birds[msg.id];
            }
            else
            {
               if (counter < 4)
               {
                  if (birds[msg.id] == null)
                  {
                     if (counter == 0)
                     {
                        let emptyObj = model.add().move(msg.pos);
                        let objPos = emptyObj.getGlobalMatrix();
                        playLoopingSoundAtPosition(birdSoundBuffer_01, [objPos[12], objPos[13], objPos[14]]);
                        model.remove(emptyObj);
                        counter = counter + 1;
                     }
                     else if (counter == 1)
                     {
                        let emptyObj = model.add().move(msg.pos);
                        let objPos = emptyObj.getGlobalMatrix();
                        playLoopingSoundAtPosition02(birdSoundBuffer_02, [objPos[12], objPos[13], objPos[14]]);
                        model.remove(emptyObj);
                        counter = counter + 1;
                     }
                     else if (counter == 2)
                     {
                        let emptyObj = model.add().move(msg.pos);
                        let objPos = emptyObj.getGlobalMatrix();
                        playLoopingSoundAtPosition03(birdSoundBuffer_03, [objPos[12], objPos[13], objPos[14]]);
                        model.remove(emptyObj);
                        counter = counter + 1;
                     }
                     else if (counter == 3)
                     {
                        let emptyObj = model.add().move(msg.pos);
                        let objPos = emptyObj.getGlobalMatrix();
                        playLoopingSoundAtPosition04(birdSoundBuffer_04, [objPos[12], objPos[13], objPos[14]]);
                        model.remove(emptyObj);
                        counter = counter + 1;
                     }
                  }
                  birds[msg.id] = msg.pos;
               }
            }
         }
      });

      // RENDER THE 3D SCENE.

      while (model.nChildren() > 0)
         model.remove(0);
      for (let id in birds)
         model.add('sphere').move(birds[id]).scale(radius);
   });
}

