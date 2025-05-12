import * as cg from './cg.js';

const fw = [.023,.021,.020,.019,.017];
const fl = [   0,.087,.098,.093,.076];

export let computeHandPose = (id, hand) => {
   let FC = [];
   {
      let P = [];
      for (let p = 1 ; p < 7 ; p++)
         P[p] = clientState.pinch(id, hand, p);
      for (let f = 0 ; f < 5 ; f++)
         FC.push(f == 0 ? P[1]?1:P[2]?2:P[3]?3:P[4]?4:P[5]?5:P[6]?6:0
                        : f == 1 ? P[1]?1:P[5]?5:P[6]?6:0
                                 : P[f] ? f : 0);
   }
   let FP = [];
   {
      let s = hand == 'left' ? -1 : 1;
      let knuckle = [ [    0*s,    0,    0],
                      [-.025*s,-.007,-.094],
                      [-.003*s,-.004,-.093],
                      [ .017*s,-.008,-.086],
                      [ .033*s,-.015,-.075] ];
      let handMatrix = clientState.hand(id, hand);
      let z = cg.scale(handMatrix.slice(8,11), -1);
      for (let f = 0 ; f < 5 ; f++) {
         let D = clientState.finger(id,hand,f);
         let F = [];
         if (f > 0) {
	    let len = fl[f];
            let A = cg.mTransform(handMatrix, knuckle[f]);
            let B = cg.ik2(A, D, len*.27 , len*.66 , z);
            let C = cg.ik2(B, D, len*.335, len*.335, z);
            F.push(A,B,C);
         }
         F.push(D);
         FP.push(F);
      }
   }
   return { c: FC, p: FP };
}

export let fingerWidth = f => fw[f];

export let updateAvatars = avatars => {
   while (avatars.nChildren() > 0)
      avatars.remove(0);
   for (let n = 0 ; n < clients.length ; n++) {                   // SHOW AVATARS OF OTHER CLIENTS,
      let id = clients[n];                                        // BUT ONLY IF THOSE CLIENTS ARE
      if (id != clientID && clientState.isXR(id)) {               // IN IMMERSIVE MODE.
         let avatar = avatars.add();

         // SHOW THE HEAD AS A RING. WE SHOULD ADD TRANSPARENT EYES, VISIBLE ONLY IF PERSON IS FACING ME.

         let m = clientState.head(id);
         avatar.add('ringZ').setMatrix(m).move(0,-.01,0).scale(.1,.12,.8).opacity(.7);
         avatar.add('disk12').setMatrix(m).move(-.0325,-.01,-.06).turnY(Math.PI).scale(.013,.013,.00).opacity(.7);
         avatar.add('disk12').setMatrix(m).move( .0325,-.01,-.06).turnY(Math.PI).scale(.013,.013,.00).opacity(.7);

         for (let hand in {left:0,right:0})

            // IF HAND TRACKING

            if (clientState.isHand(id)) {
               let handPose = computeHandPose(id, hand);
	       let C = handPose.c;
	       for (let f = 0 ; f < 5 ; f++) {
                  let r = fw[f]/2;
	          let F = handPose.p[f];
		  if (f > 0) {
                     avatar.add('sphere').move(F[1]).scale(r).opacity(.7).color(clientState.color(0));
                     avatar.add('sphere').move(F[2]).scale(r).opacity(.7).color(clientState.color(0));
                     avatar.add('can12' ).placeLimb(F[0],F[1],r).opacity(.7).color(clientState.color(0));
                     avatar.add('tube12').placeLimb(F[1],F[2],r).opacity(.7).color(clientState.color(0));
                     avatar.add('tube12').placeLimb(F[2],F[3],r).opacity(.7).color(clientState.color(C[f]));
	          }
                  avatar.add('sphere').move(F[F.length-1]).scale(r).opacity(.7).color(clientState.color(C[f]));
	       }
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

