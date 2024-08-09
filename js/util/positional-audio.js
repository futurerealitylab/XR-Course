"use strict"

import { UrlTexture } from '../render/core/texture.js';
import { ButtonNode } from '../render/nodes/button.js';
import { Gltf2Node } from '../render/nodes/gltf2.js';
import { mat4, vec3 } from '../render/math/gl-matrix.js';
import { initObject, updateObject } from './object-sync.js';

const ANALYSER_FFT_SIZE = 1024;
const DEFAULT_HEIGHT = 1.5;

let playButton = null;
let playTexture = new UrlTexture('./media/textures/play-button.png');
let pauseTexture = new UrlTexture('./media/textures/pause-button.png');
// const AudioContext = window.AudioContext || window.webkitAudioContext;

// Audio scene globals
let audioContext = new AudioContext();

export let resonance;
let resonanceSource;
let resonanceSource02;
let resonanceSource03;
let resonanceSource04;

if (window.ResonanceAudio) {
   resonance = new ResonanceAudio(audioContext);
   resonance.output.connect(audioContext.destination);
   resonanceSource = resonance.createSource();
   resonanceSource02 = resonance.createSource();
   resonanceSource03 = resonance.createSource();
   resonanceSource04 = resonance.createSource();

}

export async function loadSound(url, bufferSetter) {
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        bufferSetter(audioBuffer);
        console.log(`Sound loaded successfully from ${url}`); // Success log
    } catch (error) {
        console.error(`Error loading sound from ${url}:`, error); // Error log
    }
}


export function playSoundAtPosition(buffer, position) {
    audioContext.resume();
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    resonanceSource.setPosition(position[0], position[1], position[2]);
    source.connect(resonanceSource.input);
    source.start(0);
    console.log('Sound Played');

}

// play looping sounds

let ongoingSource;
let ongoingSource02;
let ongoingSource03;
let ongoingSource04;



export function playLoopingSoundAtPosition(buffer, position) {
    if (audioContext && !ongoingSource) {
        audioContext.resume();
        ongoingSource = audioContext.createBufferSource();
        ongoingSource.buffer = buffer;
        ongoingSource.loop = true;
	if (resonanceSource) {
           resonanceSource.setPosition(position[0], position[1], position[2]);
           ongoingSource.connect(resonanceSource.input);
        }
        ongoingSource.start(0);
        console.log('Looping Sound Played');
    }
}

export function playLoopingSoundAtPosition02(buffer, position) {
    if (audioContext && !ongoingSource02) {
        audioContext.resume();
        ongoingSource02 = audioContext.createBufferSource();
        ongoingSource02.buffer = buffer;
        ongoingSource02.loop = true;
        resonanceSource02.setPosition(position[0], position[1], position[2]);
        ongoingSource02.connect(resonanceSource02.input);
        ongoingSource02.start(0);
        console.log('Looping Sound 02 Played');
    }
}

export function playLoopingSoundAtPosition03(buffer, position) {
    if (audioContext && !ongoingSource03) {
        audioContext.resume();
        ongoingSource03 = audioContext.createBufferSource();
        ongoingSource03.buffer = buffer;
        ongoingSource03.loop = true;
        resonanceSource03.setPosition(position[0], position[1], position[2]);
        ongoingSource03.connect(resonanceSource03.input);
        ongoingSource03.start(0);
        console.log('Looping Sound 03 Played');
    }
}

export function playLoopingSoundAtPosition04(buffer, position) {
    if (audioContext && !ongoingSource04) {
        audioContext.resume();
        ongoingSource04 = audioContext.createBufferSource();
        ongoingSource04.buffer = buffer;
        ongoingSource04.loop = true;
        resonanceSource04.setPosition(position[0], position[1], position[2]);
        ongoingSource04.connect(resonanceSource04.input);
        ongoingSource04.start(0);
        console.log('Looping Sound 04 Played');
    }
}


export function updateSoundPosition(position){
    if (resonanceSource)
       resonanceSource.setPosition(position[0], position[1], position[2]);
}

export function stopLoopingSound() {
    if (ongoingSource) {
        ongoingSource.stop();
        ongoingSource = null;
    }


    if (ongoingSource02) {
        ongoingSource02.stop();
        ongoingSource02 = null;
    }

    if (ongoingSource03) {
        ongoingSource03.stop();
        ongoingSource03 = null;
    }

    if (ongoingSource04) {
        ongoingSource04.stop();
        ongoingSource04 = null;
    }

    console.log('Looping Sound Stopped');

}

export function stopLoopingSound02() {
    if (ongoingSource02) {
        ongoingSource02.stop();
        ongoingSource02 = null;
    }
    console.log('Looping Sound 02 Stopped');

}

export function updateSound02Position(position){
    resonanceSource02.setPosition(position[0], position[1], position[2]);
}



export let stereo = new Gltf2Node({ url: './media/gltf/stereo/stereo.gltf' });
// FIXME: Temporary fix to initialize for cloning.
stereo.visible = false;

audioContext.suspend();

// Room Acoustic Simulation
// Units: Meter
// The example here is a small to medium room
let roomDimensions = {
  width : 6,
  height : 2.5,
  depth : 6
};

// Simplified view of the materials that make up the scene.
// dry room presets
let roomMaterials = {
  left : 'curtain-heavy', // walls
  right : 'curtain-heavy',
  front : 'curtain-heavy',
  back : 'curtain-heavy', 
  down : 'polished-concrete-or-tile', // floor
  up : 'wood-ceiling'
};

if (resonance)
   resonance.setRoomProperties(roomDimensions, roomMaterials);



export function createAudioSource(options) {
    // Create a Resonance source and set its position in space.
    let source = resonance.createSource();
    let pos = options.position;
    source.setPosition(pos[0], pos[1], pos[2]);

    // Connect an analyser. This is only for visualization of the audio, and
    // in most cases you won't want it.
    let analyser = audioContext.createAnalyser();
    analyser.fftSize = ANALYSER_FFT_SIZE;
    analyser.lastRMSdB = 0;

    return fetch(options.url)
        .then((response) => response.arrayBuffer())
        .then((buffer) => audioContext.decodeAudioData(buffer))
        .then((decodedBuffer) => {
            let bufferSource = createBufferSource(
                source, decodedBuffer, analyser);

            return {
                buffer: decodedBuffer,
                bufferSource: bufferSource,
                source: source,
                analyser: analyser,
                position: pos,
                rotateY: options.rotateY,
                node: null
            };
        });
}

function createBufferSource(source, buffer, analyser) {
    // Create a buffer source. This will need to be recreated every time
    // we wish to start the audio, see
    // https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode
    let bufferSource = audioContext.createBufferSource();
    bufferSource.loop = true;
    bufferSource.connect(source.input);

    bufferSource.connect(analyser);

    bufferSource.buffer = buffer;

    return bufferSource;
}

/**
 * Returns a floating point value that represents the loudness of the audio
 * stream, appropriate for scaling an object with.
 * @return {Number} loudness scalar.
 */
let fftBuffer = new Float32Array(ANALYSER_FFT_SIZE);
function getLoudnessScale(analyser) {
    analyser.getFloatTimeDomainData(fftBuffer);
    let sum = 0;
    for (let i = 0; i < fftBuffer.length; ++i)
        sum += fftBuffer[i] * fftBuffer[i];

    // Calculate RMS and convert it to DB for perceptual loudness.
    let rms = Math.sqrt(sum / fftBuffer.length);
    let db = 30 + 10 / Math.LN10 * Math.log(rms <= 0 ? 0.0001 : rms);

    // Moving average with the alpha of 0.525. Experimentally determined.
    analyser.lastRMSdB += 0.525 * ((db < 0 ? 0 : db) - analyser.lastRMSdB);

    // Scaling by 1/30 is also experimentally determined. Max is to present
    // objects from disappearing entirely.
    return Math.max(0.3, analyser.lastRMSdB / 30.0);
}

export let audioSources = [];

export function updateAudioNodes(scene) {
    if (!stereo)
        return;

    for (let source of audioSources) {
        if (!source.node) {
            // initObject first, if websocket is not ready, return directly
            // if (window.wsclient.ws.readyState != WebSocket.OPEN) {
            //     console.log("websocket not ready");
            //     return;
            // }
            source.node = stereo.clone();
            source.node.visible = true;
            source.node.selectable = true;
            scene.addNode(source.node);
            // ZH
            let mymatrix = mat4.fromValues(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
            mat4.identity(mymatrix);
            // console.log("mymatrix", mymatrix);
            let mypos = source.position;
            mypos[1] -= 0.5;
            mat4.translate(mymatrix, mymatrix, mypos);
            // console.log("mymatrix", mymatrix);
            mat4.rotateY(mymatrix, mymatrix, source.rotateY);
            let scale = getLoudnessScale(source.analyser);
            mat4.scale(mymatrix, mymatrix, [scale, scale, scale]);
            initObject("stereo", mymatrix, window.envObjID++); // 0 means for environment
        }

        let node = source.node;
        let matrix = node.matrix;

        // Move the node to the right location.
        mat4.identity(matrix);
        mat4.translate(matrix, matrix, source.position);
        mat4.rotateY(matrix, matrix, source.rotateY);

        // Scale it based on loudness of the audio channel
        let scale = getLoudnessScale(source.analyser);
        mat4.scale(matrix, matrix, [scale, scale, scale]);
    }
}

function playAudio() {
    if (audioContext.state == 'running')
        return;

    audioContext.resume();

    for (let source of audioSources) {
        source.bufferSource.start(0);
    }

    if (playButton) {
        playButton.iconTexture = pauseTexture;
    }
}

export function pauseAudio() {
    if (audioContext.state == 'suspended')
        return;

    for (let source of audioSources) {
        source.bufferSource.stop(0);
        source.bufferSource = createBufferSource(
            source.source, source.buffer, source.analyser);
    }

    audioContext.suspend();

    // if (playButton) {
    //     playButton.iconTexture = playTexture;
    // }
}

window.addEventListener('blur', () => {
    // As a general rule you should mute any sounds your page is playing
    // whenever the page loses focus.
    pauseAudio();
});

export function updateAudioSources(frame, refSpace) {
    let tmpMatrix = mat4.create();
    // for (let source of audioSources) {
    //     if (source.draggingInput) {
    //         let draggingPose = frame.getPose(source.draggingInput.targetRaySpace, refSpace);
    //         if (draggingPose) {
    //             let pos = source.position;
    //             mat4.multiply(tmpMatrix, draggingPose.transform.matrix, source.draggingTransform);
    //             vec3.transformMat4(pos, [0, 0, 0], tmpMatrix);
    //             source.source.setPosition(pos[0], pos[1], pos[2]);
    //         }
    //     }
    // }
    for (let id in window.objects) {
        if (window.objects[id].draggingInput) {
            let draggingPose = frame.getPose(window.objects[id].draggingInput.targetRaySpace, refSpace);
            if (draggingPose) {
                // let pos = window.objects[id].matrix.position;
                mat4.multiply(window.objects[id].matrix, draggingPose.transform.matrix, window.objects[id].draggingTransform);
                updateObject(id, window.objects[id].matrix);
                window.objects[id].node.matrix = tmpMatrix;
            }
        }
    }
}

export function loadAudioSources(scene) {
    Promise.all([
        createAudioSource({
            url: 'media/sound/guitar.ogg',
            position: [0, DEFAULT_HEIGHT, -1],
            rotateY: 0
        }),
        createAudioSource({
            url: 'media/sound/drums.ogg',
            position: [-1, DEFAULT_HEIGHT, 0],
            rotateY: Math.PI * 0.5
        }),
        createAudioSource({
            url: 'media/sound/perc.ogg',
            position: [1, DEFAULT_HEIGHT, 0],
            rotateY: Math.PI * -0.5
        }),
    ]).then((sources) => {
        audioSources = sources;

        // Once the audio is loaded, create a button that toggles the
        // audio state when clicked.
        // playButton = new ButtonNode(playTexture, () => {
        //     if (audioContext.state == 'running') {
        //         pauseAudio();
        //     } else {
        //         playAudio();
        //     }
        // });
        // playButton.translation = [0, 1., 0.25];
        // scene.addNode(playButton);
    });
}
