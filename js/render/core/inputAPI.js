import * as cg from "./cg.js";
import { buttonState, joyStickState, controllerMatrix } from "./controllerInput.js";

let mToPQ = m => {
   let p = m.slice(12,15);
   let q = cg.mToQuaternion(m);
   let s = Math.sign(q.w);
   return [ p[0], p[1], p[2], s*q.x, s*q.y, s*q.z ];
}

let mFromPQ = (p,q) => {
   let w = Math.sqrt(1 - q[0]*q[0] - q[1]*q[1] - q[2]*q[2]);
   let m = cg.mFromQuaternion({ x:q[0], y:q[1], z:q[2], w:w });
   m[12] = p[0];
   m[13] = p[1];
   m[14] = p[2];
   return m;
}

export let createInput = () => {
   let H, L, R, Lp, Rp, lb = 0, rb = 0, ljx = 0, ljy = 0, rjx = 0, rjy = 0;

   H = cg.mix(clay.root().inverseViewMatrix(0), clay.root().inverseViewMatrix(1), .5);
   if (window.handtracking) {
      L = clay.handsWidget.getMatrix('left' ,0,0);
      R = clay.handsWidget.getMatrix('right',0,0);
      Lp = cg.mix(clay.handsWidget.getMatrix('left' ,0,4), clay.handsWidget.getMatrix('left' ,1,4), .5);
      Rp = cg.mix(clay.handsWidget.getMatrix('right',0,4), clay.handsWidget.getMatrix('right',1,4), .5);
      for (let i = 12 ; i < 15 ; i++) {
         L[i] = Lp[i];
         R[i] = Rp[i];
      }
      lb = clay.handsWidget.pinch.left;
      rb = clay.handsWidget.pinch.right;
   }
   else {
      L = cg.mMultiply(controllerMatrix.left , cg.mTranslate( .01,-.04,-.08));
      R = cg.mMultiply(controllerMatrix.right, cg.mTranslate(-.01,-.04,-.08));
      for (let b = 0 ; b < 7 ; b++) {
         lb |= (buttonState.left [b].pressed == true) << b;
         rb |= (buttonState.right[b].pressed == true) << b;
      }
      ljx = joyStickState.left .x;
      ljy = joyStickState.left .y;
      rjx = joyStickState.right.x;
      rjy = joyStickState.right.y;
   }
   H = cg.mMultiply(clay.inverseRootMatrix, H);
   L = cg.mMultiply(clay.inverseRootMatrix, L);
   R = cg.mMultiply(clay.inverseRootMatrix, R);

   let h = mToPQ(H);
   let l = mToPQ(L);
   let r = mToPQ(R);

   let input = [ h[0], h[1], h[2], h[3], h[4], h[5],
                 l[0], l[1], l[2], l[3], l[4], l[5], lb,ljx,ljy,
                 r[0], r[1], r[2], r[3], r[4], r[5], rb,rjx,rjy ];

   for (let i = 0 ; i < input.length ; i++)
      input[i] = (1000 * input[i] >> 0) / 1000;

   return input;
}

function Head() {
   let H = [0,0,0,0,0,0];
   this.update = input => H = input;
   this.matrix = () => mFromPQ([H[0],H[1],H[2]], [H[3],H[4],H[5]]);
}

function Controller() {
   let C = [0,0,0,0,0,0,0,0,0], C6 = 0;
   this.update = input => {
      C6 = C[6];
      C = input;
   }
   this.matrix    = () => mFromPQ([C[0],C[1],C[2]], [C[3],C[4],C[5]]);
   this.isPress   = b  => !((C6 >> b) & 1) &&  ((C[6] >> b) & 1);
   this.isDown    = b  =>                       (C[6] >> b) & 1;
   this.isRelease = b  =>  ((C6 >> b) & 1) && !((C[6] >> b) & 1);
   this.joystick  = () => [C[7],C[8]];
}

export function Input() {
   let H = new Head(), L = new Controller(), R = new Controller();
   this.update = input => {
      if (input) {
         H.update(input.slice( 0,  6));
         L.update(input.slice( 6, 15));
         R.update(input.slice(15, 24));
      }
   }
   this.head = () => H;
   this.controller = hand => hand == 'left' ? L : R;
}

