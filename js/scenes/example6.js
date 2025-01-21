// CLIENT 0 ACTS AS THE "WIZARD". IN THIS CASE, IT GIVES CONTROL
// OF THE BALL TO THE CONTROLLER THAT LAST PRESSED ITS TRIGGER.

window.example6State = {
   time: 0,
   pos: [0,1.5,0],
   controller: { },
}

export const init = async model => {

   let ball = model.add('sphere');

   inputEvents.onPress = hand => {
      example6State.controller[hand + clientID] = { pos: inputEvents.pos(hand), time: example6State.time };
      server.broadcastGlobal('example6State');
   }
   inputEvents.onDrag = hand => {
      example6State.controller[hand + clientID].pos = inputEvents.pos(hand);
      server.broadcastGlobal('example6State');
   }
   inputEvents.onRelease = hand => {
      delete example6State.controller[hand + clientID];
      server.broadcastGlobal('example6State');
   }

   model.animate(() => {
      example6State = server.synchronize('example6State')
      if (clientID == clients[0]) {
         example6State.time = model.time;
	 let time = 0;
	 for (let id in example6State.controller)
	    if (example6State.controller[id].time > time) {
	       time = example6State.controller[id].time;
	       example6State.pos = example6State.controller[id].pos;
            }
         server.broadcastGlobal('example6State');
      }

      ball.identity().move(example6State.pos).scale(.07).color(1,1,0);
   });
}
