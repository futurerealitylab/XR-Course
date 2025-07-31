import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';

export const init = async model => {
  const threeRenderer = new THREE.WebGLRenderer({
    canvas: window.canvas,
    context: window.gl,
    alpha: false,
    depth: true,
    preserveDrawingBuffer: true,
  });
  threeRenderer.autoClear = false;
  threeRenderer.setClearColor(0xff00ff, 1);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
  model.threeCamera = camera;

  // Scene + Lights
  const scene = new THREE.Scene();
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(3, 5, 2);
  scene.add(directionalLight);

  // Test cube
  const testBox = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xff0000 })
  );
  testBox.position.set(0, 1.5, 0);
  testBox.scale.set(0, 0, 0);
  scene.add(testBox);

  // Load skeleton.xyz file and parse point cloud
  const response = await fetch('./media/point_cloud/skeleton.xyz'); 
  const text = await response.text();
  
  // Parse each line into { s, p: [x, y, z] }
  const data = text.trim().split('\n').map(line => {
    const [x, y, z] = line.trim().split(/\s+/).map(Number);
    return { s: 1, p: [0.01 * x, 1.5 + 0.01 * y, 0.01 * z] };
  });

  const N = data.length;
  // Instanced mesh
  const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  const material = new THREE.MeshStandardMaterial({ color: 0x00ffff });
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

  // Animate
  model.animate(() => {
    for (let i = 0; i < N; i++) {
      data[i].p[0] += 0.01 * (Math.random() - 0.5)
      data[i].p[1] += 0.01 * (Math.random() - 0.5)
      data[i].p[2] += 0.01 * (Math.random() - 0.5)
      dummy.position.set(...data[i].p);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;

    const viewMatrix = clay.root().viewMatrix(0);
    const view = new THREE.Matrix4().fromArray(viewMatrix);
    const world = new THREE.Matrix4().copy(view).invert();
    model.threeCamera.matrix.fromArray(world.elements);
    model.threeCamera.matrix.decompose(
      model.threeCamera.position,
      model.threeCamera.quaternion,
      model.threeCamera.scale
    );

    // Save GL state
    const oldFBO = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    const oldVAO = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
    const oldProgram = gl.getParameter(gl.CURRENT_PROGRAM);
    const oldActiveTexture = gl.getParameter(gl.ACTIVE_TEXTURE);
    const oldArrayBuffer = gl.getParameter(gl.ARRAY_BUFFER_BINDING);

    if (gl.bindVertexArray) gl.bindVertexArray(null);
    gl.useProgram(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    threeRenderer.state.reset();
    threeRenderer.clearDepth();
    threeRenderer.clear();

    // Render Three.js scene
    threeRenderer.render(scene, model.threeCamera);

    // Restore GL state
    gl.useProgram(oldProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, oldFBO);
    gl.bindBuffer(gl.ARRAY_BUFFER, oldArrayBuffer);
    if (gl.bindVertexArray && oldVAO) gl.bindVertexArray(oldVAO);
    gl.activeTexture(oldActiveTexture);
  });
};
