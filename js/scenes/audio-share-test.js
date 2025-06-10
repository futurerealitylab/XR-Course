import * as cg from "../render/core/cg.js";
import {
    loadSound,
    playSoundAtPosition,
    updateSoundPosition
} from "../util/positional-audio.js";

import {
    audioBufferToWavBuffer,
    decodeWavBufferToAudioBuffer
} from "../util/audio-share.js";

// Audio Setup
let recordedBuffer = null;
let mediaRecorder = null;
let audioChunks = [];
let audioCtx = new AudioContext();
let sharedWav = null;

// Ball Setup
const radius = 0.05;
let recordState = 'idle'; // 'idle' | 'recording' | 'done'

// Ball Positions: Record, Play, Clear
const balls = {
    0: [0.0, 1.3, -0.5],
    1: [0.2, 1.3, -0.5],
    2: [0.4, 1.3, -0.5]
};

// Spin Ball for Playback
let spinPos = [0, 0, 0];
const spinRadius = 1.5;
let angle = 0;

// Shared recording state
server.init('recording', {});

function getColorForRecordBall() {
    if (recordState === 'recording') return [1, 0, 0];
    if (recordState === 'done') return [0, 1, 0];
    return [0.5, 0.5, 0.5];
}

function findBall(handPos) {
    for (let id in balls) {
        if (cg.distance(handPos, balls[id]) < 2 * radius)
            return parseInt(id);
    }
    return -1;
}

function preloadSounds() {
    loadSound('../../media/sound/SFXs/demoSpinningSound/SFX_SpinningSound_Test_Signal_Mono_01.wav', () => {});
}
preloadSounds();

export const init = async model => {
    let avatars = model.add();

    inputEvents.onClick = async hand => {
        const id = findBall(inputEvents.pos(hand));
        if (id === -1) return;

        switch (id) {
            case 0: // Record/Stop
                if (recordState === 'idle') {
                    try {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        mediaRecorder = new MediaRecorder(stream);
                        audioChunks = [];

                        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
                        mediaRecorder.start();

                        recordState = 'recording';
                        server.send('recording', { state: 'recording' });

                        console.log("Recording started.");
                    } catch (err) {
                        console.error("Microphone error:", err);
                    }
                } else if (recordState === 'recording') {
                    mediaRecorder.onstop = async () => {
                        const blob = new Blob(audioChunks);
                        const arrayBuffer = await blob.arrayBuffer();
                        recordedBuffer = await audioCtx.decodeAudioData(arrayBuffer);

                        const wavBytes = audioBufferToWavBuffer(recordedBuffer);
                        sharedWav = shared(() => new Uint8Array(wavBytes));

                        recordState = 'done';
                        server.send('recording', { state: 'done' });

                        console.log("Recording saved and shared.");
                    };
                    mediaRecorder.stop();
                    console.log("Recording stopped.");
                }
                break;

            case 1: // Play
                if (recordedBuffer) {
                    let emptyObj = model.add().move(spinPos);
                    let objPos = emptyObj.getGlobalMatrix();
                    playSoundAtPosition(recordedBuffer, [objPos[12], objPos[13], objPos[14]]);
                    model.remove(emptyObj);
                    console.log("Playing from spinning ball.");
                } else {
                    console.log("No recording to play.");
                }
                break;

            case 2: // Clear
                recordedBuffer = null;
                sharedWav = null;
                recordState = 'idle';
                server.send('recording', { state: 'idle' });
                console.log("Recording cleared.");
                break;
        }
    };

    model.animate(() => {
        // Sync shared recording state
        server.sync('recording', (msgs, msg_clientID) => {
            for (let id in msgs) {
                let msg = msgs[id];
                if (msg.state) {
                    recordState = msg.state;
                }
            }
        });

        // Handle auto-clear when state becomes idle
        if (recordState === 'idle' && recordedBuffer !== null) {
            recordedBuffer = null;
            sharedWav = null;
            console.log("Recording buffer cleared due to idle state.");
        }

        // Receive and decode shared audio buffer safely
        if (!recordedBuffer && recordState === 'done') {
            try {
                sharedWav = shared();
                if (sharedWav instanceof Uint8Array) {
                    decodeWavBufferToAudioBuffer(sharedWav).then(decoded => {
                        if (decoded) {
                            recordedBuffer = decoded;
                            console.log("Received shared audio and decoded.");
                        }
                    });
                }
            } catch (e) {
                console.warn("Shared audio not available yet:", e);
            }
        }

        // Animate spinning ball position
        const centerPos = balls[1];
        angle += 0.01;
        spinPos[0] = centerPos[0] + Math.cos(angle) * spinRadius;
        spinPos[1] = centerPos[1];
        spinPos[2] = centerPos[2] + Math.sin(angle) * spinRadius;

        // Clear scene
        while (model.nChildren() > 0)
            model.remove(0);

        avatars = model.add();

        // UI balls
        model.add('sphere').move(balls[0]).scale(radius).color(getColorForRecordBall()); // Record
        model.add('sphere').move(balls[1]).scale(radius).color([0, 0.6, 1]);              // Play
        model.add('sphere').move(balls[2]).scale(radius).color([1, 1, 0]);                // Clear

        // Spinning white playback ball
        model.add('sphere').move(spinPos).scale(radius).color([1, 1, 1]);

        // Spatial sound anchor
        const soundAnchor = model.add().move(spinPos);
        const m = soundAnchor.getGlobalMatrix();
        updateSoundPosition([m[12], m[13], m[14]]);
        model.remove(soundAnchor);

        // Avatar rendering block
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
