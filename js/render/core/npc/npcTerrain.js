import * as cg from "../cg.js";

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
