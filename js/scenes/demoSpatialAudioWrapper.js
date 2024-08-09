import * as cg from "../render/core/cg.js";
import { g2 } from "../util/g2.js";
import { createSoundSource, playSound, updatePosition } from "../util/spatial-audio.js";


createSoundSource(0, '../../media/sound/SFXs/demoChart/SFX_Chart_Hologram_Mono_LP_01.wav', [.4, 1.6, 0], true, 0.5);
createSoundSource(1, '../../media/sound/SFXs/demoBalls/SFX_Ball_Create_Mono_01.wav', [0, 0, 0], false, 1.0);



window.chart = [];

let N = 8;

export const init = async model => {



   inputEvents.onClick = hand => {
      let emptyObj = model.add().move(cg.roundVec(4, inputEvents.pos(hand)));
      let objPos = emptyObj.getGlobalMatrix();
      updatePosition(1,[objPos[12], objPos[13], objPos[14]]);
      playSound(1);
      model.remove(emptyObj);
   }

   let obj = model.add();

   let al = 1.3;
   obj.createAxes(al, .015).move(-.5,0,-.5);

   let bars = obj.add();
   for (let i = 0 ; i < N*N ; i++) {
      chart.push(0);
      bars.add('cube').color(.5 + cg.noise(10*i, i/N, i%N),
                             .5 + cg.noise(i, 10*i/N, i%N),
                             .5 + cg.noise(i, i/N, 10*i%N));
   }

   let labelTime = obj.add().move(0,1,0).scale(.15);

   let labelX = obj.add().move(al+.2-.5,0,-.5).scale(.15).text('X axis', .25);
   let labelY = obj.add().move(-.5, al+.2,-.5).scale(.15).text('Y axis', .25);
   let labelZ = obj.add().move(-.5,0,al+.2-.5).scale(.15).text('Z axis', .25);


   // play sound at given position
   playSound(0);

   model.animate(() => {
      chart = server.synchronize('chart');

      labelX.billboard();
      labelY.billboard();
      labelZ.billboard();

      labelTime.text('time:\n\n' + cg.decimal(model.time), .25);//.billboard();

      obj.identity().move(.4,1.6,0).scale(.2);

      let objPos = obj.getGlobalMatrix();

      updatePosition(0, [objPos[12], objPos[13], objPos[14]]);

      for (let i = 0 ; i < bars.nChildren() ; i++) {
         chart[i] = 1 + cg.noise(model.time/2,i/N,i%N);
         let col = i % N;
         let row = i / N >> 0;
         bars.child(i).identity()
                      .scale(1/N)
                      .move(col-(N-1)/2, N*chart[i]/4, row-(N-1)/2)
                      .scale(.4,N*chart[i]/4,.4);
      }
   });
}

