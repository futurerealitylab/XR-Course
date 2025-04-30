export let updateAvatars = avatars => {
   while (avatars.nChildren() > 0)
      avatars.remove(0);
   for (let n = 0 ; n < clients.length ; n++) {                   // SHOW AVATARS OF OTHER CLIENTS,
      let id = clients[n];                                        // BUT ONLY IF THOSE CLIENTS ARE
      if (id != clientID && clientState.isXR(id)) {               // IN IMMERSIVE MODE.
         let avatar = avatars.add();
         avatar.add('ringZ').setMatrix(clientState.head(id)).move(0,.01,0).scale(.1,.12,.8).opacity(.7);
         for (let hand in {left:0,right:0})
            if (clientState.isHand(id)) {
	       let P = [];
               for (let p = 1 ; p < 7 ; p++)
                  P[p] = clientState.pinch(id, hand, p);
               for (let f = 0 ; f < 5 ; f++) {
	          let c = f == 0 ? P[1]?1:P[2]?2:P[3]?3:P[4]?4:P[5]?5:P[6]?6:0
		        : f == 1 ? P[1]?1:P[5]?5:P[6]?6:0
		        : P[f] ? f : 0;
                  avatar.add('sphere').move(clientState.finger(id,hand,f)).scale(.01)
		                      .opacity(c==0 ? .7 : .9).color(clientState.color(c));
               }
            }
            else {                                                
               let c = 0;
               for (let b = 0 ; b < 7 ; b++)
                  if (clientState.button(id, hand, b))
                     c = b + 1;
               avatar.add('sphere').move(clientState.finger(id,hand,1))
                                   .color(clientState.color(c))
                                   .scale(.02).opacity(c==0 ? .7 : .9);
            }
      }
   }  
}

