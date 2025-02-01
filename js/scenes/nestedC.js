import * as cg from "../render/core/cg.js";
import { updateAvatars, avatars } from "../render/core/avatar.js";

window.nestedState = {
  block: [.2,-.05,-.2],
};

export const init = async model => {

   model.txtrSrc(2, "../media/textures/concrete.png");

   model.customShader(`
      uniform mat4 uWorld;
      -------------------------------
      vec4 pos = uProj * uView * uWorld * vec4(vPos, 1.);
      float mist = pow(.985, length(pos.xyz));
      color = mix(vec3(.5), color, mist);
   `);

   //let taper = model.add('taper');

   let touched = false;
   let tr = .375, cr = .022, ry = .8;
   let movePos = { left: [0,1,0], right: [0,1,0] };
   let ilo = -2, ihi = 4;
   let container = model.add('sphere').scale(600,600,-600);
   let rooms = model.add().move(0,ry,0);
   let avatarModels = model.add();
   for (let i = ilo ; i <= ihi ; i++) {
      let room = rooms.add();
         let table = room.add();
            table.add('cube').scale(1.5).move(0,-.11,0).scale(.3,.01,.3).txtr(2); // NEW MULTI-UNIT TEXTURE API
            table.add('cube').scale(1.5).move(0,-.45,0).scale(.05,.345,.05).color(0,0,0);
         let block = room.add().color(0,0,0);
	     for (let i = 0 ; i < 4 ; i++) {
	        let u = i==0||i==1 ? -.95 : .95, v = i==0||i==2 ? -.95 : .95;
	        block.add('cube').move(u,v,0).scale(.05,.05,1);
	        block.add('cube').move(v,0,u).scale(.05,1,.05);
	        block.add('cube').move(0,u,v).scale(1,.05,.05);
	     }
   }

   inputEvents.onMove = hand => movePos[hand] = inputEvents.pos(hand);

   inputEvents.onDrag = hand => {
      let p = inputEvents.pos(hand);
      nestedState.block = cg.roundVec(3, [ Math.max(-tr, Math.min(tr, p[0])),
					   Math.max(-.15+cr, p[1] - ry),
                                           Math.max(-tr, Math.min(tr, p[2])) ]);
      server.broadcastGlobal('nestedState');
   }

   let frameCount = 0;
   model.animate(() => {
      nestedState = server.synchronize('nestedState')

      //taper.identity().move(0,1.5,0).turnY(model.time).scale(.1);

      for (let i = ihi ; i >= ilo ; i--) {
         let room = rooms.child(i - ilo);
	 room.identity().scale(Math.pow(8, i));
	 let block = room.child(1);
         block.identity().move(nestedState.block).scale(cr);
      }

      updateAvatars(avatarModels);
      if (frameCount++ == 0){
         for (let i = ilo ; i <= ihi ; i++)
            if (i != 0) {
               let a = avatarModels.add().move(0,ry,0).scale(Math.pow(8, i)).move(0,-ry, 0);
               for (let n in clients)
                  a._children.push(avatars[clients[n]].getRoot());
            }
      }

   });

}

