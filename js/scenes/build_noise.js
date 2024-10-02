import * as cg from "../render/core/cg.js";
import { Diagram } from "../render/core/diagram.js";

window.bn = {
   active: false,
   above : true,
   I     : 0,
   J     : 0,
}

let dir = [];
for (let n = 0 ; n < 25 ; n++)
   dir.push(7 * n % 25);

let y = 1.6, s = t => 1 - (3 - 2*Math.abs(t)) * t * t;
let R = (x,z,i,j) => .5 * (C[5*(j+2)+(i+2)] * x + S[5*(j+2)+(i+2)] * z);
let C = [], S = [];
for (let i = -2 ; i <= 2 ; i++)
for (let j = -2 ; j <= 2 ; j++) {
   let theta = 2 * Math.PI * dir[5*(j+2) + (i+2)] / 25;
   C.push(Math.cos(theta));
   S.push(Math.sin(theta));
}

export const init = async model => {
   let handleInput = p => {
      bn.active = Math.abs(p[0]) < .25 && Math.abs(p[2]) < .25;
      bn.above  = p[1] > y;
      if (bn.active) {
         bn.I = (4 * p[0] + 1.5 >> 0) - 1;
         bn.J = (4 * p[2] + 1.5 >> 0) - 1;
      }
      server.broadcastGlobal('bn');
   }
   inputEvents.onPress   = hand => handleInput(inputEvents.pos(hand));
   inputEvents.onDrag    = hand => handleInput(inputEvents.pos(hand));
   inputEvents.onRelease = hand => {
      bn.active = false;
      server.broadcastGlobal('bn');
   }

   let diagram = new Diagram(model, [0,y,0], .5, draw => {
      draw.outlineCanvas(false);

      draw.save();
         draw.move(0,.95,0);
         draw.scale(.05);
         draw.text({ color: [1,1,1], text: 'Building 2D noise' });
	 if (bn.active) {
            draw.scale(.7);
	    draw.move(0,-3,0);
            if (bn.above) {
               draw.text({ color: [0,.25,1], text: 'kernel' });
	       draw.move(0,-1,0);
               draw.text({ color: [.5,0,1], text: '×' });
	       draw.move(0,-1,0);
               draw.text({ color: [1,0,0], text: 'linear' });
	    }
	    else {
               draw.text({ color: [.5,0,1], text: 'kernel × linear → wavelet' });
	    }
	 }
      draw.restore();

      let drawGrid = (n,rgb,X,Z,s,f) => {
         for (let i = 0 ; i <= n ; i++) {
            let x = 2 * i/n - 1;
            let px = [], pz = [];
            for (let j = 0 ; j <= n ; j++) {
               let z = 2 * j/n - 1;
               px.push([s*X+s*x,s*f(x,z),s*Z+s*z]);
               pz.push([s*X+s*z,s*f(z,x),s*Z+s*x]);
            }
            draw.line({ color: rgb, path: px, lineWidth: .0008 });
            draw.line({ color: rgb, path: pz, lineWidth: .0008 });
         }
      }
      drawGrid(30, [1,1,1]  , 0,0,.50, (x,z) => {
	 let sum = 0;
	 let n = bn.active ? 1 : 2;
         for (let i = -n ; i <= n ; i++)
         for (let j = -n ; j <= n ; j++) {
	    let xi = 2*x-i;
	    let zj = 2*z-j;
	    if (Math.abs(xi) < 1 && Math.abs(zj) < 1)
	        sum += s(xi)*s(zj) * R(xi,zj,i,j);
         }
	 return sum;
      });
      if (bn.active)
         if (bn.above) {
            drawGrid(30, [0,.25,1], bn.I,bn.J,.25, (x,z) => s(x) * s(z));
            drawGrid(15, [1,0,0]  , bn.I,bn.J,.25, (x,z) => R(x,z,bn.I,bn.J));
         }
	 else
            drawGrid(30, [.5,0,1] , bn.I,bn.J,.25, (x,z) => s(x) * s(z) * R(x,z,bn.I,bn.J));
   });
   model.animate(() => {
      bn = server.synchronize('bn');
      diagram.update();
   });
}

