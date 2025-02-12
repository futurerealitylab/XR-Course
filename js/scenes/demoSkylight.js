import { loadStereoSound, playStereoAudio } from "../util/stereo-audio.js";


// Audio Stuff

let skylightSoundBuffer = null;

function preloadSounds() {
    Promise.all([
        loadStereoSound('../../media/sound/SFXs/demoSkylight/Amb_Skylight_Stereo_LP_01.wav', buffer => skylightSoundBuffer = buffer)
    ])
    .then(() => {
        //console.log('Skylight sound loaded successfully');
    })
    .catch(error => {
        //console.error('An error occurred while loading sounds:', error);
    });
}

// load SFXs
preloadSounds();



export const init = async model => {


   playStereoAudio(skylightSoundBuffer);

   model.txtrSrc(1, '../media/textures/sky.jpg');

   let inch = 0.0254, yc = 102*inch;;
   let sky = model.add('cube').move(0,yc+10*inch,0).scale(1,.001,1)
                  .txtr(1).flag('uSky');
   model.add('cubeXZ').move(0,yc+5*inch,0).scale(1,5*inch,1).scale(1,-1,1).color(1,1.1,1.2);

   model.animate(() => {
   });
}

