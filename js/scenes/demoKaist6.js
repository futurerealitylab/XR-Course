// THE WIZARD GIVES CONTROL OF THE BALL TO THE
// CONTROLLER THAT LAST PRESSED ITS TRIGGER.

window.kaist6 = {
   time: 0,
   pos: [0,1.5,0],
   controller: { },
}

export const init = async model => {

   let ball = model.add('sphere');

   inputEvents.onPress = hand => {
      kaist6.controller[hand + clientID] = { pos: inputEvents.pos(hand), time: kaist6.time };
      server.broadcastGlobal('kaist6');
   }
   inputEvents.onDrag = hand => {
      kaist6.controller[hand + clientID].pos = inputEvents.pos(hand);
      server.broadcastGlobal('kaist6');
   }
   inputEvents.onRelease = hand => {
      delete kaist6.controller[hand + clientID];
      server.broadcastGlobal('kaist6');
   }

   model.animate(() => {
      kaist6 = server.synchronize('kaist6')
      if (clientID == clients[0]) {
         kaist6.time = model.time;
	 let time = 0;
	 for (let id in kaist6.controller)
	    if (kaist6.controller[id].time > time) {
	       time = kaist6.controller[id].time;
	       kaist6.pos = kaist6.controller[id].pos;
            }
         server.broadcastGlobal('kaist6');
      }

      ball.identity().move(kaist6.pos).scale(.07).color(1,1,0);
   });
}
