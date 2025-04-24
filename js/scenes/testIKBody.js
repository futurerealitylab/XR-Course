import { IKBody } from "../render/core/ikbody/ikbody.js";
import { ik_data } from "../render/core/ikbody/ik_data.js";
import { buttonState, controllerMatrix, joyStickState } from "../render/core/controllerInput.js";
import * as cg from "../render/core/cg.js";
import { Quaternion } from "../render/core/ikbody/quaternion.js";

let PI = Math.PI;
let TAU = Math.PI * 2;

export const init = async model => {

   let pitch = 0, yaw = 0;
   
   let movePos = { left: [0,1,0], right: [0,1,0] };

   let table = model.add("square").color(.5,.5,.5).flag("uTreadmill");

   model.customShader(`
      uniform int uTreadmill;
      --------------------------
      if (uTreadmill == 1) {
         vec3 uv = mod(vAPos*.8+vec3(0,.35*uTime,0), 0.5)/0.5;
         color = uv.g < .5 ? vec3(.1) : vec3(.5);
      }
   `)

   let rootIkbody = model.add();
   
//    0       1      2       3       4    5      6      7       8       9    10    11     12         13        14    15     16
// ANKLE_L ANKLE_R WRIST_R WRIST_L HEAD KNEE_L KNEE_R ELBOW_R ELBOW_L CHEST HIP_L HIP_R SHOULDER_R SHOULDER_L BELLY WAIST PELVIS
   let body = [];
   for (let i = 0; i < 17; ++i) {
      if (i < 5) {
         body.push(rootIkbody.add('cube' ).color(1,0,0)); 
      } else {
         body.push(rootIkbody.add('sphere').color(1,1,1));
      }
   }
   body[IK.HEAD   ].add('tubeZ').move(0,0,-2.5).scale(.1,.1,3).color(1,1,1);
   body[IK.ANKLE_L].add('tubeZ').move(0,0,-2.5).scale(.1,.1,3).color(1,1,0);
   body[IK.ANKLE_R].add('tubeZ').move(0,0,-2.5).scale(.1,.1,3).color(0,1,1);
   body[IK.WRIST_L].add('tubeZ').move(0,0,-2.5).scale(.1,.1,3).color(1,1,0);
   body[IK.WRIST_R].add('tubeZ').move(0,0,-2.5).scale(.1,.1,3).color(0,1,1);
   let bodyLinks = [];
   let links = [0,5, 1,6, 5,10, 10,16, 6,11, 11,16, 16,15, 15,14, 14,9, 2,7, 7,12, 12,9, 3,8, 8,13, 13,9, 9,4];
   for (let i = 0 ; i < links.length ; i += 2) {
      bodyLinks.push(rootIkbody.add('tubeZ').color(1,1,1));
   }

   let ikbody = new IKBody(ik_data);

   let movingVector = [0,0,-1];
   
   let bodySprings = [];
   for (let i = 0; i < 26; ++i) {
      bodySprings.push(rootIkbody.add('tubeZ').color(1,0,1));
   }
   
   inputEvents.onMove = hand => movePos[hand] = inputEvents.pos(hand);

   ///////////////////////////////////////////
   /*            Model Animation            */
   ///////////////////////////////////////////

   model.animate(() => {
      pitch += (joyStickState.left.y + joyStickState.right.y) * model.deltaTime * 2;
      pitch = Math.max(-TAU/4, Math.min(TAU/4, pitch));
      yaw   += (joyStickState.left.x + joyStickState.right.x) * model.deltaTime * 2;
      if (buttonState.right[5].pressed || buttonState.left[5].pressed) pitch = yaw = 0;

      
      /* Update IK Body */

      ikbody.pos[IK.HEAD].set(0, 1.7, 0);
      ikbody.pos[IK.WRIST_L].set(-.3, .8, 0);
      ikbody.pos[IK.WRIST_R].set(+.3, .8, 0);
      ikbody.pos[IK.ANKLE_L].set(-.1, .05, 0);
      ikbody.pos[IK.ANKLE_R].set(+.1, .05, 0);

      let DURATION_STEP = 1;
      let cycle = model.time/(DURATION_STEP*2) % 1; /* 0-1 */

      let rotY = 45 / 360 * TAU; rotY = 0;
      let matRot = cg.mRotateY(rotY);
      let posWL = [-.25, .8-.02*Math.cos(Math.cos(cycle*TAU)*TAU/2), -.25*Math.cos(cycle*TAU)];
      posWL = cg.mTransform(matRot, posWL);
      ikbody.pos[IK.WRIST_L].set(...posWL);
      let posWR = [+.25, .8-.02*Math.cos(Math.cos(cycle*TAU)*TAU/2), +.25*Math.cos(cycle*TAU)];
      posWR = cg.mTransform(matRot, posWR);
      ikbody.pos[IK.WRIST_R].set(...posWR);
      if (cycle < .5) { 
         // Move left foot
         let t = cycle*2;
         let posR = [+.1, .05, .7*(t-.5)]; posR = cg.mTransform(matRot, posR);
         ikbody.pos[IK.ANKLE_R].set(...posR); // sync right foot to the ground
         let h = .05+.2*Math.sin(t*TAU/2);
         let posL = [-.1,   h, .7*(.5-t)]; posL = cg.mTransform(matRot, posL);
         ikbody.pos[IK.ANKLE_L].set(...posL);
      } else { 
         // Move right foot
         let t = (cycle-.5)*2;
         let posL = [-.1, .05, .7*(t-.5)]; posL = cg.mTransform(matRot, posL);
         ikbody.pos[IK.ANKLE_L].set(...posL); // sync left foot to the ground
         let h = .05+.2*Math.sin(t*TAU/2);
         let posR = [+.1,   h, .7*(.5-t)]; posR = cg.mTransform(matRot, posR);
         ikbody.pos[IK.ANKLE_R].set(...posR);
      }


      ikbody.update(0);


      /* Render */

      let nodes = ikbody.graph.nodes;

      // console.log(nodes);

      for (let n = 0 ; n < 5 ; n++) {
         let p = ikbody.getP(n, ikbody.frame);
         let q = ikbody.getQ(n, ikbody.frame);
         body[n].identity().move(p.x, p.y, p.z).setMatrix(cg.mMultiply(body[n].getMatrix(), q.toMatrix())).scale(.05);
      }
      for (let n = 5 ; n < nodes.length ; n++) {
         let p = nodes[n].p;
         body[n].identity().move(p.x, p.y, p.z).scale(.02);
      }
      
      let getP = n => n < 5 ? ikbody.getP(n, ikbody.frame) : nodes[n].p;
      for (let i = 0 ; i < links.length ; i += 2) {
         let A = getP(links[i  ]), a = [A.x,A.y,A.z];
         let B = getP(links[i+1]), b = [B.x,B.y,B.z];
         bodyLinks[i/2].identity().move(cg.mix(a,b,.5)).aimZ(cg.subtract(b,a)).scale(.01,.01,cg.distance(a,b)/2).scale(0);
      }

      let springs = ikbody.graph.lengths;
      for (let i = 0; i < springs.length; ++i) {
         let A = getP(springs[i].i), a = [A.x,A.y,A.z];
         let B = getP(springs[i].j), b = [B.x,B.y,B.z];
         let w = springs[i].w;
         bodySprings[i].identity().move(cg.mix(a,b,.5)).aimZ(cg.subtract(b,a)).scale(.005,.005,cg.distance(a,b)/2).color(1,w,w);
      }

      table.identity().move(0,.8,-.7).turnY(0).turnY(yaw).turnX(-TAU/4).scale(.8);
      rootIkbody.identity().move(+0,.8,-.7).scale(.5).turnY(yaw);

   });
}