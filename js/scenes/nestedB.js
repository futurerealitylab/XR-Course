import * as cg from "../render/core/cg.js";
import { updateAvatars, avatars } from "../render/core/avatar.js";

window.nestedState = { chair: [.2,-.05,-.2] };

export const init = async model => {

   model.txtrSrc(2, "../media/textures/concrete.png");

   model.customShader(`
      uniform mat4 uWorld;
      uniform int uAvatarStroke;
      uniform int uAvatarHead;
      uniform int uAvatarEye;
      uniform int uAvatarArm;
      --------------------------
      vec3 worldPos = obj2World(aPos);

      if (uAvatarStroke == 1){
         apos.xyz += aNor * .05;
         pos.xyz = obj2Clip(apos.xyz);
      }
       if (uAvatarEye == 1) {
        float blinkFactor = abs(sin(uTime * 5.0));
        float scaleY = mix(1.0, 0.2, blinkFactor);
        worldPos.y *= scaleY;
        //pos.xyz = obj2Clip(worldPos);
      }
      *********************

      uniform mat4 uWorld;
      uniform highp int uAvatarStroke;
      uniform highp int uAvatarHead;
      uniform highp int uAvatarEye;
      uniform highp int uAvatarArm;
      -------------------------------
      vec4 pos = uProj * uView * uWorld * vec4(vPos, 1.);
      float mist = pow(.985, length(pos.xyz));
      color = mix(vec3(.5), color, mist);

      if(uAvatarHead == 1){
         color = vec3(0.,0.,0.);
      }

      if (uAvatarStroke == 1) {
         vec3 lightPosition = vec3(10.,10.,0.);
         vec3 lightColor = vec3(1.,1.,0.);
         vec3 ambientColor = vec3(.7,.2,.0);
         vec3 worldPos = obj2World(vAPos);
         vec3 worldNormal = normalize(world2Obj(vNor));
         vec3 lightDir = normalize(lightPosition - worldPos);
         float diffuse = max(dot(lightDir, worldNormal), 0.0);
         diffuse = floor(diffuse * 8.0) / 8.0;
         vec3 finalColor = ambientColor + diffuse * lightColor;
         finalColor = mix(vec3(0.5), finalColor, mist);
         color = vec3(finalColor);
     }
     if (uAvatarEye == 1) {
         color = vec3(0.,0.,0.);
      }
      if (uAvatarArm == 1) {
         vec3 lightPosition = vec3(10.,10.,0.);
         vec3 lightColor = vec3(1.,1.,0.);
         vec3 ambientColor = vec3(.7,.2,.0);
         vec3 worldPos = obj2World(vAPos);
         vec3 worldNormal = normalize(world2Obj(vNor));
         vec3 lightDir = normalize(lightPosition - worldPos);
         float diffuse = max(dot(lightDir, worldNormal), 0.0);
         diffuse = floor(diffuse * 8.0) / 8.0;
         vec3 finalColor = ambientColor + diffuse * lightColor;
         finalColor = mix(vec3(0.5), finalColor, mist);
         color = vec3(finalColor);
      }
   `);

   let touched = false;
   let tr = .375, cr = .0375, ry = .8; // table radius, chair radius, room Y (table height)
   let movePos = { left: [0,1,0], right: [0,1,0] };
   let ilo = -3, ihi = 4;
   let scalePower = 2.5;
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
         room.add('tubeY');
   }

   inputEvents.onMove = hand => movePos[hand] = inputEvents.pos(hand);

   inputEvents.onDrag = hand => {
      let p = inputEvents.pos(hand);
      nestedState.chair = cg.roundVec(2, [ Math.max(-tr, Math.min(tr, p[0])),
                                           Math.max(-4*cr, p[1] - ry),
                                           Math.max(-tr, Math.min(tr, p[2])) ]);
      server.broadcastGlobal('nestedState');
   }

   let sphere = model.add('sphere').scale(.1);

   let frameCount = 0;
   let time = 0;
   model.animate(() => {
      time+=.02;
      nestedState = server.synchronize('nestedState');
      model.setUniform('Matrix4fv', 'uWorld', false, worldCoords);
      let bigChairPos;
      for (let i = ihi ; i >= ilo ; i--) {
         let room = rooms.child(i - ilo);
         room.identity().scale(Math.pow(scalePower, i));

         let chair = room.child(1);
         let thing = room.child(2);

         chair.identity().move(nestedState.chair).color(i==1&&touched?[1,.5,.5]:[0,.25,.5]).scale(cr);
         if (i == 1) {
            bigChairPos = chair.getGlobalMatrix().slice(12,15);
            bigChairPos[1] += cr * scalePower;
         }

         thing.identity().turnY(model.time/2).move(1,1.5,0).scale(.000015);
      }


      let dL = cg.subtract(movePos.left , bigChairPos);
      let dR = cg.subtract(movePos.right, bigChairPos);
      let tL = Math.max(Math.abs(dL[0]), Math.abs(dL[1]), Math.abs(dL[2]));
      let tR = Math.max(Math.abs(dR[0]), Math.abs(dR[1]), Math.abs(dR[2]));
      touched = Math.min(tL, tR) < cr * scalePower;


      updateAvatars(model);
      if (frameCount++ == 0){
         let count = 0;
         for (let i = ilo ; i <= ihi ; i++)
         if (i != 0) {
            let a = model.add().move(0,ry + .3 * i,0).scale(Math.pow(scalePower, i)).move(0,-ry, 0);
            for (let n in clients){
               //avatars[clients[n]].getRoot().flag('uAvatar');
               a._children.push(avatars[clients[n]].getRoot());
            }
            count++;
         }
      }

      sphere.identity().move(.2, ry + .5, .5).scale(0.1 * Math.pow(scalePower, ilo + (Math.sin(time)*0.5+0.5) * (ihi-ilo)));
  

   });
}

