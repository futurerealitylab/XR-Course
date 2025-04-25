import * as cg from "../cg.js";
import { NPC } from "./npc.js";

let TAU = Math.PI * 2;

export class RobotMultiLegs extends NPC {
   bodyHeight = 0.15;
   height = 1.5;
   leg1Len = 1.1;
   leg2Len = 1.3;
   rad = 0.9;
   speed = 3; // per second
   legMoveDuration = .3; // leg moving in air duration, in second
   body;
   arrLegs = [];
   arm;

   isMoving = false;
   movVec = [0,0,0];

   constructor(terrainObj, numLegs) {
      super(terrainObj);
      this.numLegs = numLegs;
      this.centerLast = [...this.center];
      this.targetCenter = [...this.center];
      this.averageCenter = [...this.center];
      this.averageTarget = [...this.center];
      this.body = cg.add(this.averageCenter, [0, this.height, 0]);
      this.initLegs();
   //    this.arm = new Arm(this);
   }

   initLegs() {
      this.arrLegs = Array.from({length: this.numLegs}, (_, i) => 
         new Leg(i, this, this.center, [
            this.rad * Math.sin(TAU/this.numLegs*i + TAU/this.numLegs/2), 
            0, 
            this.rad * Math.cos(TAU/this.numLegs*i + TAU/this.numLegs/2)
         ]));
      for (let i = 0; i < this.numLegs; ++i) {
         this.arrLegs[i].nextLeg = this.arrLegs[(i+1)%this.numLegs];
         this.arrLegs[i].prevLeg = this.arrLegs[(i+this.numLegs-1)%this.numLegs];
      }
   }

   update(time, delta, movVec, lookVec, probe) {
      this.movVec = movVec;
      this.isMoving = cg.norm(movVec) > .1;

      this.targetCenter = cg.add(this.center, this.movVec);
      this.updateHeight(this.targetCenter);
      let diff = cg.subtract(this.targetCenter, this.center);
      let deltaMove = cg.scale(diff, this.speed * delta);
      this.center = cg.add(this.center, deltaMove);
      this.updateHeight(this.center);

      this.updateLegs(time, delta);

   //    this.arm.update(probe);

      this.centerLast = [...this.center];
   }

   updateLegs(time, delta) {
      let newAvgCenter = [0,0,0];
      let newAvgTarget = [0,0,0];
      for (const leg of this.arrLegs) {
         let tgt = cg.add(this.center, [
            this.rad * Math.sin(TAU/this.numLegs*leg.index + TAU/this.numLegs/2), 
            0, 
            this.rad * Math.cos(TAU/this.numLegs*leg.index + TAU/this.numLegs/2)
         ])
         leg.update(time, delta, tgt);
         newAvgCenter = cg.add(newAvgCenter, leg.position);
         newAvgTarget = cg.add(newAvgTarget, leg.targetPosition);
      }
      this.averageCenter = cg.scale(newAvgCenter, 1/this.numLegs);
      this.body = cg.add(this.averageCenter, [0, this.height, 0]);
      this.averageTarget = cg.scale(newAvgTarget, 1/this.numLegs);
   }

   blockMoving() {
      this.center = [...this.centerLast];
   }
   
   updateHeight(pos) { pos[1] = this.terrainObj.getHeight(pos[0], pos[2]); }

   resetPosY() {
      this.center[1] = this.terrainObj.getHeight(this.center[0], this.center[2]);
      for (const leg of this.arrLegs) {
         leg.targetPosition[1] = this.terrainObj.getHeight(leg.targetPosition[0], leg.targetPosition[2]);
         leg.position[1] = leg.targetPosition[1];
      }
   }

   m_body = null;
   m_footList = []
   m_legList = [];
   initRender(node) {
      if (!node) {
         console.warn("usage: .initRender(node)");
      }
      this.r_node = node;
      this.m_body = this.r_node.add('tubeY').color(1,1,1);
      clay.defineMesh('_defaultNPCRobotFoot', clay.combineMeshes([
         ["tubeY", cg.mMultiply(cg.mScale(.12,.03,.12), cg.mTranslate(0,1,0)), [.2,.2,.2]],
         ["cube", cg.mMultiply(cg.mScale(.1,.02,.05), cg.mTranslate(1,1,0)), [.2,.2,.2]],
         ["cube", cg.mMultiply(cg.mRotateY(+TAU/3), cg.mMultiply(cg.mScale(.1,.02,.05), cg.mTranslate(1,1,0))), [.2,.2,.2]],
         ["cube", cg.mMultiply(cg.mRotateY(-TAU/3), cg.mMultiply(cg.mScale(.1,.02,.05), cg.mTranslate(1,1,0))), [.2,.2,.2]],
      ]));


      let LEG_SEGMENT_NUM = 8;
      for (let l = 0; l < this.arrLegs.length; ++l) {
         let meshFoot = this.r_node.add('_defaultNPCRobotFoot');
         this.m_footList.push(meshFoot);
         let legName = "_defaultNPCRobot_"+this.id+"_leg"+l;
         let meshLeg = this.r_node.add(clay.wire(LEG_SEGMENT_NUM,8,legName)).color(1,.2,0);
         this.m_legList.push(meshLeg);
      }
   }

   render() {
      if (!this.r_node) return;
      this.m_body.identity().move(cg.add(this.averageCenter, [0, this.height, 0])).scale(.3,this.bodyHeight,.3);

      for (let l = 0; l < this.arrLegs.length; ++l) {
         let leg = this.arrLegs[l];
         let posRoot = cg.add(leg.root, this.body);
         let posFoot = leg.position;
         let posKnee = cg.add(posRoot, cg.ik(this.leg1Len, this.leg2Len, cg.subtract(posFoot, posRoot), [0,1,0]));
         let curve1 = cg.mix(posRoot, posKnee, .5);
         let curve2 = cg.mix(posKnee, posFoot, .5);
         let meshLeg = this.m_legList[l];
         let offsetRoot = cg.mix(posRoot, this.body, .2);
         clay.animateWire(meshLeg, .08, (t) => bezierCurve(offsetRoot, curve1, curve2, posFoot, t));

         /* Render Foot */
         let meshFoot = this.m_footList[l];
         meshFoot.identity().move(posFoot);
      }
   }

   getPos() { return this.center }
   getBodyPos() { return cg.add(this.averageCenter, [0, this.height, 0]) }
   getLegPartsPos(n) {
      if (n < 0 || n >= this.arrLegs.length) {
         console.warn("getLegPartsPos: leg index out of range");
         return null;
      }
      let leg = this.arrLegs[n];
      let posRoot = cg.add(leg.root, this.body);
      let posKnee = cg.add(posRoot, cg.ik(this.leg1Len, this.leg2Len, cg.subtract(leg.position, posRoot), [0,1,0]));
      return { root: posRoot, foot: leg.position, knee: posKnee };
   }
}

class Leg {
   radStartMoving = .5;
   prevLeg = null;
   nextLeg = null;
   audStep = null;
   terrainObj = null;
   constructor(index, parent, body, offset) {
      this.index = index;
      this.parent = parent;
      this.terrainObj = parent.terrainObj;
      this.root = cg.scale(cg.normalize(offset), .3);
      this.targetPosition = cg.add(body, offset);
      this.updateHeight(this.targetPosition);
      this.position = [...this.targetPosition];
      this.posFrom = [...this.targetPosition];
      this.posDest = [...this.targetPosition];
      this.state = 0;       /* -1: cooldown, 0: inBound, 1: outBound, 2: moving */
      this.timeMem = -1;    /* moving: start moving time, cooldown: start cooling time */
      this.onGround = true;
      // this.audStep = new Audio("audio/step.mp3")
      // this.audStep.volume = .2;
   }
   update(time, delta, targetPos) {
      if (this.parent.isMoving) {
         let newH = this.getTerrainHeight(targetPos);
         // console.log(newH - this.targetPosition[1])
         
         this.adjList = [];
         if (this.parent.averageTarget[1] - newH > 1.1) { /* Target Position is too low */
            this.update8AdjList(targetPos);
            
            this.adjList.sort((a,b) => 
               cg.distance(a, cg.add(this.targetPosition,[0,.5,0])) - 
               cg.distance(b, cg.add(this.targetPosition,[0,.5,0])));
            if (this.adjList.length) {
               if (Math.abs(this.adjList[0][1] - this.parent.averageTarget[1]) > 1.5) {
                  this.parent.blockMoving();
               }
               else
                  this.targetPosition = this.adjList[0];
            }
            
         
         } else if (newH - this.parent.averageTarget[1] > 1.8 ) { /* Target Position is too high */
            this.parent.blockMoving();
         } else { /* Target Position is good */
            this.targetPosition = targetPos;
            this.updateHeight(this.targetPosition);
         }
         // console.log(this.parent.targetCenter)
      }
      this.radStartMoving = this.parent.isMoving ? .5: .1;
      if (this.state == 0 && this.isOutBound()) this.state = 1;
      if (this.state == 1 && this.isAdjacentNotMoving()) { /* Start moving animation */
         this.state = 2;
         this.timeMem = time;
         this.posFrom = [...this.position];
         this.posDest = [...this.targetPosition];
      }
      if (this.state == 2) { /* Moving animation going */
         let t = time - this.timeMem;
            let p = t / this.parent.legMoveDuration;
            
            let [x, z] = 
               cg.mix([this.posFrom[0], this.posFrom[2]], [this.posDest[0], this.posDest[2]], p);
            let changeHeight = Math.abs(this.posFrom[1] - this.posDest[1]) > .1;
            let y = cg.mixf(this.posFrom[1], this.posDest[1], p)
               + (changeHeight?1: .2) * Math.sin(p * TAU/2);
            this.position = [x, y, z];
            if (p >= 1) { /* Moving animation end */
               this.state = -1;
               this.timeMem = time;
               this.position = this.posDest;
               
               this.onGround = this.getTerrainHeight(this.position) - this.position[1] >= -1;
               // this.audStep.volume = Math.random()*.1;
               // this.audStep.currentTime = 0;
               // this.audStep.play();
            }
      }
      if (this.state == -1) { /* Leg cooling down */
         if (time - this.timeMem >= this.parent.legMoveDuration/2) { // End cooling down
            this.state = 0;
         }
      }
      
   }
   isOutBound() { return cg.distance(this.position, this.targetPosition) > this.radStartMoving; }
   isAdjacentNotMoving() { return this.prevLeg.state != 2 && this.nextLeg.state != 2; }
   update8AdjList(targetPos) {
      this.adjList = [];
      try {
         let adjPos = [Math.ceil(targetPos[0])+.1, 0, targetPos[2]];
         this.updateHeight(adjPos);
         this.adjList.push(adjPos);
      } catch (error) {}
      try {
         let adjPos = [Math.floor(targetPos[0])-.1, 0, targetPos[2]];
         this.updateHeight(adjPos);
         this.adjList.push(adjPos);
      } catch (error) {}
      try {
         let adjPos = [targetPos[0], 0, Math.ceil(targetPos[2])+.1];
         this.updateHeight(adjPos);
         this.adjList.push(adjPos);
      } catch (error) {}
      try {
         let adjPos = [targetPos[0], 0, Math.floor(targetPos[2])-.1];
         this.updateHeight(adjPos);
         this.adjList.push(adjPos);
      } catch (error) {}
      
      try {
         let adjPos = [Math.ceil(targetPos[0])+.1, 0, Math.ceil(targetPos[2])+.1];
         this.updateHeight(adjPos);
         this.adjList.push(adjPos);
      } catch (error) {}
      try {
         let adjPos = [Math.floor(targetPos[0])-.1, 0, Math.ceil(targetPos[2])+.1];
         this.updateHeight(adjPos);
         this.adjList.push(adjPos);
      } catch (error) {}
      try {
         let adjPos = [Math.ceil(targetPos[0])+.1, 0, Math.floor(targetPos[2])-.1];
         this.updateHeight(adjPos);
         this.adjList.push(adjPos);
      } catch (error) {}
      try {
         let adjPos = [Math.floor(targetPos[0])-.1, 0, Math.floor(targetPos[2])+.1];
         this.updateHeight(adjPos);
         this.adjList.push(adjPos);
      } catch (error) {}
   }
   getTerrainHeight(pos) { return this.terrainObj.getHeight(pos[0], pos[2]); }
   updateHeight(pos) { pos[1] = this.terrainObj.getHeight(pos[0], pos[2]); }
}

function bezierCurve(A, B, C, D, t) {
   let [xA, yA, zA] = A;
   let [xB, yB, zB] = B;
   let [xC, yC, zC] = C;
   let [xD, yD, zD] = D;
   let x =
      xA * (1 - t) ** 3 +
      3 * xB * (1 - t) ** 2 * t +
      3 * xC * (1 - t) * t ** 2 +
      xD * t ** 3;
   let y =
      yA * (1 - t) ** 3 +
      3 * yB * (1 - t) ** 2 * t +
      3 * yC * (1 - t) * t ** 2 +
      yD * t ** 3;
   let z =
      zA * (1 - t) ** 3 +
      3 * zB * (1 - t) ** 2 * t +
      3 * zC * (1 - t) * t ** 2 +
      zD * t ** 3;
   return [x, y, z]
}
