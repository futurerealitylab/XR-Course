import * as cg from "../render/core/cg.js";
import {
   createSoundSource,
   getAudioContextTime,
   playSound,
   resumeAudioContext,
   setGain,
   stopSound,
   updatePosition,
} from "../util/spatial-audio.js";

// MetaMuseum - Virtual Art Gallery

// 4 artworks with real-world dimensions (cm) and plaque info.
// Smaller devotional panels were removed so the remaining works hang more
// evenly in the gallery volume: two per wall with balanced visual weight.
// Order matches the wall slots in `positions` below.
const artworks = [
   // Left wall, front slot
   {
      file: 'media/art/art1.jpg', w: 87.6, h: 113.7,
      artist: 'Paul Gauguin',
      nationality: 'French',
      title: 'Ia Orana Maria (Hail Mary)',
      year: '1891',
      location: 'On view at The Met Fifth Avenue in Gallery 826',
      desc: 'This grand canvas was Gauguin\'s first major work executed in Tahiti. An angel with yellow wings reveals Mary and Jesus—both Tahitian—to two women. Gauguin wrote of the painting: "An angel with yellow wings who points out to two Tahitian women the figures of Mary and Jesus, also Tahitians." The landscape combines observed and imaginary elements.',
   },
   // Right wall, front slot
   {
      file: 'media/art/art2.jpg', w: 90, h: 150,
      artist: 'Unidentified artist',
      nationality: '',
      title: 'Portrait of Yun Dongseom (1710–1795)',
      year: 'ca. 1790–1805',
      location: 'Not on view',
      desc: 'The identification of the sitter as Yun Dongseom, a celebrated scholar, calligrapher, and civil-official, can be confirmed by two other extant portraits in Korean collections. Here, the elderly statesman, dressed in formal attire, is shown in three-quarter view seated in a high-back chair draped with a leopard skin. A heightened sense of realism guides the rendering of the figure. The detailed treatment of Yun\'s face, through crisp, fluid lines and subtle shading, captures both his physical characteristics and strong personality. A quintessential example of traditional Korean ancestral portraiture, this painting would have functioned as the centerpiece of a family shrine.',
   },
   // Left wall, rear slot
   {
      file: 'media/art/art5.jpg', w: 94, h: 72.4,
      artist: 'Paul Gauguin',
      nationality: 'French',
      title: 'Two Women',
      year: '1901 or 1902',
      location: 'On view at The Met Fifth Avenue in Gallery 822',
      desc: 'Gauguin based this formidable composition on a photograph of two women seated side by side on the stoop of a house. He painted it just before or after his 1901 departure from Tahiti for the Marquesas Islands.',
   },
   // Right wall, rear slot
   {
      file: 'media/art/art6.jpg', w: 93.4, h: 73,
      artist: 'Vincent van Gogh',
      nationality: 'Dutch',
      title: 'Wheat Field with Cypresses',
      year: '1889',
      location: 'On view at The Met Fifth Avenue in Gallery 822',
      desc: 'Cypresses gained ground in Van Gogh\'s work by late June 1889 when he resolved to devote one of his first series in Saint-Rémy to the towering trees. Van Gogh regarded the present work as one of his "best" summer landscapes and was prompted that September to make two studio renditions: one on the same scale (National Gallery, London) and the other a smaller replica, intended as a gift for his mother and sister.',
   },
];

// Scale: real cm → scene units
const scaleFactor = 0.005;

// [x, y, z, rotationY]
// Two works per wall keeps the gallery visually balanced now that we only
// show the four larger pieces.
const positions = [
   [-4.95, 1.5, -2.15,  Math.PI / 2],
   [ 4.95, 1.5,  2.15, -Math.PI / 2],
   [-4.95, 1.5,  2.15,  Math.PI / 2],
   [ 4.95, 1.5, -2.15, -Math.PI / 2],
];

// Denoised pilot recordings. Each participant has eight synced mic files.
// Route order follows the D-shaped walk from the entrance:
// left-near -> left-far -> right-far -> right-near.
// Odd-numbered files are lower/floor microphones for footsteps; even-numbered
// files are upper/head-height microphones.
const traceParticipants = [
   { label: "HR", folder: "hr-denoise-balanced", prefix: "hr", gainScale: 0.72 },
   { label: "KE", folder: "ke-denoise-balanced", prefix: "ke", gainScale: 0.72 },
   { label: "SE", folder: "se-denoise-balanced", prefix: "se", gainScale: 0.72 },
];

const tracePlacements = [
   {
      fileNumber: 1,
      artworkIndex: 2,
      mic: "lower",
      fileSuffix: "lower-footsteps",
      anchorHeight: 0.08,
      maxGain: 1.0,
   },
   {
      fileNumber: 2,
      artworkIndex: 2,
      mic: "upper",
      fileSuffix: "upper",
      anchorHeight: 1.55,
      maxGain: 0.85,
   },
   {
      fileNumber: 3,
      artworkIndex: 0,
      mic: "lower",
      fileSuffix: "lower-footsteps",
      anchorHeight: 0.08,
      maxGain: 1.0,
   },
   {
      fileNumber: 4,
      artworkIndex: 0,
      mic: "upper",
      fileSuffix: "upper",
      anchorHeight: 1.55,
      maxGain: 0.85,
   },
   {
      fileNumber: 5,
      artworkIndex: 3,
      mic: "lower",
      fileSuffix: "lower-footsteps",
      anchorHeight: 0.08,
      maxGain: 1.0,
   },
   {
      fileNumber: 6,
      artworkIndex: 3,
      mic: "upper",
      fileSuffix: "upper",
      anchorHeight: 1.55,
      maxGain: 0.85,
   },
   {
      fileNumber: 7,
      artworkIndex: 1,
      mic: "lower",
      fileSuffix: "lower-footsteps",
      anchorHeight: 0.08,
      maxGain: 1.0,
   },
   {
      fileNumber: 8,
      artworkIndex: 1,
      mic: "upper",
      fileSuffix: "upper",
      anchorHeight: 1.55,
      maxGain: 0.85,
   },
];

let traceAudioIndex = 0;
const recordedTraceSources = [];
for (const participant of traceParticipants) {
   for (const placement of tracePlacements) {
      const paddedNumber = placement.fileNumber < 10
         ? `0${placement.fileNumber}`
         : `${placement.fileNumber}`;
      recordedTraceSources.push({
         artworkIndex: placement.artworkIndex,
         audioIndex: traceAudioIndex++,
         file: `media/sound/gallery/${participant.folder}/${participant.prefix}-${paddedNumber}-${placement.fileSuffix}.mp3`,
         participant: participant.label,
         mic: placement.mic,
         anchorDistanceFromWall: 0.8,
         anchorHeight: placement.anchorHeight,
         maxGain: placement.maxGain * participant.gainScale,
      });
   }
}

const tracePlayback = {
   fullGainRadius: 1.2,
   silenceRadius: 4.5,
   smoothing: 0.14,
   syncLeadTime: 0.05,
   galleryBounds: {
      minX: -4.7,
      maxX: 4.7,
      minZ: -4.7,
      maxZ: 4.7,
   },
};

const traceBubbleDebug = {
   hiddenOpacity: 0.001,
   sourceMarkerRadius: 0.14,
   sourceMarkerOpacity: 1.0,
   fullRingOpacity: 0.95,
   silenceRingOpacity: 0.75,
   projectionRingOpacity: 0.9,
   stemOpacity: 0.85,
   lowerColor: [0.10, 0.45, 1.00],
   upperColor: [1.00, 0.50, 0.00],
};

// Word-wrap text to fit canvas width
function wrapText(ctx, text, maxWidth) {
   let words = text.split(' ');
   let lines = [];
   let line = '';
   for (let word of words) {
      let test = line + (line ? ' ' : '') + word;
      if (ctx.measureText(test).width > maxWidth && line) {
         lines.push(line);
         line = word;
      } else {
         line = test;
      }
   }
   if (line) lines.push(line);
   return lines;
}

// Create museum-style plaque canvas, cropped to content height
function createPlaque(artwork) {
   const W = 512;
   const maxH = 1024;
   // First pass: measure content height
   const measureCanvas = document.createElement('canvas');
   measureCanvas.width = W;
   measureCanvas.height = maxH;
   const mctx = measureCanvas.getContext('2d');
   const pad = 32;
   const textW = W - pad * 2;

   let y = 52;

   mctx.font = 'bold 32px Arial, Helvetica, sans-serif';
   let artistLine = artwork.artist;
   if (artwork.nationality) artistLine += '  ' + artwork.nationality;
   let artistLines = wrapText(mctx, artistLine, textW);
   y += artistLines.length * 38 + 6;

   mctx.font = 'bold italic 28px Arial, Helvetica, sans-serif';
   let titleLine = artwork.title + ', ' + artwork.year;
   let titleLines = wrapText(mctx, titleLine, textW);
   y += titleLines.length * 34 + 8;

   if (artwork.location) {
      mctx.font = '20px Arial, Helvetica, sans-serif';
      let locLines = wrapText(mctx, artwork.location, textW);
      y += locLines.length * 26 + 12;
   }

   mctx.font = '20px Arial, Helvetica, sans-serif';
   let descLines = wrapText(mctx, artwork.desc, textW);
   y += descLines.length * 26;

   // Final height with bottom padding
   const H = Math.min(y + pad, maxH);

   // Second pass: draw on correctly-sized canvas
   const canvas = document.createElement('canvas');
   canvas.width = W;
   canvas.height = H;
   const ctx = canvas.getContext('2d');

   ctx.fillStyle = '#f2f2f2';
   ctx.fillRect(0, 0, W, H);

   y = 52;

   // Artist name — bold
   ctx.fillStyle = '#111';
   ctx.font = 'bold 32px Arial, Helvetica, sans-serif';
   for (let line of artistLines) {
      ctx.fillText(line, pad, y);
      y += 38;
   }
   y += 6;

   // Title (bold italic) + year
   ctx.font = 'bold italic 28px Arial, Helvetica, sans-serif';
   ctx.fillStyle = '#111';
   for (let line of titleLines) {
      ctx.fillText(line, pad, y);
      y += 34;
   }
   y += 8;

   // Location
   if (artwork.location) {
      ctx.font = '20px Arial, Helvetica, sans-serif';
      ctx.fillStyle = '#555';
      let locLines = wrapText(ctx, artwork.location, textW);
      for (let line of locLines) {
         ctx.fillText(line, pad, y);
         y += 26;
      }
      y += 12;
   }

   // Description
   ctx.font = '20px Arial, Helvetica, sans-serif';
   ctx.fillStyle = '#333';
   for (let line of descLines) {
      if (y > H - 20) break;
      ctx.fillText(line, pad, y);
      y += 26;
   }

   canvas._animate = false;
   return { canvas, aspectRatio: H / W };
}

// Background ambient audio
let ambientAudio = null;
let ambientResumeHandler = null;
let unlockSpatialAudioHandler = null;
let traceBubbleToggleHandler = null;
let traceSources = [];
let tracePlaybackStarted = false;
let traceBubbleDebugEnabled = false;
let traceBubbleDebugNodes = [];

function clamp01(value) {
   return Math.max(0, Math.min(1, value));
}

function getTraceBubbleDebugUrlFlag() {
   const params = new URLSearchParams(window.location.search);
   const hashParams = new URLSearchParams(window.location.hash.replace(/^#\??/, ''));
   const value = params.get('tracebubbles') ||
      params.get('showtracebubbles') ||
      hashParams.get('tracebubbles') ||
      hashParams.get('showtracebubbles');

   return value === '1' || value === 'true' || value === 'yes';
}

function rememberTraceBubbleNode(node, visibleOpacity) {
   traceBubbleDebugNodes.push({ node, visibleOpacity });
   node.opacity(traceBubbleDebugEnabled
      ? visibleOpacity
      : traceBubbleDebug.hiddenOpacity);
}

function setTraceBubbleDebugVisible(isVisible) {
   traceBubbleDebugEnabled = isVisible;
   for (const item of traceBubbleDebugNodes) {
      item.node.opacity(isVisible
         ? item.visibleOpacity
         : traceBubbleDebug.hiddenOpacity);
   }
}

function addTraceBubbleRings(model, position, radius, color, opacity) {
   for (const form of ['ringY', 'ringX', 'ringZ']) {
      const ring = model.add(form)
         .color(color)
         .move(position[0], position[1], position[2])
         .scale(radius, radius, radius);
      rememberTraceBubbleNode(ring, opacity);
   }
}

function addTraceBubbleFloorRing(model, position, radius, color, opacity) {
   const ring = model.add('ringY')
      .color(color)
      .move(position[0], 0.045, position[2])
      .scale(radius, 0.045, radius);
   rememberTraceBubbleNode(ring, opacity);
}

function createTraceBubbleDebugVisuals(model) {
   if (traceBubbleDebugNodes.length > 0) {
      return;
   }

   for (const placement of tracePlacements) {
      const [x, , z] = positions[placement.artworkIndex];
      const wallDir = x < 0 ? -1 : 1;
      const position = [
         x - wallDir * 0.8,
         placement.anchorHeight,
         z,
      ];
      const color = placement.mic === 'lower'
         ? traceBubbleDebug.lowerColor
         : traceBubbleDebug.upperColor;

      addTraceBubbleFloorRing(
         model,
         position,
         tracePlayback.silenceRadius,
         color,
         traceBubbleDebug.projectionRingOpacity
      );
      addTraceBubbleFloorRing(
         model,
         position,
         tracePlayback.fullGainRadius,
         color,
         traceBubbleDebug.projectionRingOpacity
      );

      addTraceBubbleRings(
         model,
         position,
         tracePlayback.silenceRadius,
         color,
         traceBubbleDebug.silenceRingOpacity
      );
      addTraceBubbleRings(
         model,
         position,
         tracePlayback.fullGainRadius,
         color,
         traceBubbleDebug.fullRingOpacity
      );

      const marker = model.add('sphere12')
         .color(color)
         .move(position[0], position[1], position[2])
         .scale(
            traceBubbleDebug.sourceMarkerRadius,
            traceBubbleDebug.sourceMarkerRadius,
            traceBubbleDebug.sourceMarkerRadius
         );
      rememberTraceBubbleNode(marker, traceBubbleDebug.sourceMarkerOpacity);

      const stem = model.add('tubeY')
         .color(color)
         .move(position[0], Math.max(placement.anchorHeight, 0.18) / 2, position[2])
         .scale(0.035, Math.max(placement.anchorHeight, 0.18) / 2, 0.035);
      rememberTraceBubbleNode(stem, traceBubbleDebug.stemOpacity);
   }

   const legend = model.add()
      .move(0, 1.35, 4.15)
      .turnY(Math.PI)
      .scale(0.28, 0.28, 0.28)
      .textBox(
         `Trace bubble debug\n` +
         `inner rings: full gain ${tracePlayback.fullGainRadius}m\n` +
         `outer rings: silent at ${tracePlayback.silenceRadius}m\n` +
         `blue: lower/footsteps\n` +
         `orange: upper mic\n` +
         `press B to toggle`,
         0.08
      );
   rememberTraceBubbleNode(legend, 0.9);
}

async function tryStartTracePlayback() {
   if (tracePlaybackStarted || traceSources.length == 0) {
      return;
   }

   if (!traceSources.every(traceSource => traceSource.ready)) {
      return;
   }

   try {
      await resumeAudioContext();
   } catch (error) {
      return;
   }

   const syncStartTime = getAudioContextTime() + tracePlayback.syncLeadTime;
   for (const traceSource of traceSources) {
      playSound(traceSource.audioIndex, syncStartTime);
   }
   tracePlaybackStarted = true;
}

export async function initGalleryScene(model, options = {}) {
   const enableAuditoryTraces = options.enableAuditoryTraces !== false;

   // Collapse the menu so scene buttons are hidden
   let details = document.getElementById('header-details');
   if (details) details.removeAttribute('open');

   // Start ambient background sound
   ambientAudio = new Audio('media/sound/gallery/ambient.mp3');
   ambientAudio.loop = true;
   ambientAudio.volume = 0.18;
   ambientAudio.play().catch(() => {
      ambientResumeHandler = () => {
         ambientAudio.play();
         document.removeEventListener('click', ambientResumeHandler);
         ambientResumeHandler = null;
      };
      document.addEventListener('click', ambientResumeHandler);
   });

   traceSources = [];
   tracePlaybackStarted = false;
   traceBubbleDebugNodes = [];
   traceBubbleDebugEnabled = enableAuditoryTraces &&
      (options.showTraceBubbles === true || getTraceBubbleDebugUrlFlag());

   if (unlockSpatialAudioHandler) {
      document.removeEventListener('click', unlockSpatialAudioHandler);
      document.removeEventListener('keydown', unlockSpatialAudioHandler);
      unlockSpatialAudioHandler = null;
   }

   if (traceBubbleToggleHandler) {
      document.removeEventListener('keydown', traceBubbleToggleHandler);
      traceBubbleToggleHandler = null;
   }

   if (enableAuditoryTraces) {
      unlockSpatialAudioHandler = () => {
         tryStartTracePlayback();
      };
      document.addEventListener('click', unlockSpatialAudioHandler);
      document.addEventListener('keydown', unlockSpatialAudioHandler);

      traceBubbleToggleHandler = event => {
         if (
            event.key &&
            event.key.toLowerCase() === 'b' &&
            !event.metaKey &&
            !event.ctrlKey &&
            !event.altKey
         ) {
            if (traceBubbleDebugNodes.length == 0) {
               createTraceBubbleDebugVisuals(model);
            }
            setTraceBubbleDebugVisible(!traceBubbleDebugEnabled);
            console.log(
               `Trace bubble debug ${traceBubbleDebugEnabled ? 'on' : 'off'}`
            );
         }
      };
      document.addEventListener('keydown', traceBubbleToggleHandler);
   }

   // === Start position — ring on floor near door (z=+4.0) ===
   // Outer circle (light sky blue)
   model.add('sphere')
        .color(0.55, 0.8, 0.95) // light sky blue
        .move(0, 0.008, 4.0)
        .turnX(Math.PI / 2)
        .scale(0.5, 0.5, 0.003);
   // Inner circle (floor-colored) to make it a ring
   model.add('sphere')
        .color(0.75, 0.58, 0.42) // match wood floor color
        .move(0, 0.009, 4.0)
        .turnX(Math.PI / 2)
        .scale(0.38, 0.38, 0.003);

   if (enableAuditoryTraces) {
      // Synchronized auditory traces: every mic recording starts on one shared
      // timeline so the participant hears the captured route in temporal sync.
      for (const traceSpec of recordedTraceSources) {
         const [x, , z] = positions[traceSpec.artworkIndex];
         const wallDir = x < 0 ? -1 : 1;
         const tracePos = [
            x - wallDir * traceSpec.anchorDistanceFromWall,
            traceSpec.anchorHeight,
            z,
         ];

         const traceSource = {
            ...traceSpec,
            anchor: model.add().move(tracePos[0], tracePos[1], tracePos[2]),
            ready: false,
            currentGain: 0,
         };
         traceSources.push(traceSource);

         createSoundSource(
            traceSpec.audioIndex,
            traceSpec.file,
            tracePos,
            false,
            0
         ).then(() => {
            traceSource.ready = true;
            updatePosition(traceSpec.audioIndex, tracePos);
            setGain(traceSpec.audioIndex, 0);
            tryStartTracePlayback();
         }).catch(error => {
            console.error("Failed to initialize recorded trace:", error);
         });
      }

      if (traceBubbleDebugEnabled) {
         createTraceBubbleDebugVisuals(model);
      }
   }

   // === Artworks ===
   for (let i = 0; i < artworks.length; i++) {
      let [x, y, z, rotY] = positions[i];
      let w = artworks[i].w * scaleFactor;
      let h = artworks[i].h * scaleFactor;

      // Wall direction: left wall faces +X (wallDir=-1), right wall faces -X (wallDir=1)
      let wallDir = (x < 0) ? -1 : 1;

      // 3D frame using cube (primitive goes -1 to 1, so scale = half-size)
      let frameBorder = 0.025;
      let frameHalf = 0.015; // half-depth = 1.5cm, total 3cm thick
      // Frame center at wall position — back half sinks into wall, front half sticks out
      model.add('cube')
           .color(0.15, 0.12, 0.1) // dark wood frame
           .move(x, y, z)
           .turnY(rotY)
           .scale(w + frameBorder, h + frameBorder, frameHalf);

      // Artwork surface — just in front of cube's front face
      let artX = x - wallDir * (frameHalf + 0.003);
      let artChannel = i + 5;
      model.add('square')
           .setTxtr(artworks[i].file, artChannel)
           .move(artX, y, z)
           .turnY(rotY)
           .scale(w, h, 1);

      // Plaque — 3D cube backing + text surface
      let plaqueChannels = [11, 12, 13, 14];
      let { canvas: plaqueCanvas, aspectRatio } = createPlaque(artworks[i]);
      let plaqueW = 0.15;
      let plaqueH = plaqueW * aspectRatio;
      let plaqueHalf = 0.006; // half-depth = 0.6cm, total 1.2cm

      let gap = 0.05;
      let plaqueZOffset = (x < 0)
         ? -(w + plaqueW + gap)
         : (w + plaqueW + gap);
      let plaqueY = y;

      // Plaque cube body
      model.add('cube')
           .color(0.92, 0.92, 0.90)
           .move(x, plaqueY, z + plaqueZOffset)
           .turnY(rotY)
           .scale(plaqueW, plaqueH, plaqueHalf);

      // Plaque text — in front of cube
      let plaqueTextX = x - wallDir * (plaqueHalf + 0.003);
      model.add('square')
           .setTxtr(plaqueCanvas, plaqueChannels[i])
           .move(plaqueTextX, plaqueY, z + plaqueZOffset)
           .turnY(rotY)
           .scale(plaqueW, plaqueH, 1);
   }

   model.animate(() => {
      if (traceSources.length > 0) {
         const viewerPos = cg.mTransform(
            clay.inverseRootMatrix,
            model.inverseViewMatrix(0).slice(12, 15)
         );
         const insideGallery =
            viewerPos[0] >= tracePlayback.galleryBounds.minX &&
            viewerPos[0] <= tracePlayback.galleryBounds.maxX &&
            viewerPos[2] >= tracePlayback.galleryBounds.minZ &&
            viewerPos[2] <= tracePlayback.galleryBounds.maxZ;

         for (const traceSource of traceSources) {
            if (!traceSource.ready || !traceSource.anchor) {
               continue;
            }

            const soundPos = traceSource.anchor.getGlobalPos();
            const distance = cg.distance(viewerPos, soundPos);
            updatePosition(traceSource.audioIndex, soundPos);

            let targetGain = 0;
            if (insideGallery && distance < tracePlayback.silenceRadius) {
               const fade = clamp01(
                  (tracePlayback.silenceRadius - distance) /
                  (tracePlayback.silenceRadius - tracePlayback.fullGainRadius)
               );
               targetGain = traceSource.maxGain * fade;
            }

            traceSource.currentGain +=
               (targetGain - traceSource.currentGain) * tracePlayback.smoothing;
            setGain(traceSource.audioIndex, traceSource.currentGain);
         }
      }
   });
}

export const init = async model => initGalleryScene(model, {
   enableAuditoryTraces: true,
});

export const deinit = async () => {
   for (const traceSource of traceSources) {
      stopSound(traceSource.audioIndex);
      setGain(traceSource.audioIndex, 0);
   }
   traceSources = [];
   tracePlaybackStarted = false;

   if (ambientAudio) {
      ambientAudio.pause();
      ambientAudio.currentTime = 0;
      ambientAudio = null;
   }

   if (ambientResumeHandler) {
      document.removeEventListener('click', ambientResumeHandler);
      ambientResumeHandler = null;
   }

   if (unlockSpatialAudioHandler) {
      document.removeEventListener('click', unlockSpatialAudioHandler);
      document.removeEventListener('keydown', unlockSpatialAudioHandler);
      unlockSpatialAudioHandler = null;
   }

   if (traceBubbleToggleHandler) {
      document.removeEventListener('keydown', traceBubbleToggleHandler);
      traceBubbleToggleHandler = null;
   }

   traceBubbleDebugNodes = [];
   traceBubbleDebugEnabled = false;
};
