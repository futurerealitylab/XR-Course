import * as cg from "../render/core/cg.js";
import { G3 } from '../util/g3.js';
import {
  controllerMatrix,
  buttonState,
  joyStickState,
} from "../render/core/controllerInput.js";
import {
  beginSpeechRecognition,
  stopSpeechRecognition,
} from "../immersive-pre.js";


let stt_on = false;
let trigger_pressed = false;
let stt_result = "waiting for speech recognition...";

function updateSpeechRecognitionText(text) {
  const results = text.split('\n}');
  for (const result of results) {
    if (result.trim() === '') continue; // Skip empty results{
    const json = JSON.parse(result + '}');
    if (json.type === "FINAL_TRANSCRIPTION") {
      stt_result = json.text;
      console.log("Speech recognition final result:", stt_result);
    }
  }
}

window.addEventListener("keydown", (event) => {
    if (event.defaultPrevented) {
        return; // Do nothing if the event was already processed
    }
    if (event.key === "s") {
        if (!stt_on) {
            stt_on = true;
            beginSpeechRecognition();
        }
    }
});
window.addEventListener("keyup", (event) => {
    if (event.defaultPrevented) {
        return; // Do nothing if the event was already processed
    }
    if (event.key === "s") {
        if (stt_on) {
            stt_on = false;
            stopSpeechRecognition(updateSpeechRecognitionText);
        }
    }
});

export const init = async (model) => {

  let g3 = new G3(model, draw => {
        draw.color('#ffffff').textHeight(.1);
        draw.text(stt_result, [0,1.5,0], 'center', 0, 0);
     });

  model.animate(() => {
    const leftTrigger = buttonState.left[0].pressed;
    if (leftTrigger) {
      trigger_pressed = true;
      console.log("XRLOG: left trigger pressed");
      if (!stt_on) {
        stt_on = true;
        stt_result = "button pressed, waiting for speech recognition...";
        beginSpeechRecognition();
      }
    } else {
      if (stt_on && trigger_pressed) {
        stt_on = false;
        stt_result = "button released, stopping speech recognition...";
        stopSpeechRecognition(updateSpeechRecognitionText);
      }
      trigger_pressed = false;
    }

    g3.update();
  });
};
