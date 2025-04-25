import { updateAvatars, avatars } from "../render/core/avatar.js";
import { buttonState, joyStickState } from "../render/core/controllerInput.js";
import * as cg from "../render/core/cg.js";

let TAU = Math.PI * 2;

export const init = async model => {

   let pitch = 0, yaw = 0;

   /* The anchor for a miniature in the front of the view */
   let avatarAnchor = model.add();
   avatarAnchor.add('tubeY').move(0,0,.5).scale(.2,.001,.2);
   updateAvatars(model);
   for (let n in clients){
      avatarAnchor._children.push(avatars[clients[n]].getRoot());
      avatars[clients[n]].showIK(true);
   }


   model.customShader(`
      uniform highp int uAvatarHead, uAvatarEye, uAvatarArm, uAvatarBody;
      --------------------------
      if (uAvatarBody == 1 || uAvatarHead == 1) {
         float t = .5 + noise(400. * vAPos + 5. * vec3(0.,0.,mod(uTime, 100.)));
         float u = dot(eye, normal);
         t = t * t * (3. - t - t);
         opacity = 30. * pow(t, 9.) * u * u;
         color = .02 * opacity * vec3(.0,.4,.9);
      }
      if (uAvatarEye == 1) {
         color = vec3(.2,.5,.9);
      }
   `)

   // model.customShader(`
   //    uniform int uAvatarHead, uAvatarEye, uAvatarArm, uAvatarBody;
   //    --------------------------
   //    if (uAvatarBody == 1 || uAvatarHead == 1) {
   //       apos.xyz += noise(apos.xyz + uTime * .5) * aNor * .25;
   //       pos.xyz = obj2Clip(apos.xyz);
   //    }
   //    **************************
   //    uniform highp int uAvatarHead, uAvatarEye, uAvatarArm, uAvatarBody;
   //    --------------------------
   //    if (uAvatarEye == 1) {
   //       color = vec3(0.02);
   //    }
   //    if (uAvatarBody == 1 || uAvatarHead == 1) {
   //       color = vec3(1.);
   //       opacity = .8;
   //    }
   // `);


   ///////////////////////////////////////////
   /*            Model Animation            */
   ///////////////////////////////////////////

   model.animate(() => {
      pitch += (joyStickState.left.y + joyStickState.right.y) * model.deltaTime * 2;
      pitch = Math.max(-TAU/4, Math.min(TAU/4, pitch));
      yaw   += (joyStickState.left.x + joyStickState.right.x) * model.deltaTime * 2;
      if (buttonState.right[5].pressed || buttonState.left[5].pressed) pitch = yaw = 0;

      /* Update Avatars */
      updateAvatars(model);

      let matrixHead = cg.mMultiply(clay.inverseRootMatrix,
                                    cg.mix(clay.root().inverseViewMatrix(0), 
                                           clay.root().inverseViewMatrix(1), .5));

      avatarAnchor.setMatrix(matrixHead).move(0,0,-1).scale(.5).turnX(pitch).turnY(yaw).move(0,-1,-.5);
   });
}