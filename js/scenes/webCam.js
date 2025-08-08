import { G2 } from "../util/g2.js";

export const init = async model => {
  let passthroughCam = null;

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    devices.forEach(device => {
      console.log(`${device.kind}: ${device.label} (id=${device.deviceId})`);
    });

    // Pick camera2 2 or camera2 3 if available
    passthroughCam = devices.find(d =>
      d.kind === "videoinput" &&
      (d.label.includes("camera2 2") || d.label.includes("camera2 3"))
    );

    if (!passthroughCam) {
      console.warn("⚠️ Passthrough camera not found, using default camera");
    }
  } catch (err) {
    console.error("❌ Could not enumerate devices:", err);
  }

  // Create a hidden video element for webcam stream
  const video = document.createElement('video');
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true; // important for mobile / WebXR
  document.body.appendChild(video); // you can hide with CSS later

  // Ask for webcam access (specific device if found)
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: passthroughCam
        ? { deviceId: { exact: passthroughCam.deviceId } }
        : true
    });
    video.srcObject = stream;
  } catch (err) {
    console.error("Webcam access denied:", err);
    return;
  }

  // Create an offscreen canvas to copy webcam frames into
  const camCanvas = document.createElement('canvas');
  const camCtx = camCanvas.getContext('2d');

  // Cube that will display the webcam texture
  let webCamCube = model.add('cube')
    .move(0, 1.5, 0)
    .scale(.2, .2, .001);

  // Animation loop
  model.animate(() => {
    if (video.readyState >= 2) {
      // Keep canvas size in sync with video
      if (camCanvas.width !== video.videoWidth || camCanvas.height !== video.videoHeight) {
        camCanvas.width = video.videoWidth;
        camCanvas.height = video.videoHeight;
      }

      // Draw webcam frame to canvas
      camCtx.drawImage(video, 0, 0, camCanvas.width, camCanvas.height);

      // Update model texture with the canvas
      model.txtrSrc(1, camCanvas);
      webCamCube.txtr(1);
    }
  });
};
