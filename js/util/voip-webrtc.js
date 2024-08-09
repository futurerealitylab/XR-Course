import { initAvatar } from "../primitive/avatar.js";
import { mat4, vec3, quat } from "../render/math/gl-matrix.js";
import { metaroomWebrtcSender } from "../corelink_handler.js"
import { corelink_message } from "../util/corelink_sender.js"

// vars
window.localUuid = "";
// window.localStream;
window.peerConnections = {}; // key is uuid, values are peer connection object and user defined display name string
window.remoteIDs = [];
window.webrtcInit = false;
// const AudioContext = window.AudioContext || window.webkitAudioContext;
window.speakStates = {};


var peerConnectionConfig = {
  iceServers: [
    { urls: "stun:stun.stunprotocol.org:3478" },
    { urls: "stun:stun.l.google.com:19302" },
  ],
};

function setUserMediaVariable() {
  if (navigator.mediaDevices === undefined) {
    navigator.mediaDevices = {};
  }

  navigator.mediaDevices.enumerateDevices().then(function (devices) {
    devices.forEach(function (device) {
      console.log(
        device.kind + ": " + device.label + " id = " + device.deviceId
      );
    });
  });

  if (navigator.mediaDevices.getUserMedia === undefined) {
    navigator.mediaDevices.getUserMedia = function (constraints) {
      // gets the alternative old getUserMedia is possible
      var getUserMedia =
        navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

      // set an error message if browser doesn't support getUserMedia
      if (!getUserMedia) {
        return Promise.reject(
          new Error(
            "Unfortunately, your browser does not support access to the webcam through the getUserMedia API. Try to use the latest version of Google Chrome, Mozilla Firefox, Opera, or Microsoft Edge instead."
          )
        );
      }

      // uses navigator.getUserMedia for older browsers
      return new Promise(function (resolve, reject) {
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    };
  }
}

window.webrtc_start = function () {
  
  if (window.webrtcInit) {
    return;
  }

  console.log("webrtc initialized");

  window.webrtcInit = true;
  window.localUuid = window.avatars[window.playerid].localUuid;
  // specify audio for user media
  // window.maxVideoWidth = 320;
  var constraints = {
    audio: true,
  };

  // setUserMediaVariable();

  if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        // window.videoStream = stream;
        window.localStream = stream;
        // stream.getAudioTracks()[0].enabled = false;
        document.getElementById("local_webrtc").muted = true;
        document.getElementById("local_webrtc").srcObject = stream;
        window.avatars[window.playerid].audio = document.getElementById(
          "local_webrtc"
        );
        // update to global
        // window.localStreamReady = true;
        // hide the self video until calibration is finished
        // document.getElementById('localVideoContainer').style.display = 'none';
      })
      .catch(errorHandler)

      // set up websocket and message all existing clients
      .then(() => {
        // window.serverConnection.onmessage = gotMessageFromServer;
        // window.serverConnection.onopen = event => {
        //     window.serverConnection.send(JSON.stringify({ 'displayName': window.localDisplayName, 'uuid': window.localUuid, 'dest': 'all' }));
        // }
        // window.wsclient.send("webrtc", {
        //   displayName: window.playerid,
        //   uuid: window.localUuid,
        //   dest: "all",
        // });
        var msg = corelink_message("webrtc", {
          displayName: window.playerid,
          uuid: window.localUuid,
          dest: "all",
        });
        corelink.send(metaroomWebrtcSender, msg);
      })
      .catch(errorHandler);
  } else {
    alert("Your browser does not support getUserMedia API");
  }
};

function setUpPeer(peerUuid, displayName, initCall = false) {
  window.peerConnections[peerUuid] = {
    displayName: displayName,
    pc: new RTCPeerConnection(peerConnectionConfig),
  };
  window.peerConnections[peerUuid].pc.onicecandidate = (event) =>
    gotIceCandidate(event, peerUuid);
  window.peerConnections[peerUuid].pc.ontrack = (event) =>
    gotRemoteStream(event, peerUuid);
  window.peerConnections[peerUuid].pc.oniceconnectionstatechange = (event) =>
    checkPeerDisconnect(event, peerUuid);
  if (window.localStream) {
    const pc = window.peerConnections[peerUuid].pc;
    if (pc.addTrack) {
      window.localStream.getTracks().forEach(function (track) {
        pc.addTrack(track, window.localStream);
      });
    } else if (pc.addStream) {
      pc.addStream(window.localStream);
    } else {
      console.warn("unsupported");
    }
  }

  if (initCall) {
    window.peerConnections[peerUuid].pc
      .createOffer()
      .then((description) => createdDescription(description, peerUuid))
      .catch(errorHandler);
  }
}
window.setUpPeer = setUpPeer;

window.mute = function (peerUuid = window.localUuid, speak = true /*0 speaking 1 muting */) {
  // or unmute
  // console.log("window.peerConnections size", Object.keys(window.peerConnections).length);
  // if (Object.keys(window.peerConnections).length == 0) {
  //   // not yet setup webrtc
  //   // console.log("window.peerConnections size 0, delay mute operation", peerUuid);
  //   // setTimeout(5000, window.mute(peerUuid));
  //   return;
  // }
  if (peerUuid == window.localUuid) {
    console.log("DONT mute self", window.localUuid);
    for (let id in window.avatars) {
      console.log(window.avatars[id].localUuid);
    }
  } else if (peerUuid in window.peerConnections) {
    var hasAudio = false;
    console.log(
      peerUuid,
      window.peerConnections,
      window.peerConnections[peerUuid], "speaking or not", speak
    );
    // udpated
    if (window.peerConnections[peerUuid].audioInputStream) {
      window.peerConnections[peerUuid].audioInputStream.mediaStream
        .getAudioTracks()
        .forEach((t) => {
          if (t.kind === "audio") {
            t.enabled = speak;//!t.enabled;
            hasAudio = t.enabled;
            return hasAudio;
          }
        });
    } else {
      console.log("[webrtc] warning no mediaStream in", window.peerConnections[peerUuid].audioInputStream);
    }

    return hasAudio;
  }
  else {
    // peerUuid is not in windowlpeerConnections yet, let's record it for now
    window.speakStates[peerUuid] = speak;
  }
};

function gotIceCandidate(event, peerUuid) {
  if (event.candidate != null) {
    // window.wsclient.send("webrtc", {
    //   ice: event.candidate,
    //   uuid: window.localUuid,
    //   dest: peerUuid,
    // });
    var msg = corelink_message("webrtc", {
      ice: event.candidate,
      uuid: window.localUuid,
      dest: peerUuid,
    });
    corelink.send(metaroomWebrtcSender, msg);
    console.log("corelink.send", msg);
  }
}

function createdDescription(description, peerUuid) {
  console.log(`got description, peer ${peerUuid}`);
  if ("localdesc" in window.peerConnections[peerUuid]) {
    console.log("already set local description");
  } else {
    window.peerConnections[peerUuid].localdesc = true;
    window.peerConnections[peerUuid].pc
      .setLocalDescription(description)
      .then(function () {
        // window.wsclient.send("webrtc", {
        //   sdp: window.peerConnections[peerUuid].pc.localDescription,
        //   uuid: window.localUuid,
        //   dest: peerUuid,
        // });
        var msg = corelink_message("webrtc", {
          sdp: window.peerConnections[peerUuid].pc.localDescription,
          uuid: window.localUuid,
          dest: peerUuid,
        });
        corelink.send(metaroomWebrtcSender, msg);
        console.log("corelink.send", msg);
      })
      .catch(errorHandler);
  }
}
window.createdDescription = createdDescription;

function gotRemoteStream(event, peerUuid) {
  // if (peerUuid in connection_uids) {
  //     return;
  // }
  // connection_uids[peerUuid] = true;
  console.log(`got remote stream, peer ${peerUuid}`);

  var vidElement = document.createElement("video");
  vidElement.setAttribute("autoplay", "");
  vidElement.setAttribute("muted", "");
  vidElement.srcObject = event.streams[0];
  vidElement.onloadedmetadata = function (e) {
    vidElement.muted = true;
  };

  playAvatarAudio(event.streams[0], peerUuid);

  // handle previous speakState
  if (peerUuid in window.speakStates) {
    console.log("handle previous speak", peerUuid);
    window.mute(peerUuid, window.speakStates[peerUuid]);
  }

  var vidContainer = document.createElement("div");
  vidContainer.setAttribute("id", "remoteAudio_" + peerUuid);
  // vidContainer.appendChild(vidElement);

  var videosElement = document.getElementById("audios");
  if (videosElement == null) {
    videosElement = document.createElement("div");
    videosElement.setAttribute("id", "audios");
    document.body.appendChild(videosElement);
  }

  document.getElementById("audios").appendChild(vidContainer);
}

function transformQuat(out, vec, quat) {
  var q = quat;
  if (quat.x != undefined) q = [quat.x, quat.y, quat.z, quat.w];
  var a = vec;
  if (vec.x != undefined) a = [vec.x, vec.y, vec.z];
  let qx = q[0],
    qy = q[1],
    qz = q[2],
    qw = q[3];
  let x = a[0],
    y = a[1],
    z = a[2];
  let uvx = qy * z - qz * y,
    uvy = qz * x - qx * z,
    uvz = qx * y - qy * x;
  let uuvx = qy * uvz - qz * uvy,
    uuvy = qz * uvx - qx * uvz,
    uuvz = qx * uvy - qy * uvx;
  let w2 = qw * 2;
  uvx *= w2;
  uvy *= w2;
  uvz *= w2;
  uuvx *= 2;
  uuvy *= 2;
  uuvz *= 2;
  out[0] = x + uvx + uuvx;
  out[1] = y + uvy + uuvy;
  out[2] = z + uvz + uuvz;
  return out;
}

function updateAvatarAudio(peerUuid) {
  if (initAudio(peerUuid)) {
    // listener: where I am
    // console.log("set listener pos", window.avatars[window.playerid].headset.position);
    var selfPos = window.avatars[window.playerid].headset.position;
    var selfRotation = window.avatars[window.playerid].headset.orientation;
    var selffwd = [0, 0, 0]; //vec3.create();
    transformQuat(selffwd, [0, 0, -1], selfRotation);
    var audioListener = window.peerConnections[peerUuid].audioContext.listener;
    if (audioListener && selfPos.x != undefined) {
      window.peerConnections[peerUuid].audioContext.listener.positionX.value =
        selfPos.x;
      window.peerConnections[peerUuid].audioContext.listener.positionY.value =
        selfPos.y;
      window.peerConnections[peerUuid].audioContext.listener.positionZ.value =
        selfPos.z;
      window.peerConnections[peerUuid].audioContext.listener.forwardX.value =
        selffwd[0];
      window.peerConnections[peerUuid].audioContext.listener.forwardY.value =
        selffwd[1]; //0;
      window.peerConnections[peerUuid].audioContext.listener.forwardZ.value =
        selffwd[2];
    }

    // panner: audio source
    if (window.avatars[window.peerConnections[peerUuid].displayName].headset) {
      var srcPos =
        window.avatars[window.peerConnections[peerUuid].displayName].headset
          .position;
      var srcFWD = [0, 0, 0]; //vec3.create();
      // window.(srcEuler, window.avatars[window.peerConnections[peerUuid].displayName].headset.orientation);
      transformQuat(srcFWD, [0, 0, -1], selfRotation);
      // quat.getEuler(srcEuler, srcOrientation);
      let panner = window.peerConnections[peerUuid].panner;
      if (panner && srcPos.x != undefined) {
        window.peerConnections[peerUuid].panner.positionX.value = srcPos.x;
        window.peerConnections[peerUuid].panner.positionY.value = srcPos.y;
        window.peerConnections[peerUuid].panner.positionZ.value = srcPos.z;
        window.peerConnections[peerUuid].panner.orientationX.value = srcFWD[0];
        window.peerConnections[peerUuid].panner.orientationY.value = srcFWD[1];
        window.peerConnections[peerUuid].panner.orientationZ.value = srcFWD[2];
      }
    }
    // console.log('pos src', selfPos, 'des', srcPos);
    // console.log('euler src', selffwd, 'des', srcFWD);
  }
}
window.updateAvatarAudio = updateAvatarAudio;

function playAvatarAudio(stream, peerUuid) {
  //
  if (initAudio(peerUuid)) {
    // how many times this got called?
    // shall we update listener here?
    // Create a MediaStreamAudioSourceNode

    updateAvatarAudio(peerUuid);

    var realAudioInput = new MediaStreamAudioSourceNode(
      window.peerConnections[peerUuid].audioContext,
      {
        mediaStream: stream,
      }
    );
    // mute at the beginning
    realAudioInput.mediaStream.getAudioTracks()[0].enabled = false;

    window.peerConnections[peerUuid].audioInputStream = realAudioInput;

    console.log("playAvatarAudio", stream, peerUuid);
    realAudioInput.connect(window.peerConnections[peerUuid].panner);
    window.peerConnections[peerUuid].panner.connect(
      window.peerConnections[peerUuid].audioContext.destination
    );
    // realAudioInput.connect(that.audioContext.destination);
    // realAudioInput.connect(that.biquadFilter);
    // that.biquadFilter.connect(that.audioContext.destination);
  }
}

function testSpatialAudio() {
  window.testAudioElement = document.getElementById("test");
  window.testAudioElement.loop = true;
  window.testAudioElement.play();
  window.testAudioContext = new AudioContext();
  window.testAudioContext.listener.positionY.value = 1.5;

  // var realAudioInput = new MediaStreamAudioSourceNode(testAudioContext, {
  //     mediaStream: audioSources[0].stream
  // });
  var track = window.testAudioContext.createMediaElementSource(
    window.testAudioElement
  );

  window.testPanner = new PannerNode(window.testAudioContext, {
    // equalpower or HRTF
    panningModel: "HRTF",
    // linear, inverse, exponential
    distanceModel: "linear",
    positionX: 0,
    positionY: 1.5,
    positionZ: 0,
    orientationX: 0.0,
    orientationY: 0,
    orientationZ: 0.0,
    refDistance: 0.1,
    maxDistance: 10000,
    rolloffFactor: 1.5,
    coneInnerAngle: 360,
    coneOuterAngle: 360,
    coneOuterGain: 0.2,
  });
  track.connect(window.testPanner);
  window.testPanner.connect(window.testAudioContext.destination);
}
window.testSpatialAudio = testSpatialAudio;

function initAudio(peerUuid) {
  if (window.peerConnections[peerUuid].audioContext != null) {
    // console.log(
    //   "avatar[" +
    //     window.peerConnections[peerUuid].displayName +
    //     "] already setup"
    // );
    return true;
  }

  if (
    window.peerConnections[peerUuid] &&
    window.avatars[window.peerConnections[peerUuid]] &&
    "leave" in window.avatars[window.peerConnections[peerUuid].displayName]
  ) {
    console.log(window.peerConnections[peerUuid].displayName, "already left");
    return false;
  }

  if (!(window.peerConnections[peerUuid].displayName in window.avatars)) {
    console.log(
      "avatar[" +
      window.peerConnections[peerUuid].displayName +
      "] is not ready yet",
      window.avatars
    );
    initAvatar(window.peerConnections[peerUuid].displayName);

    // setTimeout(initAudio(peerUuid), 1000);
    // return true;
  }

  console.log(
    "avatar[" +
    window.peerConnections[peerUuid].displayName +
    "] now setting up"
  );

  window.peerConnections[peerUuid].audioContext = new AudioContext();

  window.peerConnections[peerUuid].panner = new PannerNode(
    window.peerConnections[peerUuid].audioContext,
    {
      // equalpower or HRTF
      panningModel: "HRTF",
      // linear, inverse, exponential
      distanceModel: "linear",
      positionX: 0,
      positionY: 0,
      positionZ: 0,
      orientationX: 0.0,
      orientationY: 0,
      orientationZ: 0.0,
      refDistance: 0.1,
      maxDistance: 10000,
      rolloffFactor: 1.5,
      coneInnerAngle: 360,
      coneOuterAngle: 360,
      coneOuterGain: 0.2,
    }
  );

  return true;
}

function checkPeerDisconnect(event, peerUuid) {
  var state = window.peerConnections[peerUuid].pc.iceConnectionState;
  console.log(`connection with peer ${peerUuid} ${state}`);
  if (state === "failed" || state === "closed" || state === "disconnected") {
    delete window.peerConnections[peerUuid];
    delete window.teamObj[peerUuid];
    delete window.teamAvatar[peerUuid];
    console.log("drop peer id", peerUuid);
    // delete connection_uids[peerUuid];
  }
}

function errorHandler(error) {
  console.log(error);
}
window.errorHandler = errorHandler;

window.muteSelf = function () {
  // window.wsclient.send("mute", {
  //   uuid: window.localUuid,
  // });
  var msg = corelink_message("mute", {
    uuid: window.localUuid,
    speak: window["demoSpeakState"]//0 speaking 1 muting
  });
  corelink.send(metaroomWebrtcSender, msg);
  console.log("corelink.send", msg);
  if (demoSpeakState % 2) {
    //false by default
    document.querySelector("#Speak").innerText = "Mute";
  } else {
    document.querySelector("#Speak").innerText = "Speak";
  }
};
