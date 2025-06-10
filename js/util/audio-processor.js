class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
       super();
       this.buffer = [];
    }
 
    downsample(buffer, inputRate, targetRate) {
       if (targetRate >= inputRate) return buffer;
       const ratio = inputRate / targetRate;
       const newLength = Math.floor(buffer.length / ratio);
       const output = new Float32Array(newLength);
 
       for (let i = 0; i < newLength; i++) {
          const start = Math.floor(i * ratio);
          const end = Math.floor((i + 1) * ratio);
          let sum = 0;
          for (let j = start; j < end && j < buffer.length; j++) {
             sum += buffer[j];
          }
          output[i] = sum / (end - start || 1);
       }
 /*
       this.port.postMessage({
          type: 'debug',
          message: `[Worklet] Downsampled length: ${output.length} from ${buffer.length}`
       });
 */
       return output;
    }
 
    process(inputs) {
       const input = inputs[0];
       const channel = input[0];
       if (channel && channel.length > 0) {
          this.buffer.push(...channel);
 
          if (this.buffer.length >= 256) {
             const inputBuffer = this.buffer.slice(0, 256);
             this.buffer = this.buffer.slice(256);
 
             const downsampled = this.downsample(inputBuffer, sampleRate, 16000);
             this.port.postMessage(downsampled);
          }
       }
 
       return true;
    }
 }
 
 registerProcessor('audio-processor', AudioProcessor);
 