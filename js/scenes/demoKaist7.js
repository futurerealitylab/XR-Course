
// IN THIS DEMO, THE WIZARD MOVES THE BALL TO THE AVERAGE POSITION OF ALL CONTROLLERS WHOSE TRIGGERS ARE PRESSED.

window.kaist7_input = [];                                   // GLOBAL VARIABLE FOR CONTROLLER POSITIONS
window.kaist7_state = { pos: [0,1.5,0] };                   // GLOBAL VARIABLE FOR RENDERABLE STATE

let round = t => (1000 * t >> 0) / 1000;                    // ROUND NUMBERS TO REDUCE NETWORK MESSAGE SIZE

export const init = async model => {

   let obj = model.add();                                   // CREATE THE RENDERABLE OBJECT
   let ball = obj.add('sphere').scale(.07).color(0,.5,1);   // CREATE THE OBJECT'S INTERNAL STRUCTURE

   inputEvents.onDrag = hand => {                           // DRAGGING A CONTROLLER SENDS ITS POSITION TO THE WIZARD
      let index = 2 * clientID + (hand=='left' ? 0 : 1);
      let p = inputEvents.pos(hand);
      kaist7_input[index] = [ round(p[0]), round(p[1]), round(p[2]) ];
      server.broadcastGlobalSlice('kaist7_input', index, index+1);
   }

   inputEvents.onRelease = hand => {                        // RELEASING TRIGGER MAKES THE WIZARD FORGET THIS CONTROLLER
      let index = 2 * clientID + (hand=='left' ? 0 : 1);
      delete kaist7_input[index];
      server.broadcastGlobalSlice('kaist7_input', index, index+1);
   }

   model.animate(() => {                                    // AT EVERY ANIMATION FRAME:
      kaist7_state = server.synchronize('kaist7_state')     //    EVERY CLIENT RECEIVES THE UPDATED RENDER STATE

      if (clientID == clients[0]) {                         //    THE WIZARD CLIENT MODIFIES RENDER STATE IN 3 STEPS:

         kaist7_input = server.synchronize('kaist7_input')  //       (1) IT GETS ALL CONTROLLER POSITIONS

         let sum = [0,0,0], count = 0;                      //       (2) IT COMPUTES THE AVERAGE OF THOSE POSITIONS
	 for (let id in kaist7_input) {                     //
	    count++;                                        //
	    for (let i = 0 ; i < 3 ; i++)                   //
	       sum[i] += kaist7_input[id][i];               //
         }                                                  //
	 if (count > 0)                                     //
	    for (let i = 0 ; i < 3 ; i++)                   //
	       kaist7_state.pos[i] = round(.9 * kaist7_state.pos[i] + .1 * sum[i]/count);

         server.broadcastGlobal('kaist7_state');            //       (3) IT TELLS ALL CLIENTS THAT AVERAGE POSITION
      }

      obj.identity().move(kaist7_state.pos);                //    EACH CLIENT RENDERS THE OBJECT WHERE IT IS TOLD TO
   });
}
