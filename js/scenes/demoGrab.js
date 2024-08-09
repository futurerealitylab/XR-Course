import * as cg from "../render/core/cg.js";

// THIS IS THE TYPE OF EACH BALL IN THE ARRAY OF SHARED BALLS.
// EACH BALL HAS A POSITION AND AN INDICATION OF ITS CURRENT STATE.
// THERE ARE THREE POSSIBLE STATES:
// 'free'  : FREE TO BE GRABBED BY ANY CLIENT.
// 'busy'  : SOMEBODY IS GRABBING IT, SO NO OTHER CLIENT CAN.
// 'unused': THIS IS AN EMPTY SLOT, WAITING FOR SOMEONE TO ADD A BALL.

let Ball = function(p) {
   this.pos = p;
   this.state = 'free';
}

// ALL BALLS HAVE A RADIUS OF 0.05.

let radius = 0.05;

// FIRST WE CREATE SOME INITIAL BALLS.

window.balls = [];
for (let i = 0 ; i < 4 ; i++) {
   let theta = 2 * Math.PI * i / 4;
   let c = 4 * radius * Math.cos(theta);
   let s = 4 * radius * Math.sin(theta);
   balls.push(new Ball([ s, 1.5 + c, 0 ]));
}

// THEN WE FILL THE ARRAY WITH UNUSED SLOTS, INTO WHICH MORE BALLS CAN BE ADDED.

for (let i = 4 ; i < 100 ; i++) {
   balls.push(new Ball([0,0,0]));
   balls[balls.length-1].state = 'unused';
}

export const init = async model => {

   // INDEX OF THE BALL THAT THE LEFT AND RIGHT HAND ARE EACH GRABBING.
   // AN INDEX OF -1 MEANS THAT THIS HAND IS NOT CURRENTLY GRABBING ANYTHING.

   let ballIndex = { left: -1, right: -1 };

   // FIND THE BALL LOCATED WHERE A HAND IS, IF ANY.
   // hand IS EITHER 'left' OR 'right'.

   let findBall = hand => {
      let dMin = 10000, iMin = -1;
      for (let i = 0 ; i < balls.length ; i++)
         if (balls[i].state == 'free') {
            let d = cg.distance(inputEvents.pos(hand), balls[i].pos);
            if (d < dMin) {
               dMin = d;
               iMin = i;
            }
         }
      return dMin < 2 * radius ? iMin : -1;
   }

   // ON PRESS EVENT: IF THERE IS A BALL AT THIS POSITION,
   // THEN TELL ALL OTHER CLIENTS THAT THIS BALL IS NOW BUSY.

   inputEvents.onPress = hand => {
      let i = findBall(hand);
      if (i >= 0) {
         balls[i].state = 'busy';
         server.broadcastGlobalSlice('balls', i, i+1);
      }
      ballIndex[hand] = i;
   }

   // ON DRAG EVENT: IF CLIENT IS GRABBING A BALL, THEN MOVE IT.

   inputEvents.onDrag = hand => {
      let i = ballIndex[hand];
      if (i >= 0) {
         balls[i].pos = cg.roundVec(3, cg.mix(balls[i].pos, inputEvents.pos(hand), .5));
         server.broadcastGlobalSlice('balls', i, i+1);
      }
   }

   // ON RELEASE EVENT: TELL OTHER CLIENTS THIS BALL IS NOW FREE TO GRAB.

   inputEvents.onRelease = hand => {
      let i = ballIndex[hand];
      if (i >= 0) {
         balls[i].state = 'free';
         server.broadcastGlobalSlice('balls', i, i+1); // TELL ALL OTHER CLIENTS.
      }
   }

   // CLICK ON A BALL TO DELETE IT. CLICK ANYWHERE ELSE TO CREATE A NEW BALL.

   inputEvents.onClick = hand => {
      let i = findBall(hand);
      if (i >= 0)                                // CLICK ON A BALL TO DELETE IT
         balls[i].state = 'unused';
      else                                       // CLICK ANYWHERE ELSE
         for (i = 0 ; i < balls.length ; i++)    // TO CREATE A NEW BALL
            if (balls[i].state == 'unused') {
               balls[i].state = 'free';
               balls[i].pos = cg.roundVec(3, inputEvents.pos(hand));
               break;
            }
      server.broadcastGlobalSlice('balls', i, i+1);    // TELL ALL OTHER CLIENTS
   }

   // ON START-UP, CREATE THE GEOMETRY FOR ALL THE BALLS.

   for (let i = 0 ; i < balls.length ; i++)
      model.add('sphere');

   // AT EACH ANIMATION FRAME:

   model.animate(() => {

      // SYNCHRONIZE VALUE OF balls ARRAY FOR ALL CLIENTS.

      balls = server.synchronize('balls');

      // RENDER ALL THE BALLS.

      for (let i = 0 ; i < balls.length ; i++)
         if (balls[i].state == 'unused')
            model.child(i).scale(0);       // IF A SLOT IS UNUSED, JUST SCALE THAT BALL TO 0.
         else
                                           // MAKE A BALL SMALLER WHILE IT IS BEING GRABBED.

            model.child(i).identity().move(balls[i].pos).scale(radius * (balls[i].state == 'busy' ? .7 : 1));
   });
}


