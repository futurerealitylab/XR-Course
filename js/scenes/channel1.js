export const init = async model => {
   let cube = model.add('cube');
   model.animate(() => {
      let p = channelData[clients[0]] ?? [0,1.5,0];
      if (clientID == clients[0]) {
         let s = f => .5 * Math.sin(f * model.time);
         p = [ s(3), s(4) + 1.5, s(5) ];
         for (let i = 1 ; i < clients.length ; i++)
	    channel[clients[i]].send(p);
      }
      cube.identity().move(p).scale(.1);
   });
}
