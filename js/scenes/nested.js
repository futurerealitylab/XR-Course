import * as cg from "../render/core/cg.js";
export const init = async model => {
   let touched = false;
   let ry = .7, dragPos = [.2,-.05,-.2], movePos = { left: [0,1,0], right: [0,1,0] };;
   let ilo = -2, ihi = 2;
   let rooms = model.add().move(0,ry,0);
   let dragMarker = model.add();
   for (let i = ilo ; i <= ihi ; i++) {
      let room = rooms.add();
         let table = room.add();
            table.add('cube').move(0,-.11,0).scale(.3,.01,.3).texture("../media/textures/concrete.png");
            table.add('cube').move(0,-.45,0).scale(.05,.345,.05).color(0,0,0);
         let chair = room.add();
            chair.add('cube').move(0,.95,0).scale(1,.05,1);
            chair.add('cube').move(-.95,0,-.95).scale(.05,.95,.05);
            chair.add('cube').move( .95,0,-.95).scale(.05,.95,.05);
            chair.add('cube').move(-.95,0, .95).scale(.05,.95,.05);
            chair.add('cube').move( .95,0, .95).scale(.05,.95,.05);
            chair.add('cube').scale(.99).opacity(.7);
         room.add('tubeY');
   }

   inputEvents.onMove = hand => movePos[hand] = inputEvents.pos(hand);

   inputEvents.onDrag = hand => {
      let p = inputEvents.pos(hand);
      dragPos = [ Math.max(-.25, Math.min(.25, p[0])),
                  Math.max(-.05, p[1] - ry),
                  Math.max(-.25, Math.min(.25, p[2])) ];
   }

   model.animate(() => {
      let dragTargetPos;
      for (let i = ilo ; i <= ihi ; i++) {
         let room = rooms.child(i - ilo);
	 room.identity().scale(Math.pow(8, i));
         room.child(1).identity().move(dragPos).color(i==1&&touched?[1,.5,.5]:[0,.25,.5]).scale(.05);
	 if (i == 1)
	    dragTargetPos = room.child(1).getGlobalMatrix().slice(12,15);
         room.child(2).identity().turnY(model.time/2).move(1,1.5,0).scale(.15);
      }
      let dL = cg.subtract(movePos.left , dragTargetPos);
      let dR = cg.subtract(movePos.right, dragTargetPos);
      let tL = Math.max(Math.abs(dL[0]), Math.abs(dL[1]), Math.abs(dL[2]));
      let tR = Math.max(Math.abs(dR[0]), Math.abs(dR[1]), Math.abs(dR[2]));
      touched = Math.min(tL, tR) < .05 * 8;
   });
}

