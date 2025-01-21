
// IN THIS DEMO, THE WIZARD MOVES THE BALL TO THE AVERAGE POSITION OF ALL CONTROLLERS WHOSE TRIGGERS ARE PRESSED.

window.example7Input = [];                                  // GLOBAL VARIABLE FOR CONTROLLER POSITIONS
window.example7State = { pos: [0,1.5,0] };                  // GLOBAL VARIABLE FOR RENDERABLE STATE

let round = t => (1000 * t >> 0) / 1000;                    // ROUND NUMBERS TO REDUCE NETWORK MESSAGE SIZE

export const init = async model => {

   let obj = model.add();                                   // CREATE THE RENDERABLE OBJECT
   let ball = obj.add('sphere').scale(.07).color(0,.5,1);   // CREATE THE OBJECT'S INTERNAL STRUCTURE

   inputEvents.onDrag = hand => {                           // DRAGGING A CONTROLLER SENDS ITS POSITION TO THE WIZARD
      let index = 2 * clientID + (hand=='left' ? 0 : 1);
      let p = inputEvents.pos(hand);
      example7Input[index] = [ round(p[0]), round(p[1]), round(p[2]) ];
      server.broadcastGlobalSlice('example7Input', index, index+1);
   }

   inputEvents.onRelease = hand => {                        // RELEASING TRIGGER MAKES THE WIZARD FORGET THIS CONTROLLER
      let index = 2 * clientID + (hand=='left' ? 0 : 1);
      delete example7Input[index];
      server.broadcastGlobalSlice('example7Input', index, index+1);
   }

   model.animate(() => {                                    // AT EVERY ANIMATION FRAME:
      example7State = server.synchronize('example7State')   //    EVERY CLIENT RECEIVES THE UPDATED RENDER STATE

      if (clientID == clients[0]) {                         //    THE WIZARD CLIENT MODIFIES RENDER STATE IN 3 STEPS:

         example7Input = server.synchronize('example7Input')//       (1) IT GETS ALL CONTROLLER POSITIONS

         let sum = [0,0,0], count = 0;                      //       (2) IT COMPUTES THE AVERAGE OF THOSE POSITIONS
	 for (let id in example7Input) {                    //
	    count++;                                        //
	    for (let i = 0 ; i < 3 ; i++)                   //
	       sum[i] += example7Input[id][i];              //
         }                                                  //
	 if (count > 0)                                     //
	    for (let i = 0 ; i < 3 ; i++)                   //
	       example7State.pos[i] = round(.9 * example7State.pos[i] + .1 * sum[i]/count);

         server.broadcastGlobal('example7State');           //       (3) IT TELLS ALL CLIENTS THAT AVERAGE POSITION
      }

      obj.identity().move(example7State.pos);               //    EACH CLIENT RENDERS THE OBJECT WHERE IT IS TOLD TO
   });
}
