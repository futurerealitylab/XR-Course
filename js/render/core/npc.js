import * as cg from "./cg.js";
import { IKBody } from "./ikbody/ikbody.js";
import { Quaternion } from "./ikbody/quaternion.js";
import { Vector3 } from "./ikbody/vector3.js";

let PI  = Math.PI;
let TAU = Math.PI * 2;
let sin = Math.sin;
let cos = Math.cos;

export class NPCSystem {
   r_model = null; /* Reference to model */
   terrain = null;
   n_terrainChild0 = null;
   terrainVisible = false;
   dictNPC = {};
   NPCMoveVec = {};
   NPCLookVec = {};

   n_root = null;
   n_rootTerrain = null;
   n_rootNPCs = null;

   constructor(model, dimX = 16, dimY=16, dimZ = 16, res=1) {
      this.r_model = model;
      this.terrain = new NPCTerrain(dimX, dimY, dimZ, res);
   }
   initRender(node, meshTerrainName = "_NPCTerrain") {
      this.n_root = node.add();
      this.n_rootTerrain = this.n_root.add();
      this.n_rootNPCs = this.n_root.add();
      this.terrain.generateMesh(meshTerrainName);
      this.n_terrainChild0 = this.n_rootTerrain.add(meshTerrainName);
      this.n_terrainChild0.scale(0);
   }
   getRootNode() { return this.n_root; }
   getNPCsRootNode() { return this.n_rootNPCs; }
   getTerrain() { return this.terrain; }

   /**
    * Make the terrain adapt to the meshes of the nodes in the nodeList.  
    * **Heavily impact the CPU performance!**
    * @param {*} nodeList 
    */
   adaptTerrainToMeshes(nodeList) {
      this.terrain.scanMeshes(nodeList, this.n_root);
      this.terrain.generateMesh();
   }
   setTerrainVisibility(visible) {
      this.terrainVisible = visible;
      if (!this.n_terrainChild0) return;
      if (visible)
         this.n_terrainChild0.identity();
      else 
         this.n_terrainChild0.scale(0);
   }
   legNum = {"triped":3, "quadruped":4, "pentaped":5, "hexapod":6, "heptapod":7, "octopod":8};
   addNPC(type, id = null, render = true) {
      let npc;
      if (type in this.legNum) {
         npc = new RobotMultiLegs(this.terrain, this.legNum[type]);
         this.dictNPC[id ? id : "_"+npc.id] = npc;
         if (render) npc.initRender(this.n_rootNPCs);
         return npc;
      }
      if (type == "humanoid") {
         npc = new Humanoid(this.terrain);
         this.dictNPC[id ? id : "_"+npc.id] = npc;
         if (render) npc.initRender(this.n_rootNPCs);
         return npc;
      }
      console.warn("NPC type not found: "+type);
      return null;
   }
   getNPC(id) {
      if (id in this.dictNPC) return this.dictNPC[id];
      console.warn("NPC not found: "+id);
      return null;
   }
   setNPCMoveVec(id, moveVec) {
      if (id in this.dictNPC) {
         this.NPCMoveVec[id] = moveVec;
      } else {
         console.warn("NPC not found: "+id);
      }
   }
   setNPCLookVec(id, lookVec) {
      if (id in this.dictNPC) {
         this.NPCLookVec[id] = lookVec;
      } else {
         console.warn("NPC not found: "+id);
      }
   }
   update() {
      Object.entries(this.dictNPC).forEach(([id, NPCObj]) => {
         let moveVec = this.NPCMoveVec[id] ? this.NPCMoveVec[id] : [0,0,0];
         let lookVec = this.NPCLookVec[id];
         NPCObj.update(this.r_model.time, this.r_model.deltaTime, moveVec, lookVec);
         NPCObj.render();
      })
   }

}

export class NPCTerrain {
   grid = [[]];
   dimX = 16;
   dimY = 16;
   dimZ = 16;
   res = 1;
   gridX;
   gridZ;
   constructor(dimX = 16, dimY = 16, dimZ = 16, res = 1) {
      this.dimX = dimX;
      this.dimY = dimY;
      this.dimZ = dimZ;
      this.res = res;
      this.gridX = Math.round(dimX * this.res);
      this.gridZ = Math.round(dimZ * this.res);
      this.grid = Array.from(Array(this.gridX), () => 
                  Array.from(Array(this.gridZ), () => 0));
   }
   clear() { 
      for (let x = 0; x < this.gridX; ++x)
      for (let z = 0; z < this.gridZ; ++z)
         this.grid[x][z] = 0; 
   }
   randomize() { 
      let s = Math.random()*100;
      for (let x = 0; x < this.gridX; ++x)
      for (let z = 0; z < this.gridZ; ++z) {
         let y = 2+Math.round(9*
            cg.noise(x/this.res*.07, s, z/this.res*.07));
         this.grid[x][z] = Math.max(0, y);
      }
   }
   scanMeshes(nodeList, nodeRoot) {
      let rootMat = nodeRoot.getGlobalMatrix();
      let rootInvMat = cg.mInverse(rootMat);

      let meshList = nodeList.map(node => clay.formMesh(node._form));
      let objMatList = nodeList.map(node => node.getGlobalMatrix());
      let objInvMatList = objMatList.map(mat => cg.mInverse(mat));
      for (let x = 0; x < this.gridX; ++x)
      for (let z = 0; z < this.gridZ; ++z) {
         let V3 = [(x+.5)/this.res, this.dimY, (z+.5)/this.res];
         let W4 = [0, -1, 0, 0];
         V3 = cg.mTransform(rootMat, V3);
         W4 = cg.mTransform(rootInvMat, W4);
         let tMin = 1000;
         for (let m = 0; m < nodeList.length; ++m) {
            let mV3 = cg.mTransform(objInvMatList[m], V3);
            let mW4 = cg.mTransform(objMatList[m], W4);
            let mW3 = cg.normalize(mW4.slice(0, 3));
            for (let n = 0; n < meshList[m].length; n += 16) {
               let A = [ meshList[m][   n], meshList[m][   n+1], meshList[m][   n+2] ],
                   B = [ meshList[m][16+n], meshList[m][16+n+1], meshList[m][16+n+2] ],
                   C = [ meshList[m][32+n], meshList[m][32+n+1], meshList[m][32+n+2] ];
               let t = cg.rayIntersectTriangle(mV3, mW3, A, B, C);
               if (t > 0 && t < tMin) {
                  tMin = t;
                  let V = cg.add(mV3, cg.scale(mW3, t));
                  V = cg.mTransform(objMatList[m], V);
                  V = cg.mTransform(rootInvMat, V);
                  this.grid[x][z] = Math.max(V[1], 0);
               }
            }
         }
      }
   }
   getHeight(xf, zf) { 
      let x = Math.floor(xf * this.res);
      let z = Math.floor(zf * this.res);
      if (x < 0 || x >= this.gridX || z < 0 || z >= this.gridZ) return 0;
      return this.grid[x][z];
   }

   generateMesh(meshName = "_NPCTerrain") {
      let meshList = [];
      meshList.push(['square', 
         cg.mMultiply(cg.mMultiply(cg.mScale(this.dimX/2,1,this.dimZ/2), cg.mTranslate(1,0,1)),cg.mRotateX(-Math.PI/2)), 
         [0,.5,1]]);
      for (let x = 0; x < this.gridX; ++x)
      for (let z = 0; z < this.gridZ; ++z) {
            let y = this.grid[x][z];
            if (y <= 0) continue;
            let matrix = cg.mMultiply(
               cg.mScale(1/this.res,1,1/this.res),
               cg.mTranslate(x+.5, y/2, z+.5));
            matrix = cg.mMultiply(matrix,
               cg.mScale(.5, Math.max(y/2, .01), .5));
            matrix = cg.mMultiply(matrix,
               cg.mTranslate(0, 1, 0));
            matrix = cg.mMultiply(
               matrix,
               cg.mRotateX(-Math.PI/2)
            );
            let color = cg.scale(cg.mix([0,.5,1], [1,1,1], y/8), 1);
            meshList.push(['square', matrix, color]);
         }
      clay.defineMesh(meshName, clay.combineMeshes(meshList));
      // clay.defineMesh(meshName, clay.createGrid(this.gridX, this.gridZ));
   }
   generateMeshLegacy(meshName = "_NPCTerrain") {
      let meshList = [];
      for (let x = 0; x < this.gridX; ++x)
      for (let z = 0; z < this.gridZ; ++z) {
            let y = this.grid[x][z];
            let matrix = cg.mMultiply(
               cg.mScale(1/this.res,1,1/this.res),
               cg.mTranslate(x+.5, y/2, z+.5));
            matrix = cg.mMultiply(matrix,
               cg.mScale(.5, Math.max(y/2, .01), .5));
            let color = cg.scale(cg.mix([0,.5,1], [1,1,1], y/8), (x+z)%2?.9:1);
            meshList.push(['cube', matrix, color]);
         }
      clay.defineMesh(meshName, clay.combineMeshes(meshList));
   }
}

export class NPC {
   id = 0;
   static nextId = 0;

   terrainObj = null; /* Reference to terrain object */
   center = [0,0,0];  /* Position of the center of the NPC */
   r_node = null;     /* Reference to the render node of the NPC */

   constructor(terrainObj) {
      this.id = NPC.nextId++;
      this.terrainObj = terrainObj;
      this.center = [terrainObj.dimX / 2+.1, 0, terrainObj.dimZ / 2+.1];
   }
   update(time, delta, movVec = [0,0,0], lookVec) {}
   initRender(node) {
      if (!node) console.warn("usage: .initRender(node)");
      this.r_node = node;
   }
   render() {
      if (!this.r_node) return;
   }
}

export class Humanoid extends NPC {
   headHeight = 1.7;
   ikbody = null;
   bodyLinks = [];
   links = [0,5, 1,6, 5,10, 10,16, 6,11, 11,16, 16,15, 15,14, 14,9, 2,7, 7,12, 12,9, 3,8, 8,13, 13,9, 9,4];
   isMoving = false;
   movVec = [0,0,0];
   speed = 0;
   speedEase = 0;
   rotationYRadian = 0;
   lookAtRotationYRadianDiffEase = 0;
   headMaxAngleDegree = 135;
   DURATION_STEP = 1;
   isMovingFootState = 0; /* 0: both stationary, 1: left moving, 2: right moving */
   targetPosFootL     = [0,0,0]; targetPosFootR     = [0,0,0];
   actualPosFootL     = [0,0,0]; actualPosFootR     = [0,0,0];
   animStartTimeFootL = 0;       animStartTimeFootR = 0;
   animStartPosFootL  = [0,0,0]; animStartPosFootR  = [0,0,0];
   animEndPosFootL    = [0,0,0]; animEndPosFootR    = [0,0,0];
   cycle = 0;
   constructor(terrainObj) {
      super(terrainObj);
      this.ikbody = new IKBody();

      this.ikbody.nodeData = this.ikbody.computeNodeData(this.center[0], this.headHeight, this.center[2]);
      this.ikbody.pos      = this.ikbody.computeNodeData(this.center[0], this.headHeight, this.center[2]);

      this.ikbody.initGraph();
      
      this.actualPosFootL = [...this.ikbody.pos[IK.ANKLE_L].toArray()];
      this.actualPosFootR = [...this.ikbody.pos[IK.ANKLE_R].toArray()];
   }

   update(time, delta, movVec, lookVec) {
      this.movVec = movVec;
      this.speed = cg.norm(movVec);
      this.isMoving = this.speed > .1;
      if (this.isMoving) {
         this.rotationYRadian = Math.atan2(movVec[0], movVec[2]) - Math.PI;
         this.ikbody.quaBODY.set(
            0, Math.sin(this.rotationYRadian/2), 
            0, Math.cos(this.rotationYRadian/2)
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

      /* Update Feet Position */
      this.targetPosFootL = cg.add(this.center, [-0.1*cos(-this.rotationYRadian), .05, -0.1*sin(-this.rotationYRadian)]);
      this.targetPosFootR = cg.add(this.center, [+0.1*cos(-this.rotationYRadian), .05, +0.1*sin(-this.rotationYRadian)]);

      let isFootLOOB = cg.distance(this.targetPosFootL, this.actualPosFootL) > .2;  /* Left foot out of bound */
      let isFootROOB = cg.distance(this.targetPosFootR, this.actualPosFootR) > .2;  /* Right foot out of bound */

      if (this.isMovingFootState == 0) {
         if (isFootLOOB) {
            this.isMovingFootState = 1;
            this.animStartTimeFootL = time;
            this.animStartPosFootL = [...this.actualPosFootL];
         } else if (isFootROOB) {
            this.isMovingFootState = 2;
            this.animStartTimeFootR = time;
            this.animStartPosFootR = [...this.actualPosFootR];
         }
      }

      let progress = 0;
      if (this.isMovingFootState == 1) {
         this.animEndPosFootL = [...this.targetPosFootL];
         progress = (time-this.animStartTimeFootL)/.5;
         this.actualPosFootL = cg.mix(this.animStartPosFootL, this.animEndPosFootL, progress);
         this.actualPosFootL[1] += sin(progress*PI)*.2;
         if (progress >= 1) {
            this.isMovingFootState = 0;
         }
      }

      if (this.isMovingFootState == 2) {
         this.animEndPosFootR = [...this.targetPosFootR];
         progress = (time-this.animStartTimeFootR)/.5;
         this.actualPosFootR = cg.mix(this.animStartPosFootR, this.animEndPosFootR, progress);
         this.actualPosFootR[1] += sin(progress*PI)*.2;
         if (progress >= 1) {
            this.isMovingFootState = 0;
         }
      }
      
      this.ikbody.pos[IK.ANKLE_L].set(...this.actualPosFootL);
      this.ikbody.pos[IK.ANKLE_R].set(...this.actualPosFootR);

      
      /* Update Head Position */
      let minYOfTwoFeet = Math.min(this.actualPosFootL[1], this.actualPosFootR[1]);
      this.ikbody.pos[IK.HEAD].x = cg.mixf(this.ikbody.pos[IK.HEAD].x, this.center[0], 5.*delta);
      this.ikbody.pos[IK.HEAD].y = cg.mixf(this.ikbody.pos[IK.HEAD].y, minYOfTwoFeet+this.headHeight, 5.*delta);
      this.ikbody.pos[IK.HEAD].z = cg.mixf(this.ikbody.pos[IK.HEAD].z, this.center[2], 5.*delta);

      /* Update Head Rotation */
      let lookAtRotationYRadian = lookVec && cg.norm(lookVec) > 0 
         ? Math.atan2(lookVec[0], lookVec[2]) - Math.PI 
         : this.rotationYRadian;
      let lookAtRotationYRadianDiff = lookAtRotationYRadian - this.rotationYRadian;
      /* Clamp lookAtRotationYRadianDiff to [-PI, PI] */
      if (lookAtRotationYRadianDiff > +Math.PI) lookAtRotationYRadianDiff -= TAU;
      if (lookAtRotationYRadianDiff < -Math.PI) lookAtRotationYRadianDiff += TAU;
      let neckMaxAngleRad = this.headMaxAngleDegree * PI/180;
      lookAtRotationYRadianDiff = clamp(lookAtRotationYRadianDiff, -neckMaxAngleRad, neckMaxAngleRad);
      lookAtRotationYRadianDiff = Math.min(Math.max(lookAtRotationYRadianDiff, -neckMaxAngleRad), neckMaxAngleRad);
      
      this.lookAtRotationYRadianDiffEase = cg.mixf(this.lookAtRotationYRadianDiffEase, lookAtRotationYRadianDiff, 5.*delta);

      /* Update Hands */
      this.cycle = this.isMovingFootState == 1 ? progress*.5 : this.isMovingFootState == 2 ? progress*.5+.5 : this.cycle;
      let posWL = [-.25, .8-.02*Math.cos(Math.cos(this.cycle*TAU)*TAU/2), -.25*Math.cos(this.cycle*TAU)];
      let posWR = [+.25, .8-.02*Math.cos(Math.cos(this.cycle*TAU)*TAU/2), +.25*Math.cos(this.cycle*TAU)];

      this.speedEase = cg.mixf(this.speedEase, this.speed, 5.*delta);

      posWL = cg.mix([-.25, .80, 0], posWL, this.speedEase);
      posWR = cg.mix([+.25, .80, 0], posWR, this.speedEase);

      /* Rotate hand swing direction to the mix of head & feet */
      let handSwingRotY = cg.mixf(this.lookAtRotationYRadianDiffEase, 0, .5) + this.rotationYRadian;
      let qHandSwing = new Quaternion(0, Math.sin(handSwingRotY/2), 0, Math.cos(handSwingRotY/2));

      let averageCenter = cg.mix(this.actualPosFootL, this.actualPosFootR, .5);
      averageCenter[1] = minYOfTwoFeet;
      let Vec3AverageCenter = new Vector3(...averageCenter);
      this.ikbody.pos[IK.WRIST_L].set(...posWL).applyQuaternion(qHandSwing).add(Vec3AverageCenter);
      this.ikbody.pos[IK.WRIST_R].set(...posWR).applyQuaternion(qHandSwing).add(Vec3AverageCenter);

      /* Update ikbody */
      this.ikbody.update(this.lookAtRotationYRadianDiffEase);
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
            this.m_bodyNodes.push(this.m_human_root.add('sphere').color(1,1,1));
         }
      }
      this.m_bodyNodes[IK.HEAD   ].add('tubeZ').move(0,0,-1.5).scale(.1,.1,1.5).color(1,0,0);
      this.m_bodyNodes[IK.ANKLE_L].add('tubeZ').move(0,0,-1.5).scale(.1,.1,1.5).color(0,0,1);
      this.m_bodyNodes[IK.ANKLE_R].add('tubeZ').move(0,0,-1.5).scale(.1,.1,1.5).color(0,1,0);
      this.m_bodyNodes[IK.WRIST_L].add('tubeZ').move(0,0,-1.5).scale(.1,.1,1.5).color(0,0,1);
      this.m_bodyNodes[IK.WRIST_R].add('tubeZ').move(0,0,-1.5).scale(.1,.1,1.5).color(0,1,0);
      this.m_bodyNodes[IK.HEAD   ].add('coneZ').move(0,0,-3).scale(.4).turnY(Math.PI).color(1,0,0);
      this.m_bodyNodes[IK.ANKLE_L].add('coneZ').move(0,0,-3).scale(.4).turnY(Math.PI).color(0,0,1);
      this.m_bodyNodes[IK.ANKLE_R].add('coneZ').move(0,0,-3).scale(.4).turnY(Math.PI).color(0,1,0);
      this.m_bodyNodes[IK.WRIST_L].add('coneZ').move(0,0,-3).scale(.4).turnY(Math.PI).color(0,0,1);
      this.m_bodyNodes[IK.WRIST_R].add('coneZ').move(0,0,-3).scale(.4).turnY(Math.PI).color(0,1,0);
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
            cg.mMultiply(this.m_bodyNodes[n].getMatrix(), q.toMatrix())).scale(.08);
      }
      for (let n = 5; n < gnodes.length; ++n) {
         let p = gnodes[n].p;
         this.m_bodyNodes[n].identity().move(p.x, p.y, p.z).scale(.04);
      }

      let getP = n => n < 5 ? this.ikbody.pos[n] : gnodes[n].p;
      for (let i = 0; i < this.links.length; i += 2) {
         let A = getP(this.links[i  ]), a = [A.x,A.y,A.z];
         let B = getP(this.links[i+1]), b = [B.x,B.y,B.z];
         this.m_bodyLinks[i/2].identity().move(cg.mix(a,b,.5))
            .aimZ(cg.subtract(b,a)).scale(.03,.03,cg.distance(a,b)/2);
      }
   }

   getBodyNodes() { return this.ikbody.graph.nodes; }

}

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

function clamp(x, min = 0, max = 1) {
   return Math.min(max, Math.max(min, x));
}
