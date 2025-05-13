import { NPCTerrain } from "./npcTerrain.js";
import { Humanoid } from "./humanoid.js";
import { RobotMultiLegs } from "./robotMultiLegs.js";
import { Tetrapod } from "./tetrapod.js";

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
   adaptTerrainToMeshes(nodeList, genMesh = true) {
      this.terrain.clear();
      this.terrain.scanMeshes(nodeList, this.n_root);
      for (let npc of Object.values(this.dictNPC)) {
         npc?.resetPosY();
      }
      if (genMesh) this.terrain.generateMesh();
   }
   setTerrainVisibility(visible) {
      this.terrainVisible = visible;
      if (!this.n_terrainChild0) return;
      if (visible)
         this.n_terrainChild0.identity().move(0,.01,0);
      else 
         this.n_terrainChild0.scale(0);
   }
   legNum = {"triped":3, "quadruped":4, "pentaped":5, "hexapod":6, "heptapod":7, "octopod":8};
   addNPC(type, id = null, render = true, position = null) {
      let npc;
      if (type in this.legNum) {
         npc = new RobotMultiLegs(this.terrain, this.legNum[type], position);
      } else if (type === "humanoid") {
         npc = new Humanoid(this.terrain, position);
      } else if (type === "tetrapod") {
         npc = new Tetrapod(this.terrain, position);
      } else {
         console.warn("NPC type not found: " + type);
         return null;
      }

      const npcId = id ? id : "_" + npc.id;
      this.dictNPC[npcId] = npc;
      if (render) npc.initRender(this.n_rootNPCs);
      return npc;
   }
   removeNPC(id) {
      if (id in this.dictNPC) {
         delete this.dictNPC[id];
         delete this.NPCMoveVec[id];
         delete this.NPCLookVec[id];
      } else {
         console.warn("NPC not found: "+id);
      }
   }
   getNPC(id) {
      if (id in this.dictNPC) return this.dictNPC[id];
      console.warn("NPC not found: "+id);
      return null;
   }
   update() {
      Object.entries(this.dictNPC).forEach(([id, NPCObj]) => {
         let moveVec = this.NPCMoveVec[id] 
            ? !isNaN(this.NPCMoveVec[id][0])
            ? this.NPCMoveVec[id]
            : [0,0,0] : [0,0,0];
         let lookVec = this.NPCLookVec[id];
         NPCObj.update(this.r_model.time, this.r_model.deltaTime, moveVec, lookVec);
         NPCObj.render();
      })
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
}
