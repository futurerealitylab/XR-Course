import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';

export const init = async model => {
   var framecount = 0;
   const threeRenderer = new THREE.WebGLRenderer({
   canvas:  window.canvas,      // reuse your canvas
   context: window.gl,  // reuse your GL context
   alpha: true,
   preserveDrawingBuffer: true,
   });
   console.log("canvas",window.canvas)
   console.log("gl context", window.gl)
   threeRenderer.autoClear = false; // so it doesn't erase your own drawing
   // 👇 Add this line right here
   threeRenderer.setClearColor(0xff00ff, 1);  // bright purple background
   const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
   model.threeCamera = camera;

   const N = 5;
   const data = [];

   for (let n = 0; n < N; n++) {
      data.push({ s: 1, p: [0, 1.5, 0] });
   }

   // 🟢 Create Three.js scene and instanced mesh (no new renderer or canvas!)
   const scene = new THREE.Scene();
   // const geometry = new THREE.BoxGeometry(0.02, 0.02, 0.02);
   // const material = new THREE.MeshBasicMaterial({ color: 0x00ffff });

   const testBox = new THREE.Mesh(
   new THREE.BoxGeometry(1, 1, 1),
   new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: false, })
);

   testBox.position.set(0, 1.5, 0);
   testBox.renderOrder = 999;
testBox.material.depthTest = true;
testBox.material.depthWrite = true;
testBox.material.transparent = false;
testBox.material.blending = THREE.NoBlending;

   scene.add(testBox);
   model.add('cube').move(0, 1, 0).scale(0.5)
   // const instancedMesh = new THREE.InstancedMesh(geometry, material, N);
   // const dummy = new THREE.Object3D();

   // for (let i = 0; i < N; i++) {
   //    dummy.position.set(...data[i].p);
   //    dummy.scale.setScalar(data[i].s);
   //    dummy.updateMatrix();
   //    instancedMesh.setMatrixAt(i, dummy.matrix);
   // }
   // instancedMesh.instanceMatrix.needsUpdate = true;
   // scene.add(instancedMesh);

   // // Optional: store scene and mesh in model if you want to reuse later
   // model.threeScene = scene;
   // model.threeMesh = instancedMesh;

   // 🟢 Main animation loop – let your system drive it
   model.animate(() => {
      framecount ++;
      for (let n = 0; n < N; n++) {
         data[n].p[0] += 0.009 * Math.sin(0.5 * n);
         data[n].p[2] += 0.009 * Math.cos(0.5 * n);
         data[n].p[1] -= 0.005 + 0.004 * Math.sin(0.4 * n);
         if (Math.abs(data[n].p[0]) > 3) data[n].p[0] *= -1;
         if (Math.abs(data[n].p[2]) > 3) data[n].p[2] *= -1;
         if (data[n].p[1] < 0) data[n].p[1] = 4;
      }

      // for (let i = 0; i < N; i++) {
      //    dummy.position.set(...data[i].p);
      //    dummy.updateMatrix();
      //    instancedMesh.setMatrixAt(i, dummy.matrix);
      // }
      // instancedMesh.instanceMatrix.needsUpdate = true;
      // Assuming you already get a 4x4 view matrix each frame from your XR system
      const viewMatrix = clay.root().viewMatrix(0); // Float32Array[16]

      // Convert it to Three.js Matrix4 and invert it (because view = inverse of world)
      const view = new THREE.Matrix4().fromArray(viewMatrix);
      const world = new THREE.Matrix4().copy(view).invert();

      model.threeCamera.matrix.fromArray(world.elements);
      model.threeCamera.matrix.decompose(
         model.threeCamera.position,
         model.threeCamera.quaternion,
         model.threeCamera.scale
      );
      // Save all critical state
const oldFBO = gl.getParameter(gl.FRAMEBUFFER_BINDING);
const oldVAO = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
const oldProgram = gl.getParameter(gl.CURRENT_PROGRAM);
const oldActiveTexture = gl.getParameter(gl.ACTIVE_TEXTURE);
const oldArrayBuffer = gl.getParameter(gl.ARRAY_BUFFER_BINDING);
// const oldElementArrayBuffer = gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING);

// Reset everything
if (gl.bindVertexArray) gl.bindVertexArray(null);
gl.useProgram(null);
gl.bindBuffer(gl.ARRAY_BUFFER, null);
// gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
threeRenderer.state.reset();
threeRenderer.clearDepth();
      // threeRenderer.setClearColor(0xff0000, 1);
threeRenderer.clear(); // clears color + depth (if autoClear is false)

// Draw Three.js
console.log("three scene", scene)
threeRenderer.render(scene, model.threeCamera);

// Restore all state
gl.useProgram(oldProgram);
gl.bindFramebuffer(gl.FRAMEBUFFER, oldFBO);
gl.bindBuffer(gl.ARRAY_BUFFER, oldArrayBuffer);
// gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, oldElementArrayBuffer);
if (gl.bindVertexArray && oldVAO) gl.bindVertexArray(oldVAO);
gl.activeTexture(oldActiveTexture);


   });
};