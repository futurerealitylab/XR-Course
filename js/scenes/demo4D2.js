import * as cg from "../render/core/cg.js";

// MULTI-PLAYER INTERACTIVE HYPERCUBE

server.init('rot4D', cg.mIdentity());

let rot4D_set = m => {
   for (let i = 0 ; i < 16 ; i++)
      rot4D[i] = m[i];
}

let bit = (n,b) => n >> b & 1 ? 1 : -1;
let C = [];
for (let n = 0 ; n < 16 ; n++)
   C.push([ bit(n,0), bit(n,1), bit(n,2), bit(n,3) ]);

let E = [ [0,2,4,6,8,10,12,14],
          [0,1,4,5,8, 9,12,13],
          [0,1,2,3,8, 9,10,11],
          [0,1,2,3,4, 5, 6, 7] ];

let matrixMultiply = (a,b) => {
   let dst = [], n;
   for (n = 0 ; n < 16 ; n++)
      dst.push( a[n&3     ] * b[    n&12]
              + a[n&3 |  4] * b[1 | n&12]
              + a[n&3 |  8] * b[2 | n&12]
              + a[n&3 | 12] * b[3 | n&12] );
   return dst;
}

let rot = (theta, i, j) => {
   let R = cg.mIdentity();
   R[i<<2 | i] =  Math.cos(theta);
   R[i<<2 | j] =  Math.sin(theta);
   R[j<<2 | i] = -Math.sin(theta);
   R[j<<2 | j] =  Math.cos(theta);
   rot4D_set(cg.mMultiply(rot4D, R));
}

let project = p => {
   let m = rot4D, q = [];
   for (let i = 0 ; i < 4 ; i++)
      q.push(m[i<<2 | 0] * p[0] +
             m[i<<2 | 1] * p[1] +
             m[i<<2 | 2] * p[2] +
             m[i<<2 | 3] * p[3]);
   let s = .85 + .15 * q[3];
   return [ s * q[0], s * q[1], s * q[2] ];
}

let center = [0,1.3,0], size = .12;

export const init = async model => {

   let shape = model.add().move(center).scale(size);

   let corner = [];
   for (let n = 0 ; n < 16 ; n++)
      corner.push(shape.add('sphere').color(n<8 ? 'silver' : 'copper'));

   let edge = [];
   for (let n = 0 ; n < 32 ; n++) {
      let i = n/8 >> 0, j = n & 7;
      let a = E[i][j];
      let b = a + (1 << i);
      edge.push(shape.add('tubeZ').color(a<8&&b<8 ? 'silver' : 'copper'));
   }

   let P = {}, isDragging = false;

   inputEvents.onPress = hand => {
      P[hand] = inputEvents.pos(hand);
      isDragging = Math.max(Math.abs(P[hand][0]-center[0]),
                            Math.abs(P[hand][1]-center[1]),
                            Math.abs(P[hand][2]-center[2])) < 1.8 * size;
   }

   inputEvents.onDrag = hand => {
      if (isDragging) {
         let p = inputEvents.pos(hand);
         let d = cg.subtract(P[hand], p);
         P[hand] = p;
         for (let i = 0 ; i < 3 ; i++)
            rot(40 * size * d[i], i, 3);
         server.send('rot4D', rot4D);
      }
   }

   inputEvents.onClick = hand => {
      rot4D_set(cg.mIdentity());
      server.send('rot4D', rot4D);
   }

   model.animate(() => {
      server.sync('rot4D', msgs => {
         for (let id in msgs)
            rot4D_set(msgs[id]);
      });

      let p = [];
      for (let n = 0 ; n < 16 ; n++)
         p.push(project(C[n]));

      for (let n = 0 ; n < 16 ; n++)
         corner[n].identity().move(p[n]).scale(.05);

      for (let i = 0 ; i < 4 ; i++)
      for (let j = 0 ; j < 8 ; j++) {
         let A = p[E[i][j]];
         let B = p[E[i][j] + (1<<i)];
         edge[8*i+j].identity().move(cg.mix(A,B,.5))
                               .aimZ(cg.subtract(B,A))
                               .scale(.05,.05,.5*cg.distance(A,B));
      }
   });
}

