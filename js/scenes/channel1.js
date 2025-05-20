export const init = async model => {
   let myObject = model.add('cube'), p = [0,1.5,0];
   model.animate(() => {
      channel[clients[0]].on = data => p = data;
      if (clientID == clients[0]) {                  // The 'master client' is
         let s = f => Math.sin(f*model.time)/2;      // clients[0].  It places
         p = [ s(1), s(2)+1.5, s(3) ];               // the object, then sends
         for (let i=1 ; i < clients.length ; i++)    // that animation data to
            channel[clients[i]].send(p);             // every other client, to
      }                                              // maintain shared state.
      myObject.identity().move(p).scale(.1);
   });
}
