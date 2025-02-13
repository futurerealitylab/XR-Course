import * as cg from "../render/core/cg.js";
import { G2 } from "../util/g2.js";
export const init = async model => {

   // NEW MULTI-UNIT TEXTURE API

   let txtr_is_canvas = false;
   let txtr_is_video = false;

   let g2_instance = new G2();

   if (txtr_is_canvas) {
      model.txtrSrc(2, g2_instance.getCanvas(), false); // SET 3RD ARG TO TRUE TO RENDER ONLY ONCE
   }
   else if (txtr_is_video)
      model.txtrSrc(2, videoFromCamera);
   else
      model.txtrSrc(2, "../media/textures/concrete.png");

   model.customShader(`
      uniform mat4 uWorld;
      -------------------------------
      vec4 pos = uProj * uView * uWorld * vec4(vPos, 1.);
      float mist = pow(.985, length(pos.xyz));
      color = mix(vec3(.5), color, mist);
   `);

   let touched = false;
   let tr = .375, cr = .0375, ry = .8;
   let dragPos = [.2,-.05,-.2], movePos = { left: [0,1,0], right: [0,1,0] };
   let ilo = -2, ihi = 4;
   let container = model.add('sphere').scale(1000,1000,-1000);
   let rooms = model.add().move(0,ry,0);
   let dragMarker = model.add();
   for (let i = ilo ; i <= ihi ; i++) {
      let room = rooms.add();
         let table = room.add();
            table.add('cube').scale(1.5).move(0,-.11,0).scale(.3,.01,.3).txtr(2); // NEW MULTI-UNIT TEXTURE API
            table.add('cube').scale(1.5).move(0,-.45,0).scale(.05,.345,.05).color(0,0,0);
         let chair = room.add();
            chair.add('cube').move(0,2.9,-.9).scale(1,.9,.1);
            chair.add('cube').move(0,1.9,0).scale(1,.1,1);
            chair.add('cube').move(-.9,.9,-.9).scale(.1,.9,.1);
            chair.add('cube').move( .9,.9,-.9).scale(.1,.9,.1);
            chair.add('cube').move(-.9,.9, .9).scale(.1,.9,.1);
            chair.add('cube').move( .9,.9, .9).scale(.1,.9,.1);
	    //if (i == 1)
               //chair.add('cube').scale(.99).opacity(.1);
         room.add('tubeY');
   }

   inputEvents.onMove = hand => movePos[hand] = inputEvents.pos(hand);

   inputEvents.onDrag = hand => {
      let p = inputEvents.pos(hand);
      dragPos = [ Math.max(-tr, Math.min(tr, p[0])),
                  Math.max(-4*cr, p[1] - ry),
                  Math.max(-tr, Math.min(tr, p[2])) ];
   }

   model.animate(() => {

      if (txtr_is_canvas) {
         let ctx = g2_instance.getCanvas().getContext('2d');
         ctx.fillStyle = '#000000';
         ctx.fillRect(0, 0, 512, 512);
         ctx.fillStyle = '#ff00ff';
	 let a = 50;
	 let c = 256 + (256-a) * Math.cos(2 * model.time);
	 let s = 256 + (256-a) * Math.sin(2 * model.time);
         ctx.fillRect(s-a/2, c-a/2, a, a);
      }

      model.setUniform('Matrix4fv', 'uWorld', false, worldCoords);
      let bigChairPos;
      for (let i = ihi ; i >= ilo ; i--) {
         let room = rooms.child(i - ilo);
	 room.identity().scale(Math.pow(8, i));

	 let chair = room.child(1);
	 let thing = room.child(2);

         chair.identity().move(dragPos).color(i==1&&touched?[1,.5,.5]:[0,.25,.5]).scale(cr);
	 if (i == 1) {
	    bigChairPos = chair.getGlobalMatrix().slice(12,15);
	    bigChairPos[1] += cr * 8;
         }

         thing.identity().turnY(model.time/2).move(1,1.5,0).scale(.15);
      }
      let dL = cg.subtract(movePos.left , bigChairPos);
      let dR = cg.subtract(movePos.right, bigChairPos);
      let tL = Math.max(Math.abs(dL[0]), Math.abs(dL[1]), Math.abs(dL[2]));
      let tR = Math.max(Math.abs(dR[0]), Math.abs(dR[1]), Math.abs(dR[2]));
      touched = Math.min(tL, tR) < cr * 8;
   });
}

