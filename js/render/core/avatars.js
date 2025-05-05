import * as cg from './cg.js';
const fw = [.021,.019,.018,.017,.015];
const fl = [   0,.087,.098,.093,.076];

let fingerLength = [0,0,0,0,0];

/*
   Eventually we want to turn the hand reconstruction
   into a resource that can be used by g3.js.
*/

export let updateAvatars = avatars => {
   while (avatars.nChildren() > 0)
      avatars.remove(0);
   for (let n = 0 ; n < clients.length ; n++) {                   // SHOW AVATARS OF OTHER CLIENTS,
      let id = clients[n];                                        // BUT ONLY IF THOSE CLIENTS ARE
      if (id != clientID && clientState.isXR(id)) {               // IN IMMERSIVE MODE.
         let avatar = avatars.add();

         // SHOW THE HEAD AS A RING. WE SHOULD ADD TRANSPARENT EYES, VISIBLE ONLY IF PERSON IS FACING ME.

         let m = clientState.head(id);
         avatar.add('ringZ').setMatrix(m).move(0,.01,0).scale(.1,.12,.8).opacity(.7);
         avatar.add('square').setMatrix(m).move(-.0325,.014,0).turnY(Math.PI).scale(.01,.01,.00).opacity(.7);
         avatar.add('square').setMatrix(m).move( .0325,.014,0).turnY(Math.PI).scale(.01,.01,.00).opacity(.7);

         for (let hand in {left:0,right:0})

	    // IF HAND TRACKING

            if (clientState.isHand(id)) {

	       // DRAW THE FIVE FINGERTIPS. SET COLOR ACCORDING TO GESTURE.

	       let P = [], finger = [];
               for (let p = 1 ; p < 7 ; p++)
                  P[p] = clientState.pinch(id, hand, p);
               for (let f = 0 ; f < 5 ; f++) {
	          finger[f] = clientState.finger(id,hand,f);
	          let c = f == 0 ? P[1]?1:P[2]?2:P[3]?3:P[4]?4:P[5]?5:P[6]?6:0
		        : f == 1 ? P[1]?1:P[5]?5:P[6]?6:0
		        : P[f] ? f : 0;
                  avatar.add('sphere').move(finger[f]).scale(fw[f]/2)
		                      .opacity(c==0 ? .7 : .9).color(clientState.color(c));
               }

	       // PLACE THE KNUCKLES.

               let m = clientState.hand(id, hand);
               let s = hand == 'left' ? -1 : 1;
               let knuckle = [ [    0*s,    0,    0], // Haven't done the thumb knuckle yet.
	                       [-.025*s,-.007,-.094],
                               [-.003*s,-.004,-.093],
                               [ .017*s,-.008,-.086],
                               [ .033*s,-.015,-.075] ];
               for (let f = 0 ; f < 5 ; f++)
	          knuckle[f] = cg.mTransform(m, knuckle[f]);

	       // DRAW FINGERS, CONNECTING KNUCKLES TO FINGERTIPS

               let z = cg.scale(m.slice(8,11), -1);
               for (let f = 1 ; f < 5 ; f++) {
                  let r = fw[f]/2;
		  let l = fl[f];
		  let A = knuckle[f];
		  let D = finger[f];
                  let B = cg.ik2(A, D, l*.27 , l*.66 , z);
                  let C = cg.ik2(B, D, l*.335, l*.335, z);
                  avatar.add('sphere').move(B).scale(r).opacity(.7).color(clientState.color(0));
                  avatar.add('sphere').move(C).scale(r).opacity(.7).color(clientState.color(0));
                  avatar.add('can12' ).placeLimb(A,B,r).opacity(.7).color(clientState.color(0));
                  avatar.add('tube12').placeLimb(B,C,r).opacity(.7).color(clientState.color(0));
                  avatar.add('tube12').placeLimb(C,D,r).opacity(.7).color(clientState.color(0));
               }

	       /*
	          Building the thumb will be more challenging, since the direction that the
		  thumb points varies with the position of the tip of the thumb.
		  Hopefully I can find a simple function that computes the former from the latter.
	       */
            }

	    // IF USING CONTROLLERS

            else {                                                

               // SHOW THE VIRTUAL PING PONG BALLS. SET COLOR ACCORDING TO GESTURE.

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

