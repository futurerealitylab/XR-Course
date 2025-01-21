import { loadStereoSound, playStereoAudio } from "../util/stereo-audio.js";


// Audio Stuff

let moonSoundBuffer = null;

function preloadSounds() {
    Promise.all([
        loadStereoSound('../../media/sound/SFXs/demoMoon/Amb_Moon_Stereo_LP_01.wav', buffer => moonSoundBuffer = buffer)
    ])
    .then(() => {
        //console.log('Moon sound loaded successfully');
    })
    .catch(error => {
        //console.error('An error occurred while loading sounds:', error);
    });
}

// load SFXs
preloadSounds();


window.moon = { y: 4 };

export const init = async model => {
   model.txtrSrc(1, '../media/textures/moon_diffuse.jpg');
   model.txtrSrc(2, '../media/textures/moon_normal.jpg');
   let y = 0,
/*
       obj = model.add('sphere').texture('../media/textures/moon_diffuse.jpg')
                                .bumpTexture('../media/textures/moon_normal.jpg')
*/
       obj = model.add('sphere').txtr(1).bumptxtr(2)
                 .dull();

   playStereoAudio(moonSoundBuffer);

   inputEvents.onPress = hand => y = inputEvents.pos(hand)[1];
   inputEvents.onDrag  = hand => {
      let dy = inputEvents.pos(hand)[1] - y;
      moon.y += dy;
      y += dy;
      server.broadcastGlobal('moon');
   }

   model.animate(() => {
      moon = server.synchronize('moon');
      obj.identity().move(0,moon.y,0).turnX(-Math.PI/2).scale(1.5);
   });
}
