import { NPCTerrain } from "./npcTerrain.js";
import { Humanoid } from "./humanoid.js";
import { RobotMultiLegs } from "./robotMultiLegs.js";

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
   update() {
      Object.entries(this.dictNPC).forEach(([id, NPCObj]) => {
         let moveVec = this.NPCMoveVec[id] || [0,0,0];
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
