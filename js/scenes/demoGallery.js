import { loadStereoSound, playStereoAudio } from "../util/stereo-audio.js";


// Audio Stuff

let gallerySoundBuffer = null;

function preloadSounds() {
    Promise.all([
        loadStereoSound('../../media/sound/SFXs/demoGallery/Amb_Gallery_Stereo_LP_01.wav', buffer => gallerySoundBuffer = buffer)
    ])
    .then(() => {
        //console.log('Gallery sound loaded successfully');
    })
    .catch(error => {
        //console.error('An error occurred while loading sounds:', error);
    });
}

// load SFXs
preloadSounds();

const inch = .0254;

export const init = async model => {

   playStereoAudio(gallerySoundBuffer);


   model.framedPicture(18,24,1,'../../media/textures/vase.png')
        .scale(inch).move(-111,72,-60).turnY(Math.PI/2);

   model.framedPicture(26.16,18,1,'../../media/textures/water_vase.jpg')
        .scale(inch).move(111,72,60).turnY(-Math.PI/2);

   model.framedPicture(10,15,.75,'../../media/textures/nyu_torch.png')
        .scale(inch).move(-6,66,-106);

   model.animate(() => {
   });
}

