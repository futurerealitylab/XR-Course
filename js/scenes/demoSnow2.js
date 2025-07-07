import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';

export const init = async model => {
   const N = 5000;
   const data = [];

   for (let n = 0; n < N; n++) {
      data.push({ s: 0.13, p: [6 * Math.random() - 3, 4 * Math.random(), 6 * Math.random() - 3] });
   }

   // 🟢 Create Three.js scene and instanced mesh (no new renderer or canvas!)
   const scene = new THREE.Scene();
   const geometry = new THREE.BoxGeometry(0.02, 0.02, 0.02);
   const material = new THREE.MeshBasicMaterial({ color: 0x00ffff });
   const instancedMesh = new THREE.InstancedMesh(geometry, material, N);
   const dummy = new THREE.Object3D();

   for (let i = 0; i < N; i++) {
      dummy.position.set(...data[i].p);
      dummy.scale.setScalar(data[i].s);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
   }
   instancedMesh.instanceMatrix.needsUpdate = true;
   scene.add(instancedMesh);

   // // Optional: store scene and mesh in model if you want to reuse later
   // model.threeScene = scene;
   // model.threeMesh = instancedMesh;

   // 🟢 Main animation loop – let your system drive it
   model.animate(() => {
      for (let n = 0; n < N; n++) {
         data[n].p[0] += 0.009 * Math.sin(0.5 * n);
         data[n].p[2] += 0.009 * Math.cos(0.5 * n);
         data[n].p[1] -= 0.005 + 0.004 * Math.sin(0.4 * n);
         if (Math.abs(data[n].p[0]) > 3) data[n].p[0] *= -1;
         if (Math.abs(data[n].p[2]) > 3) data[n].p[2] *= -1;
         if (data[n].p[1] < 0) data[n].p[1] = 4;
      }

      for (let i = 0; i < N; i++) {
         dummy.position.set(...data[i].p);
         dummy.updateMatrix();
         instancedMesh.setMatrixAt(i, dummy.matrix);
      }
      instancedMesh.instanceMatrix.needsUpdate = true;

      // 🟢 Let your own renderer draw the scene
      // You must call threeRenderer.render(scene, camera) yourself
      // If your system has a `drawThreeJS` hook, call it there
   });
};
