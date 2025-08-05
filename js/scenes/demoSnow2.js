import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';

export const init = async (model) => {
  let setSession = false;

  const threeRenderer = new THREE.WebGLRenderer({
    canvas: window.canvas,
    context: window.gl,
    alpha: true,
    premultipliedAlpha: false,
    depth: true,
    antialias: true
  });

  threeRenderer.autoClear = false;
  threeRenderer.setClearAlpha(0.0);
  threeRenderer.setClearColor(0x000000, 0);

  const camera = new THREE.PerspectiveCamera();
  const camera2D = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
  model.threeCamera = camera;
  model.threeCamera2D = camera2D;

  // ===== SCENE SETUP =====
  const scene = new THREE.Scene();
  scene.background = null;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(-3, 5, 2);
  scene.add(directionalLight);

  const testBox = new THREE.Mesh(
    new THREE.BoxGeometry(0, 0, 0),
    new THREE.MeshStandardMaterial({ color: 0xff0000 })
  );
  scene.add(testBox);

  // ===== LOAD POINT CLOUD =====
  const response = await fetch('./media/point_cloud/static_occupancy_last_vr_filtered.xyz');
  const text = await response.text();
  const data = text.trim().split('\n').map(line => {
    const [x, y, z] = line.trim().split(/\s+/).map(Number);
    // return { s: 1, p: [1 + 0.01 * x, 3.5 + 0.01 * y, 3 + 0.01 * z] };
      return { s: 1, p: [x, y, z] };
  });

  const N = data.length;
  const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  const material = new THREE.MeshStandardMaterial({ color: 0x00ffff });
  const instancedMesh = new THREE.InstancedMesh(geometry, material, N);
  instancedMesh.frustumCulled = false;

  const dummy = new THREE.Object3D();
  for (let i = 0; i < N; i++) {
    dummy.position.set(...data[i].p);
    dummy.scale.setScalar(data[i].s);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);
  }
  instancedMesh.instanceMatrix.needsUpdate = true;
  scene.add(instancedMesh);

  // ===== ANIMATE =====
  model.animate(() => {
    const glLayer = window.session?.renderState.layers?.[0] || null;

    if (!setSession && window.session) {
      setSession = true;
    }


    // Save old GL state
    const oldFBO = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    const oldVAO = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
    const oldProgram = gl.getParameter(gl.CURRENT_PROGRAM);
    const oldActiveTexture = gl.getParameter(gl.ACTIVE_TEXTURE);
    const oldArrayBuffer = gl.getParameter(gl.ARRAY_BUFFER_BINDING);

    // ===== IMMERSIVE MODE =====
    if (setSession && glLayer && window._latestXRFrame && window._latestXRRefSpace) {
      const frame = window._latestXRFrame;
      const refSpace = window._latestXRRefSpace;
      const pose = frame.getViewerPose(refSpace);
      if (!pose) return;

      gl.bindFramebuffer(gl.FRAMEBUFFER, glLayer.framebuffer);
      threeRenderer.clearDepth();

      for (const view of pose.views) {
        const viewport = glLayer.getViewport(view);
        threeRenderer.setViewport(viewport.x, viewport.y, viewport.width, viewport.height);

        // Update camera for this eye
        camera.projectionMatrix.fromArray(view.projectionMatrix);
        const viewMatrix = new THREE.Matrix4().fromArray(view.transform.inverse.matrix);
        const worldMatrix = new THREE.Matrix4().copy(viewMatrix).invert();
        camera.matrix.fromArray(worldMatrix.elements);
        camera.matrix.decompose(camera.position, camera.quaternion, camera.scale);

               // Animate point cloud jitter
        for (let i = 0; i < N; i++) {
          data[i].p[0] += 0.001 * (Math.random() - 0.5);
          data[i].p[1] += 0.001 * (Math.random() - 0.5);
          data[i].p[2] += 0.001 * (Math.random() - 0.5);
          dummy.position.set(...data[i].p);
          dummy.updateMatrix();
          instancedMesh.setMatrixAt(i, dummy.matrix);
        }
        instancedMesh.instanceMatrix.needsUpdate = true;

        // Keep cube in front of camera
        const forward = new THREE.Vector3(0, 0, -1.5);
        forward.applyQuaternion(camera.quaternion);
        testBox.position.copy(camera.position).add(forward);
        // Render this eye
        threeRenderer.render(scene, camera);
      }
    }

    // ===== NON-IMMERSIVE MODE =====
    else {
      const xrBaseLayer = window.session.renderState.baseLayer;
      if (xrBaseLayer) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, xrBaseLayer.framebuffer);
      }
      if (gl.bindVertexArray) gl.bindVertexArray(null);
      gl.useProgram(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      // threeRenderer.state.reset();
      threeRenderer.clearDepth();

      // Camera from Clay
      const viewMatrix = clay.root().viewMatrix(0);
      const view = new THREE.Matrix4().fromArray(viewMatrix);
      const world = new THREE.Matrix4().copy(view).invert();
      model.threeCamera2D.matrix.fromArray(world.elements);
      model.threeCamera2D.matrix.decompose(
        model.threeCamera2D.position,
        model.threeCamera2D.quaternion,
        model.threeCamera2D.scale
      );
         for (let i = 0; i < N; i++) {
          data[i].p[0] += 0.001 * (Math.random() - 0.5);
          data[i].p[1] += 0.001 * (Math.random() - 0.5);
          data[i].p[2] += 0.001 * (Math.random() - 0.5);
          dummy.position.set(...data[i].p);
          dummy.updateMatrix();
          instancedMesh.setMatrixAt(i, dummy.matrix);
        }
        instancedMesh.instanceMatrix.needsUpdate = true;

        // Keep cube in front of camera
        const forward = new THREE.Vector3(0, 0, -1.5);
        forward.applyQuaternion(model.threeCamera2D.quaternion);
        testBox.position.copy(model.threeCamera2D.position).add(forward);

      threeRenderer.render(scene, camera2D);
    }

    // Restore old GL state
    gl.useProgram(oldProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, oldFBO);
    gl.bindBuffer(gl.ARRAY_BUFFER, oldArrayBuffer);
    if (gl.bindVertexArray && oldVAO) gl.bindVertexArray(oldVAO);
    gl.activeTexture(oldActiveTexture);
  });
};
