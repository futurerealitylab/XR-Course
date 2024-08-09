import { createSoundSource} from "../util/spatial-audio.js";
import * as cg from "../render/core/cg.js";

// createSoundSource(soundIndex, sound url, initial position, loop or not, volume in percentage)
createSoundSource(0, '../../media/sound/SFXs/demoChart/SFX_Chart_Hologram_Mono_LP_01.wav', [.4, 1.6, 0], true, 1.0);
createSoundSource(1, '../../media/sound/SFXs/demoBalls/SFX_Ball_Create_Mono_01.wav', [0,0,0], false, 1.0);
createSoundSource(2, '../../media/sound/SFXs/demoBalls/SFX_Ball_Drag_Mono_LP_01.wav', [.4, 1.6, 0], true, 1.0)


export const init = async model => {
    let audioObj0 = model.add("sphere").scale(0.1).addAudio(0);
    let audioObj1 = model.add().addAudio(1);
    let audioObj2 = model.add().addAudio(2);

    inputEvents.onClick = hand => {
        audioObj1.identity().move(cg.roundVec(4, inputEvents.pos(hand))).scale(0.5).playAudio();
     }


   inputEvents.onDrag = hand => {
    audioObj2.identity().move(cg.roundVec(4, inputEvents.pos(hand))).scale(0.5).playAudio();
    }

    inputEvents.onRelease = hand => {
        audioObj2.stopAudio();
    }

   model.animate(() => {
    audioObj0.identity().move(Math.sin(model.time), 1.5, 0).playAudio().scale(0.1);
   });
}

