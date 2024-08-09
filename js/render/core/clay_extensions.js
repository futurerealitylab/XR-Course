import * as clayLib from "./clay.js";
const Clay = clayLib.Clay;

function TriangleMeshBuilder() {
  this.offset = 0;
  this.buffer = [];

  this.buildBegin = function() {
     this.offset = 0;
     this.buffer = [];
  }
  this.buildEnd = function() {
     return new Float32Array(this.buffer);
  }

  this.pushVertex = function(p0, p1, p2, n0, n1, n2, r, g, b, vertexSize=clayLib.Clay.DEFAULT_VERTEX_SIZE) {
     clayLib.Clay.vertexArrayComponents(this.buffer, this.offset, p0, p1, p2, n0, n1, n2, r, g, b);
     this.offset += vertexSize;
  };

  this.build = function(cb) {
     this.buildBegin();
     cb(this);
     return this.buildEnd();
  }
}

let setParticleVertex = (mesh, vm, j, p, s, cr,cg,cb, u, v) => {
  const px = p[0] + u * s * vm[0] + v * s * vm[4];
  const py = p[1] + u * s * vm[1] + v * s * vm[5]
  const pz = p[2] + u * s * vm[2] + v * s * vm[6]; 

  Clay.vertexArrayComponents(mesh, 16*j, px, py, pz, vm[8], vm[9], vm[10], .5+u, .5-v, cr,cg,cb);
}

let _retBuff16 = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

let renderParticlesMeshInline = (self, mesh, views) => {
   let P = mesh.particlePosition;
   let S = mesh.particleSize;
   let C = mesh.particleColor;

   let n = mesh.length / (6 * 16);
   let vm = Clay.matrix_inverse_w_buffer16(views[0].viewMatrix, _retBuff16);

   for (let i = 0 ; i < n ; i++) {
      const colOff = i*3;
      const r = C[colOff];
      const g = C[colOff + 1];
      const b = C[colOff + 2];

      let s = S[i];
      const baseOff = 6 * i;
      setParticleVertex(mesh, vm, baseOff    , P[i], s, r,g,b, -.5, -.5);
      setParticleVertex(mesh, vm, baseOff + 1, P[i], s, r,g,b,  .5, -.5);
      setParticleVertex(mesh, vm, baseOff + 2, P[i], s, r,g,b, -.5,  .5);
      setParticleVertex(mesh, vm, baseOff + 3, P[i], s, r,g,b, -.5,  .5);
      setParticleVertex(mesh, vm, baseOff + 4, P[i], s, r,g,b,  .5, -.5);
      setParticleVertex(mesh, vm, baseOff + 5, P[i], s, r,g,b,  .5,  .5);
   }
}

let renderParticlesMeshEX = mesh => {
   let data = mesh.particleData;

   if (! data)
      return;

   let n = mesh.length / (6 * 16);
   let vm = matrix_inverse(this.views[0].viewMatrix);
   let X = vm.slice(0,3);
   let Y = vm.slice(4,7);
   let Z = vm.slice(8,11);

   let setVertex = (j, p, s, c, u, v) => {
      let pos = [ p[0] + u * s * X[0] + v * s * Y[0],
                  p[1] + u * s * X[1] + v * s * Y[1],
                  p[2] + u * s * X[2] + v * s * Y[2] ];
      let V = vertexArray(pos, Z, null, [.5+u, .5+v], c);
      for (let k = 0 ; k < 16 ; k++)
         mesh[16 * j + k] = V[k];
   }

   // (option 1) the parameters are stored as distinct arrays that 
   //can each be swapped-out with a single assignment to the group of particles
   // e.g. switch the color of all particles
   if (data.isStructureOfArrays) {
      data.indices.sort((aIdx,bIdx) => cg.dot(Z,data.p[aIdx]) - cg.dot(Z,data.p[bIdx]));

      for (let i = 0 ; i < n ; i++) {
         const idx = data.indices[i]
         let p = data.p[idx];
         let s = data.s[idx];
         let c = data.c[idx];
         setVertex(6 * i    , p, s, c, -.5, -.5);
         setVertex(6 * i + 1, p, s, c,  .5, -.5);
         setVertex(6 * i + 2, p, s, c, -.5,  .5);
         setVertex(6 * i + 3, p, s, c, -.5,  .5);
         setVertex(6 * i + 4, p, s, c,  .5, -.5);
         setVertex(6 * i + 5, p, s, c,  .5,  .5);
      }
   } 
   // (option 2) each particle keeps its parameters together
   // the sort does not modify the original particles' positions and 
   // instead uses an auxiliary index buffer
   else if (data.useStableIdx) {
      // assume some kind of buffer of indices sorted by the actual data
      data.indices.sort((aIdx,bIdx) => cg.dot(Z,data[aIdx].p) - cg.dot(Z,data[bIdx].p));

      for (let i = 0 ; i < n ; i++) {
         // indirection - TODO see how this impacts speed
         const el = data[data.indices[i]];
         let p = el.p;
         let s = el.s;
         let c = el.c;
         setVertex(6 * i    , p, s, c, -.5, -.5);
         setVertex(6 * i + 1, p, s, c,  .5, -.5);
         setVertex(6 * i + 2, p, s, c, -.5,  .5);
         setVertex(6 * i + 3, p, s, c, -.5,  .5);
         setVertex(6 * i + 4, p, s, c,  .5, -.5);
         setVertex(6 * i + 5, p, s, c,  .5,  .5);
      }
   } 
   // (option 3) each particle keeps its parameters together
   // the sort modifies the original array
   else {
      data.sort((a,b) => cg.dot(Z,a.p) - cg.dot(Z,b.p));

      for (let i = 0 ; i < n ; i++) {
         const el = data[i];
         let p = el.p;
         let s = el.s;
         let c = el.c;
         setVertex(6 * i    , p, s, c, -.5, -.5);
         setVertex(6 * i + 1, p, s, c,  .5, -.5);
         setVertex(6 * i + 2, p, s, c, -.5,  .5);
         setVertex(6 * i + 3, p, s, c, -.5,  .5);
         setVertex(6 * i + 4, p, s, c,  .5, -.5);
         setVertex(6 * i + 5, p, s, c,  .5,  .5);
      }
   }
}

let renderParticlesMeshInlineEX = mesh => {
   let data = mesh.particleData;

   if (! data)
      return;

   let n = mesh.length / (6 * 16);
   let vm = Clay.matrix_inverse_w_buffer16(views[0].viewMatrix, _retBuff16);

   // (option 1) the parameters are stored as distinct arrays that 
   //can each be swapped-out with a single assignment to the group of particles
   // e.g. switch the color of all particles
   if (data.isStructureOfArrays) {
      data.indices.sort((aIdx,bIdx) => cg.dot(Z,data.p[aIdx]) - cg.dot(Z,data.p[bIdx]));

      for (let i = 0 ; i < n ; i++) {
         const idx = data.indices[i]
         let p = data.p[idx];
         let s = data.s[idx];
          // color
         let r = data.c[idx*3];
         let g = data.c[idx*3 + 1];
         let b = data.c[idx*3 + 2];
		   const baseOff = 6 * i;
		   setParticleVertex(mesh, vm, baseOff    , P[i], s, r,g,b, -.5, -.5);
		   setParticleVertex(mesh, vm, baseOff + 1, P[i], s, r,g,b,  .5, -.5);
		   setParticleVertex(mesh, vm, baseOff + 2, P[i], s, r,g,b, -.5,  .5);
		   setParticleVertex(mesh, vm, baseOff + 3, P[i], s, r,g,b, -.5,  .5);
		   setParticleVertex(mesh, vm, baseOff + 4, P[i], s, r,g,b,  .5, -.5);
		   setParticleVertex(mesh, vm, baseOff + 5, P[i], s, r,g,b,  .5,  .5);
      }
   } 
   // (option 2) each particle keeps its parameters together
   // the sort does not modify the original particles' positions and 
   // instead uses an auxiliary index buffer
   else if (data.useStableIdx) {
      data.indices.sort((aIdx,bIdx) => cg.dot(Z,data[aIdx].p) - cg.dot(Z,data[bIdx].p));

      for (let i = 0 ; i < n ; i++) {
         const idx = data.indices[i];
         let p = data[idx].p;
         let s = data[idx].s;
         let c = data[idx].c;
		const baseOff = 6 * i;
		setParticleVertex(mesh, vm, baseOff    , P[i], s, r,g,b, -.5, -.5);
		setParticleVertex(mesh, vm, baseOff + 1, P[i], s, r,g,b,  .5, -.5);
		setParticleVertex(mesh, vm, baseOff + 2, P[i], s, r,g,b, -.5,  .5);
		setParticleVertex(mesh, vm, baseOff + 3, P[i], s, r,g,b, -.5,  .5);
		setParticleVertex(mesh, vm, baseOff + 4, P[i], s, r,g,b,  .5, -.5);
		setParticleVertex(mesh, vm, baseOff + 5, P[i], s, r,g,b,  .5,  .5);
      }
   } 
   // (option 3) each particle keeps its parameters together
   // the sort modifies the original array
   else {
      data.sort((a,b) => cg.dot(Z,a.p) - cg.dot(Z,b.p));

     for (let i = 0 ; i < n ; i++) {
		let p = data[i].p;
		let s = data[i].s;
		let c = data[i].c;
		const baseOff = 6 * i;
		setParticleVertex(mesh, vm, baseOff    , P[i], s, r,g,b, -.5, -.5);
		setParticleVertex(mesh, vm, baseOff + 1, P[i], s, r,g,b,  .5, -.5);
		setParticleVertex(mesh, vm, baseOff + 2, P[i], s, r,g,b, -.5,  .5);
		setParticleVertex(mesh, vm, baseOff + 3, P[i], s, r,g,b, -.5,  .5);
		setParticleVertex(mesh, vm, baseOff + 4, P[i], s, r,g,b,  .5, -.5);
		setParticleVertex(mesh, vm, baseOff + 5, P[i], s, r,g,b,  .5,  .5);
      }
   }
}



export function init(self, gl, canvas) {
	// attach extensions here	

	self.renderParticlesMeshInline = renderParticlesMeshInline
	
	self.TriangleMeshBuilder = TriangleMeshBuilder;
	// create and expose a default triangle builder
	self.defaultTriangleMeshBuilder = new self.TriangleMeshBuilder();
}
