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
import { max } from "../third-party/gl-matrix/src/gl-matrix/vec3.js";


let stt_on = false;
let box_color = '#ff0000'; // Default color for the box
let box_size = 2; // Default size for the box
let trigger_pressed = false;
let stt_result = "waiting for speech recognition...";

function updateSpeechRecognitionText(text) {
  const results = text.split('\n}');
  for (const result of results) {
    if (result.trim() === '') continue; // Skip empty results{
    const json = JSON.parse(result + '}');
    if (json.type === "FINAL_TRANSCRIPTION") {
      stt_result = json.text;
      console.log("Speech recognition final transcription:", json.text);
    }
    if (json.type === "FINAL_UNDERSTANDING") {
      console.log("Speech recognition final understanding:", json);
      const entities = json.entities;
      const intents = json.intents || [];
      if (intents.length > 0) {
        const topIntent = intents[0];
        if (topIntent.name === "set_object_color") {
          const setColorEntity = entities["object_property:color"];
          if (setColorEntity) {
            const color = setColorEntity[0].value;
            box_color = getHexColor(color) || box_color;
          }
        } else if (topIntent.name === "set_object_size") {
          const setSizeEntity = entities["object_property:size"];
          const setSizeValueEntity = entities["wit$number:number"];
          const sizeValue = setSizeValueEntity ? parseFloat(setSizeValueEntity[0].value) : 0.1;
          if (setSizeEntity) {
            if (setSizeEntity[0].value === "bigger") {
              const newSize = box_size + sizeValue;
              if (!isNaN(newSize)) {
                box_size = newSize; // Ensure size is at least 0.1
              }
            } else if (setSizeEntity[0].value === "smaller") {
              const newSize = box_size - sizeValue;
              if (!isNaN(newSize)) {
                box_size = newSize; // Ensure size is at least 0.1
              }
            }
          }
        }
      }
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

function getHexColor(colorStr) {
    var a = document.createElement('div');
    a.style.color = colorStr;
    var colors = window.getComputedStyle( document.body.appendChild(a) ).color.match(/\d+/g).map(function(a){ return parseInt(a,10); });
    document.body.removeChild(a);
    return (colors.length >= 3) ? '#' + (((1 << 24) + (colors[0] << 16) + (colors[1] << 8) + colors[2]).toString(16).substr(1)) : false;
}

export const init = async (model) => {

  let g3 = new G3(model, draw => {
    draw.color('#ffffff').textHeight(.1);
    draw.text(stt_result, [0,2.5,0], 'center', 0, 0);

    draw.color(box_color);
    draw.fill([[-box_size / 2, -box_size / 2, -3], [-box_size / 2, box_size / 2, -3], [box_size / 2, box_size / 2, -3], [box_size / 2, -box_size / 2, -3]]);
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
