// THE WIZARD MOVES THE BALL TO THE AVERAGE POSITION
// OF ALL CONTROLLERS WHOSE TRIGGERS ARE PRESSED.

window.kaist7_input = [];
window.kaist7_state = { pos: [0,1.5,0] };

let round = t => (1000 * t >> 0) / 1000;

export const init = async model => {

   let obj = model.add();
   let ball = obj.add('sphere').scale(.07).color(0,.5,1);

   inputEvents.onDrag = hand => {
      let index = 2 * clientID + (hand=='left' ? 0 : 1);
      let p = inputEvents.pos(hand);
      kaist7_input[index] = [ round(p[0]), round(p[1]), round(p[2]) ];
      server.broadcastGlobalSlice('kaist7_input', index, index+1);
   }
   inputEvents.onRelease = hand => {
      let index = 2 * clientID + (hand=='left' ? 0 : 1);
      delete kaist7_input[index];
      server.broadcastGlobalSlice('kaist7_input', index, index+1);
   }

   model.animate(() => {
      kaist7_state = server.synchronize('kaist7_state')

      if (clientID == clients[0]) {
         kaist7_input = server.synchronize('kaist7_input')

         let sum = [0,0,0], count = 0;
	 for (let id in kaist7_input) {
	    count++;
	    for (let i = 0 ; i < 3 ; i++)
	       sum[i] += kaist7_input[id][i];
         }
	 if (count > 0)
	    for (let i = 0 ; i < 3 ; i++)
	       kaist7_state.pos[i] = round(.9 * kaist7_state.pos[i] + .1 * sum[i]/count);
         server.broadcastGlobal('kaist7_state');
      }

      obj.identity().move(kaist7_state.pos);
   });
}
