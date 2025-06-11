let audioCtx = new AudioContext();
let localStream = null;
let sourceNode = null;
let workletNode = null;

const connectedPeers = {};
const playbackQueues = {};

let avatars = null;

export const init = async model => {
   console.log("[VOIP] Starting VOIP system");

   if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
   }

   console.log("[VOIP] AudioContext sampleRate:", audioCtx.sampleRate);

   try {
      await audioCtx.audioWorklet.addModule('js/util/audio-processor.js');
      console.log("[VOIP] Audio worklet loaded");
   } catch (err) {
      console.error("[VOIP] Failed to load audio worklet:", err);
      return;
   }

   try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("[VOIP] Microphone access granted");
   } catch (err) {
      console.error("[VOIP] Failed to access microphone:", err);
      return;
   }

   sourceNode = audioCtx.createMediaStreamSource(localStream);
   workletNode = new AudioWorkletNode(audioCtx, 'audio-processor');

   // Handle outgoing audio from processor
   workletNode.port.onmessage = event => {
      if (event.data?.type === 'debug') {
         console.log("[VOIP DEBUG]", event.data.message);
         return;
      }

      const pcm = event.data;
      const pcmArray = Array.from(pcm);

      for (let peerID in channel) {
         if (channel[peerID]?.send) {
            channel[peerID].send(pcmArray);
         }
      }
   };

   sourceNode.connect(workletNode);

   // Receive and play
   model.animate(() => {
      for (let id in channel) {
         if (!connectedPeers[id]) {
            connectedPeers[id] = true;
            console.log("[VOIP] Setting up receive handler for:", id);

            let lastPlaybackTime = audioCtx.currentTime;

            channel[id].on = data => {
               if (Array.isArray(data)) {
                  const floatData = new Float32Array(data);

                  const ratio = audioCtx.sampleRate / 16000;
                  const resampledLength = Math.floor(floatData.length * ratio);
                  const resampledBuffer = new Float32Array(resampledLength);

                  for (let i = 0; i < resampledLength; i++) {
                     const srcIndex = i / ratio;
                     const low = Math.floor(srcIndex);
                     const high = Math.min(Math.ceil(srcIndex), floatData.length - 1);
                     const weight = srcIndex - low;
                     resampledBuffer[i] = (1 - weight) * floatData[low] + weight * floatData[high];
                  }

                  const buffer = audioCtx.createBuffer(1, resampledBuffer.length, audioCtx.sampleRate);
                  buffer.copyToChannel(resampledBuffer, 0);

                  const src = audioCtx.createBufferSource();
                  src.buffer = buffer;

                  const gain = audioCtx.createGain();
                  gain.gain.value = 1.0;
                  src.connect(gain).connect(audioCtx.destination);

                  const durationSec = floatData.length / 16000;
                  const now = audioCtx.currentTime;
                  const playTime = Math.max(now, lastPlaybackTime + durationSec);
                  src.start(playTime);
                  lastPlaybackTime = playTime;
               }
            };
         }
      }

      // Avatars rendering
      if (avatars) model.remove(avatars);
      avatars = model.add();

      for (let n = 0; n < clients.length; n++) {
         let id = clients[n];
         if (id !== clientID && clientState.isXR(id)) {
            let avatar = avatars.add();

            avatar.add('ringZ')
               .setMatrix(clientState.head(id))
               .move(0, 0.01, 0)
               .scale(0.1, 0.12, 0.4)
               .opacity(0.7);

            for (let hand of ['left', 'right']) {
               if (clientState.isHand(id)) {
                  for (let i = 0; i < 5; i++) {
                     avatar.add('sphere')
                        .move(clientState.finger(id, hand, i))
                        .scale(0.01)
                        .opacity(0.7);
                  }
               } else {
                  avatar.add('sphere')
                     .move(clientState.finger(id, hand, 1))
                     .color(clientState.button(id, hand, 0) ? [2, 2, 2] : [1, 1, 1])
                     .scale(0.02)
                     .opacity(0.7);
               }
            }
         }
      }
   });
};
