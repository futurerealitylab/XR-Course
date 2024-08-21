// IN THIS DEMO, THE WIZARD MOVES THE BALL TO THE AVERAGE
// POSITION OF ALL CONTROLLERS WHOSE TRIGGERS ARE PRESSED.

// TWO GLOBAL VARIABLES: ONE FOR INPUT AND THE OTHER FOR RENDERABLE STATE.

window.kaist7_input = [];
window.kaist7_state = { pos: [0,1.5,0] };

// IF WE ROUND THE VALUES, IT REDUCES THE SIZE OF INTERNET MESSAGES.

let round = t => (1000 * t >> 0) / 1000;

export const init = async model => {

   // SEPARATE OUT THE OBJECT FROM ITS INTERNAL DETAILS.

   let obj = model.add();
   let ball = obj.add('sphere').scale(.07).color(0,.5,1);

   // DRAG A CONTROLLER TO SEND ITS POSITION TO THE WIZARD CLIENT.

   inputEvents.onDrag = hand => {
      let index = 2 * clientID + (hand=='left' ? 0 : 1);
      let p = inputEvents.pos(hand);
      kaist7_input[index] = [ round(p[0]), round(p[1]), round(p[2]) ];
      server.broadcastGlobalSlice('kaist7_input', index, index+1);
   }

   // RELEASE CONTROLLER TRIGGER TO TELL THE WIZARD TO FORGET ABOUT IT.

   inputEvents.onRelease = hand => {
      let index = 2 * clientID + (hand=='left' ? 0 : 1);
      delete kaist7_input[index];
      server.broadcastGlobalSlice('kaist7_input', index, index+1);
   }

   model.animate(() => {

      // EVERY CLIENT RECEIVES THE UPDATED RENDER STATE.

      kaist7_state = server.synchronize('kaist7_state')

      // ONLY THE WIZARD CLIENT CAN MODIFY THE RENDER STATE.

      if (clientID == clients[0]) {

         // FIRST THE WIZARD GETS THE ARRAY OF ALL ACTIVE CONTROLLER POSITIONS.

         kaist7_input = server.synchronize('kaist7_input')

	 // THEN THE WIZARD COMPUTES THE AVERAGE OF THOSE POSITIONS.

         let sum = [0,0,0], count = 0;
	 for (let id in kaist7_input) {
	    count++;
	    for (let i = 0 ; i < 3 ; i++)
	       sum[i] += kaist7_input[id][i];
         }
	 if (count > 0)
	    for (let i = 0 ; i < 3 ; i++)
	       kaist7_state.pos[i] = round(.9 * kaist7_state.pos[i] + .1 * sum[i]/count);

         // FINALLY THE WIZARD TELLS ALL CLIENTS WHAT THAT AVERAGE POSITION IS.

         server.broadcastGlobal('kaist7_state');
      }

      // EVERY CLIENT RENDERS THE OBJECT WHERE THE WIZARD TELLS IT TO.

      obj.identity().move(kaist7_state.pos);
   });
}
