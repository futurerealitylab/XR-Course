import { buttonState, controllerMatrix, joyStickState } from "../render/core/controllerInput.js";
import * as cg from "../render/core/cg.js";

let TAU = Math.PI * 2;

let worldDim = [16, 16];
let block = Array.from(Array(worldDim[0]), () => 
            Array.from(Array(worldDim[1]), () => 0));

export const init = async model => {
   let lastButtonState = structuredClone(buttonState);
   let transitionStartTime = -100;
   let transitionDuration = 1;
   let getTransProg = () => clamp((model.time - transitionStartTime) / transitionDuration);
   
   let worldRoot = model.add().move(0,.5,0).scale(.1).move(-worldDim[0]/2,0,-worldDim[1]/2).move(0,0,-worldDim[1]/2);
   let terrainRoot = worldRoot.add();
   let npcRoot = worldRoot.add();

   /* Generate Terrain */
   genMeshForWorld();
   terrainRoot.add('terrain');

   let robotObj = new Robot(6);

   /* Generate Robot */
   let robotBody = npcRoot.add('tubeY').color(.3,.3,.3);
   clay.defineMesh('robotFoot', clay.combineMeshes([
      ["tubeY", cg.mMultiply(cg.mScale(.12,.03,.12), cg.mTranslate(0,1,0)), [.3,.3,.3]],
      ["cube", cg.mMultiply(cg.mScale(.1,.02,.05), cg.mTranslate(1,1,0)), [.2,.2,.2]],
      ["cube", cg.mMultiply(cg.mRotateY(+TAU/3), cg.mMultiply(cg.mScale(.1,.02,.05), cg.mTranslate(1,1,0))), [.2,.2,.2]],
      ["cube", cg.mMultiply(cg.mRotateY(-TAU/3), cg.mMultiply(cg.mScale(.1,.02,.05), cg.mTranslate(1,1,0))), [.2,.2,.2]],
   ]));


   let LEG_SEGMENT_NUM = 8;
   let meshFeet = [];
   let meshLegs = [];
   for (let l = 0; l < robotObj.arrLegs.length; ++l) {
      let meshFoot = npcRoot.add('robotFoot');
      meshFeet.push(meshFoot);
      let meshLeg = npcRoot.add(clay.wire(LEG_SEGMENT_NUM,8,l)).color(1,.2,0);
      meshLegs.push(meshLeg);
   }

   
   
   let hudFPS = new fps(model);

   model.animate(() => {
      hudFPS.update();
      let time = model.time;
      let delta = model.deltaTime;

      if (buttonState.right[4].pressed - lastButtonState.right[4].pressed == 1 && getTransProg()>= 1) {
         randomizeWorld();
         genMeshForWorld(terrainRoot);
         robotObj = new Robot(6);
         transitionStartTime = model.time;
      }
      
      robotObj.update(time, delta, 0, null);

      robotBody.identity().move(cg.add(robotObj.averageCenter, [0, robotObj.height, 0])).scale(.3,robotObj.bodyHeight,.3);

      for (let l = 0; l < robotObj.arrLegs.length; ++l) {
         let leg = robotObj.arrLegs[l];
         let posRoot = cg.add(leg.root, robotObj.body);
         let posFoot = leg.position;
         let posKnee = cg.add(posRoot, cg.ik(robotObj.leg1Len, robotObj.leg2Len, cg.subtract(posFoot, posRoot), [0,1,0]));
         let curve1 = cg.mix(posRoot, posKnee, .5);
         let curve2 = cg.mix(posKnee, posFoot, .5);
         let meshLeg = meshLegs[l];
         let offsetRoot = cg.mix(posRoot, robotObj.body, .2);
         clay.animateWire(meshLeg, .08, (t) => bezierCurve(offsetRoot, curve1, curve2, posFoot, t));

         /* Render Foot */
         let meshFoot = meshFeet[l];
         meshFoot.identity().move(posFoot);
      }

      lastButtonState = structuredClone(buttonState);   
   });
}


class Robot {
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
   movDir = 0;
   movVec = [0,0,0];

   constructor(numLegs) {
      this.numLegs = numLegs;
      this.center = [worldDim[0] / 2+.1, 0, worldDim[1] / 2+.1];
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

   update(time, delta, camDirRad, probe) {
      let fb = -joyStickState.left.y;
      let rl = joyStickState.left.x;
      this.isMoving = Math.abs(fb) + Math.abs(rl);
      this.movDir = camDirRad + Math.atan2(rl,fb);
      this.movVec = this.isMoving
         ? [Math.sin(this.movDir),0,-Math.cos(this.movDir)] : [0,0,0];

      this.targetCenter = cg.add(this.center, this.movVec);
      updateHeight(this.targetCenter);
      let diff = cg.subtract(this.targetCenter, this.center);
      let deltaMove = cg.scale(diff, this.speed * delta);
      this.center = cg.add(this.center, deltaMove);
      updateHeight(this.center);

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
}
 
class Leg {
   radStartMoving = .5;
   prevLeg = null;
   nextLeg = null;
   audStep = null;
   constructor(index, parent, body, offset) {
      this.index = index;
      this.parent = parent;
      this.root = cg.scale(cg.normalize(offset), .3);
      this.targetPosition = cg.add(body, offset);
      updateHeight(this.targetPosition);
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
         let newH = getTerrainHeight(targetPos);
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
            updateHeight(this.targetPosition);
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
               
               this.onGround = getTerrainHeight(this.position) - this.position[1] >= -1;
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
   isOutBound() {
      return cg.distance(this.position, this.targetPosition) > this.radStartMoving;
   }
   isAdjacentNotMoving() {
      return this.prevLeg.state != 2 && this.nextLeg.state != 2;
   }
   update8AdjList(targetPos) {
      this.adjList = [];
      try {
         let adjPos = [Math.ceil(targetPos[0])+.1, 0, targetPos[2]];
         updateHeight(adjPos);
         this.adjList.push(adjPos);
      } catch (error) {}
      try {
         let adjPos = [Math.floor(targetPos[0])-.1, 0, targetPos[2]];
         updateHeight(adjPos);
         this.adjList.push(adjPos);
      } catch (error) {}
      try {
         let adjPos = [targetPos[0], 0, Math.ceil(targetPos[2])+.1];
         updateHeight(adjPos);
         this.adjList.push(adjPos);
      } catch (error) {}
      try {
         let adjPos = [targetPos[0], 0, Math.floor(targetPos[2])-.1];
         updateHeight(adjPos);
         this.adjList.push(adjPos);
      } catch (error) {}
      
      try {
         let adjPos = [Math.ceil(targetPos[0])+.1, 0, Math.ceil(targetPos[2])+.1];
         updateHeight(adjPos);
         this.adjList.push(adjPos);
      } catch (error) {}
      try {
         let adjPos = [Math.floor(targetPos[0])-.1, 0, Math.ceil(targetPos[2])+.1];
         updateHeight(adjPos);
         this.adjList.push(adjPos);
      } catch (error) {}
      try {
         let adjPos = [Math.ceil(targetPos[0])+.1, 0, Math.floor(targetPos[2])-.1];
         updateHeight(adjPos);
         this.adjList.push(adjPos);
      } catch (error) {}
      try {
         let adjPos = [Math.floor(targetPos[0])-.1, 0, Math.floor(targetPos[2])+.1];
         updateHeight(adjPos);
         this.adjList.push(adjPos);
      } catch (error) {}
   }
}

function clearGrid(grid) {
   for (let x = 0; x < grid.length; ++x)
   for (let z = 0; z < grid[0].length; ++z)
      grid[x][z] = 0;
}

function randomizeWorld() {
   clearGrid(block);

   let seed = Math.random()*100;
   for (let x = 0; x < worldDim[0]; ++x)
   for (let z = 0; z < worldDim[1]; ++z) {
      let y = Math.round(9*cg.noise(x*.07, seed, z*.07))+2;
      y = Math.max(0, y);

      block[x][z] = y;
   }

}

function genMeshForWorld() {
   let meshList = [];
   for (let x = 0; x < worldDim[0]; ++x)
   for (let z = 0; z < worldDim[1]; ++z) {
         let y = block[x][z];
         let matrix = cg.mTranslate(x+.5, .5*y, z+.5);
         matrix = cg.mMultiply(matrix, cg.mScale(.5,Math.max(.5*y, .01),.5));
         let color = cg.scale(cg.mix([0,.5,1], [1,1,1], y/8), (x+z)%2 ? .9 : 1);
         meshList.push(['cube', matrix, color]);
      }
   clay.defineMesh('terrain', clay.combineMeshes(meshList));
}

function getHeight(xf, zf) {
   let x = Math.floor(xf);
   let z = Math.floor(zf);
   if (x < 0 || x >= block.length || z < 0 || z >= block[0].length) return 0;
   return block[x][z];
}

function getTerrainHeight(vec) { return getHeight(vec[0], vec[2]); }

function updateHeight(vec) { vec[1] = getHeight(vec[0], vec[2]); }

function fps(model) {
   let f = model.add();
   let lastUpdateTime = -1;
   this.updateGap = .25;

   this.update = () => {
      f.hud().move(.5,.5,0).scale(.5,.5,.001).color(1,0,0);
      if (model.time - lastUpdateTime > this.updateGap) {
         f.textBox(((1 / model.deltaTime)>>0)+"");
         lastUpdateTime = model.time;
      }
   }
}

function clamp(x, min = 0, max = 1) {
   return Math.min(max, Math.max(min, x));
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