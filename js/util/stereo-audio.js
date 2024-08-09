let audioContext = new (window.AudioContext || window.webkitAudioContext)();
let stereoAudioSource = null;

export async function loadStereoSound(url, bufferSetter) {
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        bufferSetter(audioBuffer);
        console.log(`Sound loaded successfully from ${url}`);
    } catch (error) {
        console.error(`Error loading sound from ${url}:`, error);
    }
}

export function playStereoAudio(buffer) {
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    /*
    if (stereoAudioSource) {
        stereoAudioSource.stop();
    }
    */
    
    stereoAudioSource = audioContext.createBufferSource();
    stereoAudioSource.buffer = buffer;
    stereoAudioSource.loop = true;
    stereoAudioSource.connect(audioContext.destination);
    stereoAudioSource.start();
    console.log('Stereo Played');
}

export function stopStereoLoopingAudio() {
    if (stereoAudioSource) {
        stereoAudioSource.stop();
        stereoAudioSource = null;
        console.log('Stereo Stopped');
    }
}
