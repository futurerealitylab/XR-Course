import * as aiobject from "/js/util/aiobject.js";
import * as global from "../global.js";
import { Gltf2Node } from "../render/nodes/gltf2.js";

export const init = async model => {
    let speech = "";

    model.animate(() => {
        aiobject.updateObjects(model);
        
        window.pythonResult = server.synchronize('pythonOutput');

        if (window.speech !== speech) {
            speech = window.speech.toLowerCase();

            if (speech.includes("generate")) {
                let texts = speech.split(" ");

                let prompt = "";
                let startRecording = false;

                for (let i = 0; i < texts.length; i++) {
                    if (startRecording) {
                        prompt += texts[i];
                        prompt += "+";
                    }
                    if (texts[i] === "generate"){
                        startRecording = true;
                    }
                }

                aiobject.addObject(model, prompt);
            }
        }
   });
}