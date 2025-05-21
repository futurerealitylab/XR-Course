import * as aiobject from "/js/util/aiobject.js";

export const init = async model => {
    let speech = "";

    let aiRunning = false;

    let emptyResult = "";
    window.pythonResult = emptyResult;

    model.animate(() => {
        window.pythonResult = server.synchronize('pythonOutput');
        if (window.speech !== speech && !aiRunning) {
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
            }
        }
   });
}