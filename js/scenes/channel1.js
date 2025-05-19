export const init = async model => {
   let myObject = model.add('cube');
   model.animate(() => {
      let p = channel[clients[0]].get() ?? [0,1.5,0];
      if (clientID == clients[0]) {                  // The 'master client' is
         let s = f => Math.sin(f*model.time)/2;      // clients[0].  It places
         p = [ s(1), s(2)+1.5, s(3) ];               // the object, then sends
         for (let i=1 ; i < clients.length ; i++)    // that animation data to
            channel[clients[i]].put(p);              // every other client, to
      }                                              // maintain shared state.
      myObject.identity().move(p).scale(.1);
   });
}
