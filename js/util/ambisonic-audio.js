const audioElement = document.createElement('audio');
audioElement.src = 'audio-file-foa-acn.wav';

const audioContext = new AudioContext();
const audioElementSource = audioContext.createMediaElementSource(audioElement);
const foaRenderer = Omnitone.createFOARenderer(audioContext);

foaRenderer.initialize().then(function() {
  audioElementSource.connect(foaRenderer.input);
  foaRenderer.output.connect(audioContext.destination);

  someButton.onclick = () => {
    audioContext.resume();
    audioElement.play();
  };
});
