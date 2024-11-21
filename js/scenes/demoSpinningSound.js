import * as cg from "../render/core/cg.js";
import { loadSound, playLoopingSoundAtPosition, 
         stopLoopingSound, updateSoundPosition } from "../util/positional-audio.js";


// Audio Stuff

let bouncingSoundBuffer = null;

function preloadSounds() {
    Promise.all([
        loadSound('../../media/sound/SFXs/demoSpinningSound/SFX_SpinningSound_Test_Signal_Mono_01.wav', buffer => bouncingSoundBuffer = buffer)
    ])
    .then(() => {
        //console.log('All sounds loaded successfully');
    })
    .catch(error => {
        //console.error('An error occurred while loading sounds:', error);
    });
}

// load SFXs
preloadSounds();

let pos = [0,0,0];
let centerPos = [0,0.4,0];
const radius = 0.05;

const spinRadius = 1.5; 
let angle = 0;       

export const init = async model => {
   playLoopingSoundAtPosition(bouncingSoundBuffer, pos);

   let obj = model.add('sphere').move(pos).scale(radius);


   inputEvents.onClick = hand => {
         centerPos = cg.roundVec(4, inputEvents.pos(hand)); 
   }


   model.animate(() => {
        angle += 0.02; 
        
        pos[0] = centerPos[0] + Math.cos(angle) * spinRadius; 
        pos[1] = centerPos[1];
        pos[2] = centerPos[2] + Math.sin(angle) * spinRadius;

      while (model.nChildren() > 0)
         model.remove(0);
      model.add('sphere').move(pos).scale(radius);
      let emptyObj = model.add().move(pos);
      let objPos = emptyObj.getGlobalMatrix();
      updateSoundPosition([objPos[12], objPos[13], objPos[14]]);
   });
}

