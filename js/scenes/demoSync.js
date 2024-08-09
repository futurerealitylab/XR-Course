window.sync = { left: false, right: false };

let setSync = (hand, value) => {
   sync[hand] = value;
   server.broadcastGlobal('sync');
}

export const init = async model => {

   inputEvents.onPress   = hand => setSync(hand, true );
   inputEvents.onRelease = hand => setSync(hand, false);

   let boxes = {};
   for (let hand in sync)
      boxes[hand] = model.add('cube').move(hand=='left'?-.1:.1,1.5,0).scale(.05);

   model.animate(() => {
      sync = server.synchronize('sync');
      for (let hand in sync)
         boxes[hand].color(sync[hand] ? hand=='left' ? 'red' : 'blue' : 'white');
   });
}

