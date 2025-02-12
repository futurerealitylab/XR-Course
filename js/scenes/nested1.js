import * as cg from "../render/core/cg.js";
export const init = async model => {
   let touched = false;
   let ry = .7, pos = [.2,-.05,-.2], p = [100,0,0];
   let ilo = -2, ihi = 2;
   let rooms = model.add().move(0,ry,0);
   for (let i = ilo ; i <= ihi ; i++) {
      let room = rooms.add();
         let table = room.add();
         model.txtrSrc(1, "../media/textures/concrete.png");
            table.add('cube').move(0,-.11,0).scale(.3,.01,.3).txtr(1);
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
   inputEvents.onDrag = hand => {
      pos = inputEvents.pos(hand);
      pos[1] -= ry;

      pos[0] = Math.max(-.25, Math.min(.25, pos[0]));
      pos[1] = Math.max(-.05, pos[1]);
      pos[2] = Math.max(-.25, Math.min(.25, pos[2]));

      let r = .05 / (7/8);
      touched = Math.abs(Math.max(pos[0],pos[1],pos[2])) < r;
   }
   model.animate(() => {
      for (let i = ilo ; i <= ihi ; i++) {
         let room = rooms.child(i - ilo);
	 room.identity().scale(Math.pow(8, i));
         room.child(1).identity().move(pos).color(touched?[1,.5,.5]:[0,.25,.5]).scale(.05);
	 if (i == 1)
	    p = room.child(1).getGlobalMatrix().slice(12,15);
         room.child(2).identity().turnY(model.time/2).move(1,1.5,0).scale(.15);
      }
   });
}

