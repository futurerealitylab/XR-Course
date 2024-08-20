// THE WIZARD MOVES THE BALL TO THE AVERAGE POSITION OF ALL
// CONTROLLERS THAT ARE CURRENTLY PRESSING THEIR TRIGGERS.

window.kaist7 = {
   pos: [0,1.5,0],
   controller: { },
}

export const init = async model => {

   let ball = model.add('sphere');

   inputEvents.onDrag = hand => {
      kaist7.controller[hand + clientID] = inputEvents.pos(hand);
      server.broadcastGlobal('kaist7');
   }

   inputEvents.onRelease = hand => {
      delete kaist7.controller[hand + clientID];
      server.broadcastGlobal('kaist7');
   }

   model.animate(() => {
      kaist7 = server.synchronize('kaist7')
      if (clientID == clients[0]) {
         let sum = [0,0,0], count = 0;
	 for (let id in kaist7.controller) {
	    count++;
	    for (let i = 0 ; i < 3 ; i++)
	       sum[i] += kaist7.controller[id][i];
         }
	 if (count > 0)
	    for (let i = 0 ; i < 3 ; i++)
	       kaist7.pos[i] = .9 * kaist7.pos[i] + .1 * sum[i]/count;
         server.broadcastGlobal('kaist7');
      }

      ball.identity().move(kaist7.pos).scale(.07).color(0,.5,1);
   });
}
