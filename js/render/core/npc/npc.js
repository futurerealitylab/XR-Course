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
