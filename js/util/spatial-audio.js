// Spatial Audio Wrapper

let audioContext = new AudioContext();

export let resonanceScene;
let resonanceSources = [];

if (window.ResonanceAudio) {
    resonanceScene = new ResonanceAudio(audioContext);
    resonanceScene.output.connect(audioContext.destination);
}


// Room Acoustic Simulation
// Units: Meter
// FLR XR Room Preset
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

if (resonanceScene)
   resonanceScene.setRoomProperties(roomDimensions, roomMaterials);


export async function createSoundSource(index = 0, url, position, loop = false, gain = 1.0) {
    if (resonanceScene && !resonanceSources[index]) {
        resonanceSources[index] = {
            source: resonanceScene.createSource(),
            bufferSource: null,
            loop: loop,
            stopped: true
        };
    }
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        let bufferSource = audioContext.createBufferSource();
        bufferSource.buffer = audioBuffer;
        bufferSource.loop = loop;
        bufferSource.connect(resonanceSources[index].source.input);
        resonanceSources[index].source.setPosition(position[0], position[1], position[2]);
        resonanceSources[index].bufferSource = bufferSource;
        resonanceSources[index].source.setGain(gain);
        console.log(`Source at index ${index} created and buffer loaded successfully from ${url}`);
    } catch (error) {
        console.error(`Error loading sound from ${url}:`, error);
    }
}

export function playSound(sourceIndex = 0) {
    if (resonanceSources[sourceIndex] && resonanceSources[sourceIndex].bufferSource) {
        audioContext.resume();
        if (resonanceSources[sourceIndex].bufferSource.loop) {
            if (!resonanceSources[sourceIndex].stopped) {
                console.warn('Attempted to play a sound that is already playing. No action taken.');
                return;
            }
            resonanceSources[sourceIndex].bufferSource.disconnect();
        }
        const oldBuffer = resonanceSources[sourceIndex].bufferSource.buffer;
        const oldLoop = resonanceSources[sourceIndex].bufferSource.loop;
        let bufferSource = audioContext.createBufferSource();
        bufferSource.buffer = oldBuffer;
        bufferSource.loop = oldLoop;
        bufferSource.connect(resonanceSources[sourceIndex].source.input);
        resonanceSources[sourceIndex].bufferSource = bufferSource;
        bufferSource.start(0);
        resonanceSources[sourceIndex].stopped = false;
        console.log('Sound Played at index', sourceIndex, 'Looping:', oldLoop);
    } else {
        console.error(`No audio source prepared or available at index ${sourceIndex}`);
    }
}



export function updatePosition(sourceIndex, newPosition) {
    if (resonanceSources[sourceIndex] && resonanceSources[sourceIndex].source) {
        resonanceSources[sourceIndex].source.setPosition(newPosition[0], newPosition[1], newPosition[2]);
    } 
}

export function stopSound(sourceIndex = 0) {
    if (resonanceSources[sourceIndex] && resonanceSources[sourceIndex].bufferSource) {
        if (!resonanceSources[sourceIndex].stopped) { 
            resonanceSources[sourceIndex].bufferSource.stop();
            resonanceSources[sourceIndex].stopped = true; 
            console.log('Sound Stopped at index', sourceIndex);
        }
        // resonanceSources[sourceIndex].bufferSource = null; 
    }
}

export function stopAllSounds() {
    resonanceSources.forEach((source, index) => {
        if (source.bufferSource && !source.stopped) { 
            source.bufferSource.stop();
            source.stopped = true;
            console.log('Sound Stopped at index', index);
        }
        // source.bufferSource = null; 
    });
    console.log('All Sound Stops');
}
