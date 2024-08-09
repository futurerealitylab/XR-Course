import * as cg from "../render/core/cg.js";
import { g2 } from "../util/g2.js";
import { uiBox } from "../render/core/UIBox.js";
import { Toio } from "../render/core/toio.js";

const N = 4;                                       // NUMBER OF TOIOS
const T = 8;                                       // TIME BETWEEN SWAPS
const y0 = 28 * 0.0254;                            // TABLE HEIGHT
const color = [[1,0,0],[1,1,0],[0,.5,1],[.5,0,1]]; // TOIO COLORS

window.toios = (new Array(1 + 5 * N)).fill(0);

// FOR SORTING MODE, MAINTAIN A RANDOMIZABLE ORDERING LIST

let order = [];
for (let n = 0 ; n < N ; n++)
   order.push(n);
let swapOrder = (i,j) => {
   let tmp = order[i];
   order[i] = order[j];
   order[j] = tmp;
}

// MAINTAIN A VISIBLE POSITIONAL TARGET OBJECT FOR EACH TOIO

function Target(model, hue, seed) {
   let mode = 1, root = model.add();
   root.add('tubeY').move(0,.019,0).scale(.002,.019,.002).color(hue);

   this.getMode = () => mode;
   this.getPos = () => root.getMatrix().slice(12,15);
   this.setMode = _mode => mode = _mode;
   this.setPos = (x,y,z) => root.identity().move(x,y,z);
   this.update = t => {
      if (mode == 1)
         root.identity().move(.4 * cg.noise(t/8, 100.5, 100 * seed + .5), y0,
                              .4 * cg.noise(t/8, 200.5, 100 * seed + .5));
   }
}

export const init = async model => {

   let isModeChange = false;

   // CREATE THE POSITION TARGETS

   let target = [];
   for (let n = 0 ; n < N ; n++)
      target[n] = new Target(model, color[n % color.length], n);

   // CREATE THE TOIOS

   let toio = [];
   for (let n = 0 ; n < N ; n++) {
      toio[n] = new Toio(model, color[n % color.length]);
      toio[n].setPos(.1 * (n-N/2+.5), y0, 0);
   }
   for (let n = 0 ; n < N ; n++) // TELL THE TOIOS ABOUT EACH OTHER
      toio[n].others(toio);

   // CREATE THE BUTTON BOX TO LET THE USER SWITCH MODES

   let button1Box = uiBox('button', model,
      () => {                        // SPECIFY BUTTON'S LABEL TEXT
         g2.setColor('#ffffff');
         g2.fillRect(0,0,1,1);
         g2.setColor('#000000');
         g2.textHeight(.2);
         g2.fillText(target[0].getMode()==0 ? 'sorting'
	                                    : 'roaming', .5,.5, 'center');
      },
      () => {                        // SPECIFY ACTION UPON BUTTON RELEASE
         isModeChange = true;
      }
   );
   button1Box.move(0,y0+.2,0).scale(.02);

   // FRAME-BY-FRAME ANIMATION

   let prevMode = 1;
   let prevTime = T - .0001;
   model.animate(() => {
      toios = server.synchronize('toios');
      console.log(toios);
      button1Box.update();

      if (isModeChange) {
         toios[0] = 1 - target[0].getMode();
	 server.broadcastGlobalSlice('toios', 0, 1);
	 isModeChange = false;
      }

      if (toios[0] != prevMode) {
         prevTime = model.time + .001;
	 prevMode = toios[0];
      }

      for (let n = 0 ; n < N ; n++)
         target[n].setMode(toios[0]);

      // IF FIRST CLIENT, COMPUTE BEHAVIOR

      if (clientID == clients[0]) {

         // IF IN SORTING MODE, PERIODICALLY SWAP TARGET POSITIONS

         if (target[0].getMode() == 0 && model.time % T < prevTime % T) {
            for (let k = 0 ; k < 20 ; k++)
	       swapOrder(N * Math.random() >> 0, N * Math.random() >> 0);
            for (let n = 0 ; n < N ; n++)
	       target[n].setPos(.1 * (order[n]-N/2+.5), y0, 0);
         }

         // UPDATE ALL TARGETS AND ALL TOIOS

         for (let n = 0 ; n < N ; n++) {
            target[n].update(model.time);
            toio[n].update(target[n].getPos());

	    // PREPARE TO SEND NEW VALUES TO OTHER CLIENTS

            let m = toio[n].getMatrix();
            let p = target[n].getPos();
	    toios[5*n+1] = m[12];
	    toios[5*n+2] = m[14];
	    toios[5*n+3] = Math.atan2(m[8],m[10]);
	    toios[5*n+4] = p[0];
	    toios[5*n+5] = p[2];
         }
	 //cg.roundVec(4, toios);
	 server.broadcastGlobal('toios');
      }

      // ALL OTHER CLIENTS JUST COPY VALUES FROM THE FIRST CLIENT

      else
         for (let n = 0 ; n < N ; n++) {
	    toio[n].setXZR(toios[5*n+1], toios[5*n+2], toios[5*n+3]);
	    target[n].setPos(toios[5*n+4], y0, toios[5*n+5]);
         }

      prevTime = model.time;
   });
}

