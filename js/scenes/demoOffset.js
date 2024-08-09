import * as cg from "../render/core/cg.js";

export const init = async model => {
   let obj = model.add('sphere').dull();

   let tableheight = 0.73;

   let pos = [0,0,0];

   model.animate(() => {
      server.objdetect();
      if (window.objinfo) {
         if (JSON.parse(window.objinfo)["chair"] !== undefined) {
            let chair_angle = JSON.parse(window.objinfo)["chair"];
            let vm = cg.mMultiply(clay.inverseRootMatrix, clay.root().inverseViewMatrix(0));
            let x = vm.slice(0,3);
            let y = vm.slice(4,7);
            let z = vm.slice(8,11);
            let p = vm.slice(12,15);
            z = cg.rotateAroundAxis(z,chair_angle[0],y);
            z = cg.rotateAroundAxis(z,-chair_angle[1],x);
            
            pos = cg.add(p, cg.scale(cg.normalize(z),p[1]-tableheight));
            //pos = cg.add(z,p);
            //console.log(z);
         }
      }
      /*if (window.qrinfo !== undefined) {
         //console.log(window.qrinfo);
         let dist = JSON.parse(window.qrinfo)['dist'];
         if (dist > 0) {
            
            let angle = JSON.parse(window.qrinfo)['angle'];
            let vm = cg.mMultiply(clay.inverseRootMatrix, clay.root().inverseViewMatrix(0));
            let x = vm.slice(0,3);
            let y = vm.slice(4,7);
            let z = vm.slice(8,11);
            let p = vm.slice(12,15);
            z = cg.rotateAroundAxis(angle[0],y,z);
            z = cg.rotateAroundAxis(angle[1],x,z);
            pos = cg.add(z,p);
         }
      }
      //console.log(pos);
      */
      obj.identity().move(pos[0],pos[1],pos[2]-3).scale(0.05);
   });
}