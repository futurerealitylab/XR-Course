let audioCtx = new (window.AudioContext || window.webkitAudioContext)();

export function audioBufferToWavBuffer(buffer) {
    const length = buffer.length * buffer.numberOfChannels * 2 + 44;
    const result = new ArrayBuffer(length);
    const view = new DataView(result);

    function writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++)
            view.setUint8(offset + i, string.charCodeAt(i));
    }

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + buffer.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // PCM chunk size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, buffer.numberOfChannels, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * buffer.numberOfChannels * 2, true);
    view.setUint16(32, buffer.numberOfChannels * 2, true);
    view.setUint16(34, 16, true); // bits per sample
    writeString(view, 36, 'data');
    view.setUint32(40, buffer.length * buffer.numberOfChannels * 2, true);

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
        for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
            const sample = buffer.getChannelData(ch)[i];
            const s = Math.max(-1, Math.min(1, sample));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            offset += 2;
        }
    }

    console.log("audioBufferToWavBuffer(): Encoded WAV buffer length:", result.byteLength);
    return result;
}

export async function decodeWavBufferToAudioBuffer(wavUint8Array) {
    try {
        const arrayBuffer = wavUint8Array.buffer.slice(0); // full copy
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        console.log("decodeWavBufferToAudioBuffer(): Decoded AudioBuffer.");
        return audioBuffer;
    } catch (err) {
        console.error("decodeWavBufferToAudioBuffer(): Failed to decode:", err);
        return null;
    }
}

