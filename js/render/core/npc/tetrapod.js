import * as cg from "../cg.js";
import { IKBody } from "../ikbody/ikbody.js";
import { Quaternion } from "../ikbody/quaternion.js";
import { Vector3 } from "../ikbody/vector3.js";
import { Humanoid } from "./humanoid.js";

let PI  = Math.PI;
let TAU = Math.PI * 2;
let sin = Math.sin;
let cos = Math.cos;

export class Tetrapod extends Humanoid {
   headHeight = .8;
   restPosFootL = [-0.1, .05, 1.2];
   restPosFootR = [+0.1, .05, 1.2];
   restPosHandL = [-0.1, .05, 0.3];
   restPosHandR = [+0.1, .05, 0.3];
   targetPosHandL     = [0,0,0]; targetPosHandR     = [0,0,0];
   actualPosHandL     = [0,0,0]; actualPosHandR     = [0,0,0];
   animStartPosHandL  = [0,0,0]; animStartPosHandR  = [0,0,0];
   animEndPosHandL    = [0,0,0]; animEndPosHandR    = [0,0,0];
   constructor(terrainObj) {
      super(terrainObj);
      this.actualPosHandL = this.ikbody.pos[IK.WRIST_L].toArray();
      this.actualPosHandR = this.ikbody.pos[IK.WRIST_R].toArray();
      this.animStartPosHandL = [...this.actualPosHandL];
      this.animStartPosHandR = [...this.actualPosHandR];
   }
   
   initIKOffset() {
      this.ikbody.offsets[IK.CHEST     ] = [0, -.13, .24];
      this.ikbody.offsets[IK.BELLY     ] = [0, 0, .24];
      this.ikbody.offsets[IK.WAIST     ] = [0, 0, .24];
      this.ikbody.offsets[IK.PELVIS    ] = [0, 0, .24];
   }
   
   updateAnimStartPos(LorR) {
      if (LorR == "left") {
         this.animStartPosFootL = [...this.actualPosFootL];
         this.animStartPosHandL = [...this.actualPosHandL];
      } else {
         this.animStartPosFootR = [...this.actualPosFootR];
         this.animStartPosHandR = [...this.actualPosHandR];
      }
   }

   updateHands(time, delta) {
      let matMovDir = cg.mRotateY(this.movRotYRadian);
      this.targetPosHandL = cg.add(this.center, cg.mTransform(matMovDir, this.restPosHandL));
      this.targetPosHandR = cg.add(this.center, cg.mTransform(matMovDir, this.restPosHandR));

      /* Use the animation state calculated in updateFeet() */

      if (this.isMovingFootState == 2) {                       /* Right foot moving */
         this.animEndPosHandL = [...this.targetPosHandL];      /* Set animation end position */
         this.actualPosHandL = cg.mix(this.animStartPosHandL, this.animEndPosHandL, this.progress);
         this.actualPosHandL[1] += sin(this.progress*PI)*.2;   /* Elevating during animation */
      }

      if (this.isMovingFootState == 1) {                       /* Left foot moving */
         this.animEndPosHandR = [...this.targetPosHandR];
         this.actualPosHandR = cg.mix(this.animStartPosHandR, this.animEndPosHandR, this.progress);
         this.actualPosHandR[1] += sin(this.progress*PI)*.2;
      }
      
      this.ikbody.pos[IK.WRIST_L].set(...this.actualPosHandL);
      this.ikbody.pos[IK.WRIST_R].set(...this.actualPosHandR);
   }
}

function clamp(x, min = 0, max = 1) {
   return Math.min(max, Math.max(min, x));
}
