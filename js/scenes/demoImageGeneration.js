export const init = async model => {

   let table = model.add('cube').move(0,0,-5).scale(2);
   let table2 = model.add('cube').move(0,0,-10).scale(6);

   let speech = "";

   let aiRunning = false;

   let emptyResult = "";
   window.imageResult = emptyResult;

   model.animate(() => {
      window.imageResult = server.synchronize('imageResult');
      if (window.speech !== speech && !aiRunning) {
         speech = window.speech.toLowerCase();

         if (speech.includes("computer")) {
            let texts = speech.split(" ");

            let prompt = "";
            let startRecording = false;

            for (let i = 0; i < texts.length; i++) {
               if (startRecording) {
                  prompt += texts[i];
                  prompt += "+";
               }
               if (texts[i] === "computer"){
                  startRecording = true;
               }
            }

            aiRunning = true;
            server.spawnPythonThread("openai/run.py",prompt);
         }
      }

      if (window.imageResult != emptyResult) {
         let imagePath = "../"+window.imageResult;
         model.txtrSrc(1, imagePath);
         table.txtr(1);
         window.imageResult = emptyResult;
         aiRunning = false;
      }
   });
}

