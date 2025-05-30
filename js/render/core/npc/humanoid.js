import * as cg from "../cg.js";
import { NPC } from "./npc.js";
import { IKBody } from "../ikbody/ikbody.js";
import { Quaternion } from "../ikbody/quaternion.js";
import { Vector3 } from "../ikbody/vector3.js";

let PI  = Math.PI;
let TAU = Math.PI * 2;
let sin = Math.sin;
let cos = Math.cos;

export class Humanoid extends NPC {
   headHeight = 1.7;
   restPosFootL = [-0.1, .05, 0];
   restPosFootR = [+0.1, .05, 0];
   ikbody = null;
   bodyLinks = [];
   //    0       1      2       3       4    5      6      7       8       9    10    11     12         13        14    15     16
   // ANKLE_L ANKLE_R WRIST_R WRIST_L HEAD KNEE_L KNEE_R ELBOW_R ELBOW_L CHEST HIP_L HIP_R SHOULDER_R SHOULDER_L BELLY WAIST PELVIS
   links = [0,5, 1,6, 5,10, 10,16, 6,11, 11,16, 16,15, 15,14, 14,9, 2,7, 7,12, 12,9, 3,8, 8,13, 13,9, 9,4];
   isMoving = false;
   movVec = [0,0,0];  // Target moving vector
   lookVec = [0,0,0]; // Target looking-at vector
   progress = 0;      // Animation progress [0-1]
   speed = 0;
   speedEase = 0;
   movRotYRadian = 0; // Moving vector's rotation in Y axis in Radian
   lookAtRotYRadian = 0; // Head rotation in Y axis in Radian
   headMaxAngleDegree = 135;
   DURATION_STEP = 1;
   isMovingFootState = 0; /* 0: both stationary, 1: left moving, 2: right moving */
   targetPosFootL     = [0,0,0]; targetPosFootR     = [0,0,0];
   actualPosFootL     = [0,0,0]; actualPosFootR     = [0,0,0];
   animStartTimeFootL = 0;       animStartTimeFootR = 0;
   animStartPosFootL  = [0,0,0]; animStartPosFootR  = [0,0,0];
   animEndPosFootL    = [0,0,0]; animEndPosFootR    = [0,0,0];
   cycle = 0;
   constructor(terrainObj, position) {
      super(terrainObj, position);
      this.ikbody = new IKBody();

      this.initIKOffset();

      this.ikbody.nodeData = this.ikbody.computeNodeData(this.center[0], this.headHeight, this.center[2]);
      this.ikbody.pos      = this.ikbody.computeNodeData(this.center[0], this.headHeight, this.center[2]);

      this.ikbody.initGraph();
      
      this.actualPosFootL = this.ikbody.pos[IK.ANKLE_L].toArray();
      this.actualPosFootR = this.ikbody.pos[IK.ANKLE_R].toArray();
   }

   initIKOffset() {}

   update(time, delta, movVec, lookVec) {
      this.movVec = movVec;
      this.lookVec = lookVec;
      this.speed = cg.norm(movVec);
      this.isMoving = this.speed > .1;
      if (this.isMoving) {
         let movRotYRadianTarget = Math.atan2(movVec[0], movVec[2]) + PI;
         /* Ease the movRotYRadian to the target */
         let angleDiff = movRotYRadianTarget - this.movRotYRadian;
         if (angleDiff > +PI) angleDiff -= TAU;
         if (angleDiff < -PI) angleDiff += TAU;
         this.movRotYRadian += cg.mixf(0, angleDiff, 5.*delta);
         /* Update body rotation */
         this.ikbody.quaBODY.set(
            0, Math.sin(this.movRotYRadian/2), 
            0, Math.cos(this.movRotYRadian/2)
         );
      }

      /* Check if new center is too high or too low */
      let deltaMove = cg.scale(this.movVec, 1.5 * delta);
      let newCenter = cg.add(this.center, deltaMove);
      let newY = this.terrainObj.getHeight(newCenter[0], newCenter[2]);
      if (Math.abs(this.center[1] - newY) > 0.6) {
         /* Keep stationary when altitude changes too much */
         this.movVec = [0,0,0];
         this.speed = 0;
         this.isMoving = false;
      } else {
         /* Update desired center */
         this.center = [newCenter[0], newY, newCenter[2]];
      }

      /* Update order is strict */
      this.updateFeet(time, delta);
      this.updateHead(time, delta);
      this.updateHands(time, delta);

      /* Update ikbody */
      this.ikbody.update(this.lookAtRotYRadian);
   }

   updateAnimStartPos(LorR) {
      if (LorR == "left") {
         this.animStartPosFootL = [...this.actualPosFootL];
      } else {
         this.animStartPosFootR = [...this.actualPosFootR];
      }
   }

   updateFeet(time, delta) {
      let matMovDir = cg.mRotateY(this.movRotYRadian);
      this.targetPosFootL = cg.add(this.center, cg.mTransform(matMovDir, this.restPosFootL));
      this.targetPosFootR = cg.add(this.center, cg.mTransform(matMovDir, this.restPosFootR));

      let isFootLOOB = cg.distance(this.targetPosFootL, this.actualPosFootL) > .2;  /* Left foot out of bound */
      let isFootROOB = cg.distance(this.targetPosFootR, this.actualPosFootR) > .2;  /* Right foot out of bound */

      if (this.isMovingFootState == 0) {
         if (isFootLOOB) {
            this.isMovingFootState = 1;         /* Set foot moving state */
            this.animStartTimeFootL = time;     /* Set animation start time */
            this.updateAnimStartPos("left");    /* Set animation start position */
         } else if (isFootROOB) {
            this.isMovingFootState = 2;
            this.animStartTimeFootR = time;
            this.updateAnimStartPos("right");
         }
      }

      this.progress = 0;
      if (this.isMovingFootState == 1) {                       /* Left foot moving */
         this.animEndPosFootL = [...this.targetPosFootL];      /* Set animation end position */
         this.progress = (time-this.animStartTimeFootL)/.5;    /* .5 is the animation duration */
         this.actualPosFootL = cg.mix(this.animStartPosFootL, this.animEndPosFootL, this.progress);
         this.actualPosFootL[1] += sin(this.progress*PI)*.2;   /* Elevating during animation */
         if (this.progress >= 1) {                             /* Animation finished */
            this.isMovingFootState = 0;
         }
      }

      if (this.isMovingFootState == 2) {                       /* Right foot moving */
         this.animEndPosFootR = [...this.targetPosFootR];
         this.progress = (time-this.animStartTimeFootR)/.5;
         this.actualPosFootR = cg.mix(this.animStartPosFootR, this.animEndPosFootR, this.progress);
         this.actualPosFootR[1] += sin(this.progress*PI)*.2;
         if (this.progress >= 1) {
            this.isMovingFootState = 0;
         }
      }
      
      this.ikbody.pos[IK.ANKLE_L].set(...this.actualPosFootL);
      this.ikbody.pos[IK.ANKLE_R].set(...this.actualPosFootR);
   }

   updateHead(time, delta) {
      let minYOfTwoFeet = Math.min(this.actualPosFootL[1], this.actualPosFootR[1]);
      this.ikbody.pos[IK.HEAD].x = cg.mixf(this.ikbody.pos[IK.HEAD].x, this.center[0], 5.*delta);
      this.ikbody.pos[IK.HEAD].y = cg.mixf(this.ikbody.pos[IK.HEAD].y, minYOfTwoFeet+this.headHeight, 5.*delta);
      this.ikbody.pos[IK.HEAD].z = cg.mixf(this.ikbody.pos[IK.HEAD].z, this.center[2], 5.*delta);

      /* Update Head Rotation */
      let lookVec = this.lookVec;
      let lookAtRotYRadianTarget = lookVec && cg.norm(lookVec) > 0 
         ? Math.atan2(lookVec[0], lookVec[2]) + PI 
         : this.movRotYRadian;
      let lookAtRotYRadianDiff = lookAtRotYRadianTarget - this.movRotYRadian;
      /* Clamp lookAtRotYRadianDiff to [-PI, PI] */
      if (lookAtRotYRadianDiff > +PI) lookAtRotYRadianDiff -= TAU;
      if (lookAtRotYRadianDiff < -PI) lookAtRotYRadianDiff += TAU;
      let neckMaxAngleRad = this.headMaxAngleDegree * PI/180;
      lookAtRotYRadianDiff = clamp(lookAtRotYRadianDiff, -neckMaxAngleRad, neckMaxAngleRad);
      lookAtRotYRadianDiff = Math.min(Math.max(lookAtRotYRadianDiff, -neckMaxAngleRad), neckMaxAngleRad);
      
      this.lookAtRotYRadian = cg.mixf(this.lookAtRotYRadian, lookAtRotYRadianDiff, 5.*delta);
   }

   updateHands(time, delta) {
      let handY = .8;
      this.cycle = this.isMovingFootState == 1 ? this.progress*.5 : this.isMovingFootState == 2 ? this.progress*.5+.5 : this.cycle;
      let posWL = [-.25, handY-.02*Math.cos(Math.cos(this.cycle*TAU)*TAU/2), -.25*Math.cos(this.cycle*TAU)];
      let posWR = [+.25, handY-.02*Math.cos(Math.cos(this.cycle*TAU)*TAU/2), +.25*Math.cos(this.cycle*TAU)];

      this.speedEase = cg.mixf(this.speedEase, this.speed, 5.*delta);

      posWL = cg.mix([-.25, handY, 0], posWL, this.speedEase);
      posWR = cg.mix([+.25, handY, 0], posWR, this.speedEase);

      /* Rotate hand swing direction to the mix of head & feet */
      let handSwingRotY = cg.mixf(this.lookAtRotYRadian, 0, .5) + this.movRotYRadian;
      let qHandSwing = new Quaternion(0, Math.sin(handSwingRotY/2), 0, Math.cos(handSwingRotY/2));

      let averageCenter = cg.mix(this.actualPosFootL, this.actualPosFootR, .5);
      let minYOfTwoFeet = Math.min(this.actualPosFootL[1], this.actualPosFootR[1]);
      let matMovDir = cg.mRotateY(this.movRotYRadian);
      averageCenter = cg.add(averageCenter, cg.mTransform(matMovDir, [0,0,0]));
      averageCenter[1] = minYOfTwoFeet;
      let Vec3AverageCenter = new Vector3(...averageCenter);
      this.ikbody.pos[IK.WRIST_L].set(...posWL).applyQuaternion(qHandSwing).add(Vec3AverageCenter);
      this.ikbody.pos[IK.WRIST_R].set(...posWR).applyQuaternion(qHandSwing).add(Vec3AverageCenter);
   }
   
   resetPosY() {
      this.center[1] = this.terrainObj.getHeight(this.center[0], this.center[2]);
      this.actualPosFootL[1] = this.terrainObj.getHeight(this.actualPosFootL[0], this.actualPosFootL[2]);
      this.actualPosFootR[1] = this.terrainObj.getHeight(this.actualPosFootR[0], this.actualPosFootR[2]);
   }

   r_node = null;
   m_human_root = null;
   m_bodyNodes = [];
   m_bodyLinks = [];
   initRender(node) {
      if (!node) {
         console.warn("usage: .initRender(node)");
      }
      this.r_node = node;
      this.m_human_root = this.r_node.add();
      for (let i = 0; i < 17; ++i) {
         if (i < 5) {
            this.m_bodyNodes.push(this.m_human_root.add('sphere').color(.8,.8,.8)); 
         } else {
            this.m_bodyNodes.push(this.m_human_root.add('sphere').color(i==9?[0,1,1]:[1,1,1])); // DEBUG: highlight chest node
         }
      }
      this.m_bodyNodes[IK.HEAD   ].add('tubeZ').move(0,0,-1.5).scale(.1,.1,1.5).color(1,0,0);
      this.m_bodyNodes[IK.ANKLE_L].add('tubeZ').move(0,0,-1.5).scale(.1,.1,1.5).color(0,0,1);
      this.m_bodyNodes[IK.ANKLE_R].add('tubeZ').move(0,0,-1.5).scale(.1,.1,1.5).color(0,1,0);
      this.m_bodyNodes[IK.WRIST_L].add('tubeZ').move(0,0,-1.5).scale(.1,.1,1.5).color(0,0,1);
      this.m_bodyNodes[IK.WRIST_R].add('tubeZ').move(0,0,-1.5).scale(.1,.1,1.5).color(0,1,0);
      this.m_bodyNodes[IK.HEAD   ].add('coneZ').move(0,0,-3).scale(.4).turnY(PI).color(1,0,0);
      this.m_bodyNodes[IK.ANKLE_L].add('coneZ').move(0,0,-3).scale(.4).turnY(PI).color(0,0,1);
      this.m_bodyNodes[IK.ANKLE_R].add('coneZ').move(0,0,-3).scale(.4).turnY(PI).color(0,1,0);
      this.m_bodyNodes[IK.WRIST_L].add('coneZ').move(0,0,-3).scale(.4).turnY(PI).color(0,0,1);
      this.m_bodyNodes[IK.WRIST_R].add('coneZ').move(0,0,-3).scale(.4).turnY(PI).color(0,1,0);
      for (let i = 0 ; i < this.links.length ; i += 2) {
         this.m_bodyLinks.push(this.m_human_root.add('tubeZ').color(1,1,1));
      }
   }

   render() {
      if (!this.r_node) return;
      let gnodes = this.ikbody.graph.nodes;
      for (let n = 0; n < 5; ++n) {
         let p = this.ikbody.getP(n);
         let q = this.ikbody.getQ(n);
         this.m_bodyNodes[n].identity().move(p.x, p.y, p.z).setMatrix(
            cg.mMultiply(this.m_bodyNodes[n].getMatrix(), q.toMatrix())).scale(n==4 ? [.11,.14,.11] : .08);
      }
      for (let n = 5; n < gnodes.length; ++n) {
         let p = gnodes[n].p;
         this.m_bodyNodes[n].identity().move(p.x, p.y, p.z).scale(.04);
      }

      let getP = n => n < 5 ? this.ikbody.getP(n) : gnodes[n].p;
      for (let i = 0; i < this.links.length; i += 2) {
         let l0 = this.links[i];
         let l1 = this.links[i+1];
         let A = getP(l0), a = [A.x,A.y,A.z];
         let B = getP(l1), b = [B.x,B.y,B.z];
         if ((l0 == 12 || l0 == 13) && l1 == 9) {
            let C = getP(14), c = [C.x,C.y,C.z];
            b = cg.mix(b, c, .4);
         }
         this.m_bodyLinks[i/2].identity().move(cg.mix(a,b,.5))
            .aimZ(cg.subtract(b,a)).scale(.03,.03,cg.distance(a,b)/2);
      }
   }

   getBodyNodes() { return this.ikbody.graph.nodes; }

}

function clamp(x, min = 0, max = 1) {
   return Math.min(max, Math.max(min, x));
}
