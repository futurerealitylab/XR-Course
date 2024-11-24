// DEMONSTRATION OF GETTING RIGID BODY INFO FROM THE OPTITRACK

import * as cg from "../render/core/cg.js";

let TRACK_ITEMS = ["1","2","3","4","5"];

export const init = async model => {
   let obj = [];
   for (let i = 0; i < TRACK_ITEMS.length; i++)
      obj.push(model.add('cube'));

   model.animate(() => {
      server.track();
      //console.log(trackInfo);

      if (trackInfo.length == 0) {
         console.log(window.timeStamp);
         return;
      }

      let info = cg.unpack(trackInfo, -2, 2);

      //console.log(info);

      for (let i = 0; i < TRACK_ITEMS.length; i++) {
         let tq = [parseFloat(info[i*7]), parseFloat(info[i*7+1]), parseFloat(info[i*7+2]), parseFloat(info[i*7+3]), parseFloat(info[i*7+4]), parseFloat(info[i*7+5]), parseFloat(info[i*7+6])];
         let m = cg.mFromQuaternion({ x:-tq[3], y:-tq[4], z:tq[5], w:tq[6] });
         m[12] = tq[0]+1.038;
         m[13] = tq[1]-0.01;
         m[14] = -tq[2]-0.212;
         obj[i].setMatrix(m).scale(.1);      
      }
      //let date = new Date();
      //console.log(date.valueOf());
   });
}
