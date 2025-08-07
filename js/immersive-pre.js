import { WebXRButton } from "./util/webxr-button.js";
import * as global from "./global.js";
import { Renderer, createWebGLContext } from "./render/core/renderer.js";
import { Anidraw } from "./render/core/anidraw.js";
import { Gltf2Node } from "./render/nodes/gltf2.js";
import { Node } from './render/core/node.js';
import { mat4, vec3 } from "./render/math/gl-matrix.js";
import { Ray } from "./render/math/ray.js";
import { InlineViewerHelper } from "./util/inline-viewer-helper.js";
import { QueryArgs } from "./util/query-args.js";
import { EventBus } from "./primitive/eventbus.js";
import { init as handTrackerInit } from "/js/render/core/videoHandTracker.js";
import * as DefaultSystemEvents from "./primitive/event.js";
import { dataSendToUnity } from "./data/dataToUnity.js";

// head tracking for spatial audio
import {
    loadAudioSources,
    updateAudioSources,
    updateAudioNodes,
    stereo,
    resonance,
    audioSources,
    pauseAudio,
} from "./util/positional-audio.js";
import {
    resonanceScene,
} from "./util/spatial-audio.js";

import { Client as WSClient } from "./util/websocket-client.js";
import { updateController, controllerMatrix,  buttonState, joyStickState} from "./render/core/controllerInput.js";
import * as keyboardInput from "./util/input_keyboard.js";
import { InputController } from "./util/input_controller.js";
import { corelink_message } from "./util/corelink_sender.js"
import { metaroomSyncSender, metaroomToioSender, metaroomInitSender } from "./corelink_handler.js"
import { Clay } from "./render/core/clay.js";
import { BoxBuilder } from './render/geometry/box-builder.js';
import { PbrMaterial } from './render/materials/pbr.js';
import { setSketchchatSync } from './util/sketchchat_sync.js';
import { viveRawData3 } from "./data/viveRawData3.js";
window.wsport = 8447;
window.vr = false;
window.handtracking = true;
window.interactMode = 0;
window.model = 0;
// window.toioCmdPara = {"61": "220,150,0", "64":"190,250,0", "66":"190,150,0", "67":"220,250,0"};
// window.toioID = ["0", "64", "66", "67"];
// window.toioCmdPara = {"65": "220,150,0", "68":"190,250,0", "69":"190,150,0", "70":"220,250,0"};
window.toioID = ["0", "68", "69", "64"];
window.robotCarCmd = {"0": "0,0", "1": "0,0", "2": "0,0", "3": "0,0"};
window.robotCarID = ["0", "1", "2", "3"];
window.ctrlToio = false;

window.sendRecordedViveData = false;
let viveFrame = 0;

// If requested, use the polyfill to provide support for mobile devices
// and devices which only support WebVR.
import WebXRPolyfill from "./third-party/webxr-polyfill/build/webxr-polyfill.module.js";
import { updateObject } from "./util/object-sync.js";
import { updateHandtracking } from "./render/core/handtrackingInput.js";
if (QueryArgs.getBool("usePolyfill", true)) {
    let polyfill = new WebXRPolyfill();
}

import { scenesSetup } from "/js/handle_scenes.js";

// XR globals.
let xrButton = null;
let xrImmersiveRefSpace = null;
export let inlineViewerHelper = null;
let inputController = null;
let time = 0;

// WebGL scene globals.
let gl = null;
let renderer = null;

let radii = new Float32Array(25);
let positions = new Float32Array(16 * 25);
// Boxes
let boxes_left = [];
let boxes_right = [];
let boxes = { left: boxes_left, right: boxes_right };
let indexFingerBoxes = { left: null, right: null };
const defaultBoxColor = { r: 0.5, g: 0.5, b: 0.5 };
const leftBoxColor = { r: 1, g: 0, b: 1 };
const rightBoxColor = { r: 0, g: 1, b: 1 };
let interactionBox = null;
let leftInteractionBox = null;
let rightInteractionBox = null;
window.speech = "";
window.object = [];
 window.mySharedObj = [];
window.teamUIDs = [];
window.teamObj = {};
window.teamAvatar = {};
window.team = "team1";

import * as mtt from "../js/util/mtt/mtt.js"
mtt.init();

// RETURNS AN OBJECT WITH FIELDS:
//    near   : float
//    far    : float
//    texture: WebGLTexture

// To do occlusion:, just copy WebGLTexture into the WebGL frame buffer depth
// To see it working, look at any XR sample in Three.js (eg: ball shooter)

window.getDepthInformation = view => xrGLFactory.getDepthInformation(view);

window.parseSpeech = (pattern, action) => {
   let words = window.speech.toLowerCase().split(' ');
   let vars = [];
   let i = 0;
   let find = p => {
      if (typeof p == 'string')
         for ( ; i < words.length ; i++) {
            if (p == words[i])
               return;
         }
      else
         for ( ; i < words.length ; i++)
            for (let k = 0 ; k < p.length ; k++)
               if (p[k] == words[i]) {
                  vars.push(p[k]);
                  return;
               }
   }
   for (let n = 0 ; n < pattern.length ; n++)
      find(pattern[n]);
   if (i < words.length) {
      action(vars);
      window.speech = '';
   }
}


function initModels() {
    window.models = {};
    /*
        window.models["stereo"] = new Gltf2Node({
            url: "./media/gltf/stereo/stereo.gltf",
        });
        window.models["stereo"].visible = true;
        */
    // global.scene().addNode(window.models['stereo']);
}

global.scene().standingStats(true);
// global.scene().addNode(window.models['stereo']);

function createBoxPrimitive(r, g, b) {
    let boxBuilder = new BoxBuilder();
    boxBuilder.pushCube([0, 0, 0], 1);
    let boxPrimitive = boxBuilder.finishPrimitive(renderer);
    let boxMaterial = new PbrMaterial();
    boxMaterial.baseColorFactor.value = [r, g, b, 1];
    return renderer.createRenderPrimitive(boxPrimitive, boxMaterial);
}

function addBox(x, y, z, r, g, b, offset) {
    let boxRenderPrimitive = createBoxPrimitive(r, g, b);
    let boxNode = new Node();
    boxNode.addRenderPrimitive(boxRenderPrimitive);
    // Marks the node as one that needs to be checked when hit testing.
    boxNode.selectable = true;
    return boxNode;
}

function initHands() {
    for (const box of boxes_left) {
        global.scene().removeNode(box);
    }
    for (const box of boxes_right) {
        global.scene().removeNode(box);
    }
    boxes_left = [];
    boxes_right = [];
    boxes = { left: boxes_left, right: boxes_right };
    if (typeof XRHand !== 'undefined') {
        for (let i = 0; i <= 24; i++) {
            const r = .6 + Math.random() * .4;
            const g = .6 + Math.random() * .4;
            const b = .6 + Math.random() * .4;
            boxes_left.push(addBox(0, 0, 0, r, g, b));
            boxes_right.push(addBox(0, 0, 0, r, g, b));
        }
    }
    if (indexFingerBoxes.left) {
        global.scene().removeNode(indexFingerBoxes.left);
    }
    if (indexFingerBoxes.right) {
        global.scene().removeNode(indexFingerBoxes.right);
    }
    indexFingerBoxes.left = addBox(0, 0, 0, leftBoxColor.r, leftBoxColor.g, leftBoxColor.b);
    indexFingerBoxes.right = addBox(0, 0, 0, rightBoxColor.r, rightBoxColor.g, rightBoxColor.b);
}

function initAudioVolume() {
   window.audioVolume = 0;
   if (! window.audioContext) {
      let onSuccess = stream => {
         window.audioContext = new AudioContext();
         let mediaStreamSource = audioContext.createMediaStreamSource(stream);
         let scriptProcessor = audioContext.createScriptProcessor(2048,1,1);
         mediaStreamSource.connect(scriptProcessor);
         scriptProcessor.connect(audioContext.destination);
         scriptProcessor.onaudioprocess = e => {
            let amp = 0, data = e.inputBuffer.getChannelData(0);
            for (let i = 0 ; i < 2048 ; i++)
               amp += data[i] * data[i];
            audioVolume = Math.max(0, Math.min(1, Math.log(amp) / 3));
         }
      }
      navigator.mediaDevices.getUserMedia({video: false, audio: true})
                            .then(onSuccess)
                            .catch(err => console.log('error:', err));
   }
}

let recognition = null;
function initWebSpeech() {
    // if (! isSpeechRecognitionEnabled)
    //    return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        window.SpeechRecognition = SpeechRecognition;

        console.log("init web speech")
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        
        recognition.onresult = function(event) {
            var current = event.resultIndex;
            var transcript = event.results[current][0].transcript;
           // console.log(transcript);
            window.speech = transcript;
        };
        
        recognition.onspeechend = function() {
         // what you want to do when a sentence is end.
        }

        recognition.onend =  function() {
           //console.log('Speech recognition has stopped. Starting again ...');
            recognition.start();
        }

        recognition.onerror = function(event) {
           // console.log('Speech recognition error detected: ' + event.error);
           // console.log('Additional information: ' + event.message);
        }

        recognition.start();
      //  console.log('Ready to receive a speech command.');
    }
}


export function initXR() {
    xrButton = new WebXRButton({
        onRequestSession: onRequestSession,
        onEndSession: onEndSession,
    });
    global.setXREntry(xrButton);
    let pending = null;
    if (navigator.xr) {
        pending = navigator.xr.isSessionSupported("immersive-ar").then((supported) => {
            console.log("immersive-ar supported:[" + supported + "]");
            xrButton.enabled = supported;
            window.vr = supported;
            window.avatars[window.playerid].vr = window.vr;
            handTrackerInit();
            global.setIsImmersive(supported);
            initWebSpeech();
            navigator.xr.requestSession("inline").then(onSessionStarted);
        }).catch((err) => {
            navigator.xr.requestSession("inline").then(onSessionStarted);
            console.warn("immersive-ar not supported on this platform!");
        });

        // Load multiple audio sources.
        // loadAudioSources(global.scene());


    } else {
        handTrackerInit();
        initWebSpeech();
        console.warn("navigator.xr unavailable");
    }

    // window.objs = [];
    DefaultSystemEvents.init();
    // websocket
    // window.wsclient = new WSClient();
    // if (window.location.port) {
    //     window.wsclient.connect(window.location.hostname, window.location.port);
    // } else {
    //     window.wsclient.connect("eye.3dvar.com", window.wsport);
    // }
    // setToioSync();
    setRobotCarSync();
    // setAvatarSync();
    setObjSync();
    setSharedObjSync();
    // setPythonSync();
    // setSketchchatSync();
    if(window.sendRecordedViveData) setRecordedViveSync();
    initModels();
    keyboardInput.initKeyEvents();

    if (pending) {
        return pending;
    }
}

function setAvatarSync() {
    setInterval(function () {
        if (window.playerid != null) {
            var msg = corelink_message("avatar", window.playerid);
            corelink.send(metaroomSyncSender, msg);
            // console.log("corelink.send", msg);
            // window.wsclient.send("avatar", window.playerid);
        }
    }, 40);
}

function setRobotCarSync() {
    setInterval(function () {
        var robotCarCmd = { 
            "cmd" : [   
                        // {id: window.robotCarID[0], parameter: window.robotCarCmd[window.robotCarID[0]]},
                        {id: window.robotCarID[1], parameter: window.robotCarCmd[window.robotCarID[1]]},
                        {id: window.robotCarID[2], parameter: window.robotCarCmd[window.robotCarID[2]]},
                        {id: window.robotCarID[3], parameter: window.robotCarCmd[window.robotCarID[3]]},
            ]
        }; 
        var msg = corelink_message("robotCarCmd", robotCarCmd);
        corelink.send(metaroomSyncSender, msg);
    }, 23);
}

// function setToioSync() {
//     setInterval(function () {
//         var toioCmd = { 
//             "cmd" : [   {id: window.toioID[0], command: "moveTo", parameter: window.toioCmdPara[window.toioID[0]]},
//                         {id: window.toioID[1], command: "", parameter:  window.toioCmdPara[window.toioID[1]]},
//                         {id: window.toioID[2], command: "", parameter: window.toioCmdPara[window.toioID[2]]},
//                         {id: window.toioID[3], command: "", parameter:  window.toioCmdPara[window.toioID[3]]}
//                     ]
//         };
//         if(window.ctrlToio) {
//             var msg = corelink_message("toioCmd", toioCmd);
//             corelink.send(metaroomSyncSender, msg);
//         }
//     }, 40);
// }

function setObjSync() {
    setInterval(function () {
        var testJson = window.object; 
        var msg = corelink_message("object", testJson);
        corelink.send(metaroomInitSender, msg);
    }, 37);
}

function setSharedObjSync() {
    setInterval(function () {
        var objJson =  window.mySharedObj; 
        var headMat = [];
             for(let j = 0; j < 16; j ++) {
               headMat.push(window.avatars[window.playerid].headset.matrix[j])
             }
        var avatarJson = {
            "headset": headMat,
            "controllerMatrix": controllerMatrix,
            "buttonState": buttonState,
            "joyStickState": joyStickState,
            "VR": window.vr,
        }
        var json = {
            obj: objJson,
            avatar: avatarJson
        }
        var msg = corelink_message("sharedObj", json);
        if(window.playerid && window.localUuid) {
            corelink.send(metaroomSyncSender, msg);
        }
    }, 40);
}

function setPythonSync() {
    setInterval(function () {
        var testJson = window.pythonInfo; 
        var msg = corelink_message("object", testJson);
        corelink.send(metaroomInitSender, msg);
    }, 40);
}


function setRecordedViveSync() {
    setInterval(function () {
        var testJson = viveRawData3[viveFrame];
        viveFrame = (viveFrame + 1) % viveRawData3.length; 
        var msg = corelink_message("recordedSkeleton", testJson);
        corelink.send(metaroomInitSender, msg);
    }, 17);
}

window.testws = function () {
    window.wsclient.send("test");
};

function initGL() {
    if (gl) return;

    const glConfig = {
        xrCompatible: true,
        webgl2: true,
        alpha : false,
        depth : true,
        // enable when stencil buffer required
        //stencil : true,
        // makes sure not to throttle mobile devices, at cost of higher power consumption
        powerPreference : "high-performance",
    };

    if (window.gpuUseAlphaToCoverage) {
        glConfig.antialias = true;
    }

    gl = createWebGLContext(glConfig);

    document.body.appendChild(gl.canvas);
    window.canvas = gl.canvas;
    window.gl = gl;
    
    function onResize() {
        gl.canvas.width = gl.canvas.clientWidth * window.devicePixelRatio;
        gl.canvas.height = gl.canvas.clientHeight * window.devicePixelRatio;
    }
    window.addEventListener("resize", onResize);
    onResize();

    renderer = new Renderer(gl);
    global.scene().setRenderer(renderer);

    // Loads a generic controller meshes.
    global.scene().inputRenderer.setControllerMesh(
        new Gltf2Node({ url: "./media/gltf/controller/controller.gltf" }),
        "right"
    );
    global.scene().inputRenderer.setControllerMesh(
        new Gltf2Node({ url: "./media/gltf/controller/controller-left.gltf" }),
        "left"
    );

    global.setGPUCtx(gl);

    window.clay = new Clay(gl, gl.canvas);
    window.clay.addEventListenersToCanvas(gl.canvas);

    window.anidrawCanvas = document.getElementById('anidrawCanvas');
    window.anidraw = new Anidraw(anidrawCanvas);

    window.clay.renderingIsActive = !window.containsFlags(window.presentationMode, window.PRESENTATION_FLAG_NO_RENDER);
    
}

let isXRMode = false;
window.isXR = () => isXRMode;

function onRequestSession() {
    return navigator.xr
        .requestSession("immersive-ar", {
            requiredFeatures: ["local-floor"],
            optionalFeatures: ["hand-tracking", "mesh-detection", "depth-sensing"],
        })
        .then((session) => {
	    isXRMode = true;
            xrButton.setSession(session);
            session.isImmersive = true;
            onSessionStarted(session);
        });
}


window.xrRefSpace = null;
let xrSession = null;

window.xrGLFactory = null;

window.xrLayers = [];//0:glLayer, 1+: xrLayers
let xrLayerObjects = []; //0:null, 1+: xrLayers

async function onSessionStarted(session) {
    window.xrLayers = [];
    xrLayerObjects = [];
    xrLayerObjects.push(null);
    session.addEventListener("end", onSessionEnded);

    //session.updateTargetFrameRate(72);

    session.addEventListener('visibilitychange', e => {
        // remove hand controller while blurred
        if (e.session.visibilityState === 'visible-blurred') {
            for (const box of boxes['left']) {
                global.scene().removeNode(box);
            }
            for (const box of boxes['right']) {
                global.scene().removeNode(box);
            }
        }
    });


    //Each input source should define a primary action. A primary action (which will sometimes be shortened to "select action") is a platform-specific action which responds to the user manipulating it by delivering, in order, the events selectstart, select, and selectend. Each of these events is of type XRInputSourceEvent.
    session.addEventListener("selectstart", onSelectStart);
    session.addEventListener("selectend", onSelectEnd);
    session.addEventListener("select", (ev) => {
        let refSpace = ev.frame.session.isImmersive
            ? inputController.referenceSpace
            : inlineViewerHelper.referenceSpace;
        global.scene().handleSelect(ev.inputSource, ev.frame, refSpace);
    });

    initGL();
    initHands();
    initAudioVolume();
    await scenesSetup();
    // scene.inputRenderer.useProfileControllerMeshes(session);

    window.isLayersSuported = true;
    try {
        window.xrGLFactory = new XRWebGLBinding(session, gl);
    } catch (error) {
        window.isLayersSuported = false;
    }
    console.log("layers supported: " + window.isLayersSuported);

    let glLayer = new XRWebGLLayer(session, gl);
    if (window.isLayersSuported && session.isImmersive){
        window.xrGLFactory = new XRWebGLBinding(session, gl);
        window.xrLayers.push(glLayer);
        session.updateRenderState({
            layers: [glLayer]
        });
    }
    else
        session.updateRenderState({
            baseLayer: glLayer,
         //   inlineVerticalFieldOfView: .24
        });

    let refSpaceType = session.isImmersive ? "bounded-floor" : "viewer";
    window.insY = null;
    window.insXZ = null;
    window.insS = null;
    let onRequestRefSpace = (refSpace)=>{
        if (session.isImmersive) {
            inputController = new InputController(refSpace);
            xrImmersiveRefSpace = inputController.referenceSpace;
        } else {
            inlineViewerHelper = new InlineViewerHelper(gl.canvas, refSpace);
            inlineViewerHelper.setHeight(1.6);
        }

        xrRefSpace = refSpace;
        xrSession = session;
        window.session = session;

        if(refSpaceType == "bounded-floor"){

        }
        if(window.isLayersSuported){
            /*
        if(insY == null){
            addNewQuadLayerImage("../media/instruction/y.png",
            { x: 0.1, y: 1.5, z: -1.5 },
            { x: 0, y: 0, z: 0, w: 1 }, 
            { x: .25, y: .35 },
            (lo)=>{
                insY = lo;
                insY.layer.opacity = .5;
            });
        }
   
        if(insXZ == null){
            addNewQuadLayerImage("../media/instruction/xz.png",
            { x: 0.65, y: 1.5, z: -1.5 },
            { x: 0, y: 0, z: 0, w: 1 }, 
            { x: .3, y: .2 },
            (lo)=>{
               insXZ = lo;
               insXZ.layer.opacity = .5;
            });
        }
       
        if(insS == null){
            addNewQuadLayerImage("../media/instruction/s.png",
            { x: 1.3, y: 1.5, z: -1.5 },
            { x: 0, y: 0, z: 0, w: 1 }, 
            { x: .25, y: .25 },
            (lo)=>{
               insS = lo;
               insS.layer.opacity = .5;
            });
        }
       */
    }

        session.requestAnimationFrame(onXRFrame);
    }
    session.requestReferenceSpace(refSpaceType).then(onRequestRefSpace).catch(()=>{
        refSpaceType = "local-floor";
        session.requestReferenceSpace(refSpaceType).
        then(onRequestRefSpace);
    });
}


function onEndSession(session) {
    session.end();
    isXRMode = false;
}

function onSessionEnded(event) {
    if (event.session.isImmersive) {
        xrButton.setSession(null);

        // Stop the audio playback when we exit XR.
        // pauseAudio();
    }
}

//Layers
class LayerObject_Image{
    constructor(layer, img, pos, orient){
        this.layer = layer;
        this.img = img;
        this.pos = pos;
        this.orient = orient;
    }

    move(pos){
        this.pos = pos;
        this.layer.transform = new XRRigidTransform(this.pos, this.orient);
    }
}
export function addNewQuadLayerImage(src, pos, orient, scale, callback){
    if(!xrSession.isImmersive) return;
    let imageElement = document.createElement('img');
    imageElement.src = src;
    imageElement.onload = function () {
    
    let layer = window.xrGLFactory.createQuadLayer({
        space: xrRefSpace,
        viewPixelWidth: imageElement.width * (1/scale.x),
        viewPixelHeight: imageElement.height * (1/scale.y),
        layout: "mono",
      });
      layer.blendTextureSourceAlpha = true;
      layer.width = 1;
      layer.height = 1;
      layer.transform = new XRRigidTransform(pos, orient);

      let lo = new LayerObject_Image(layer, imageElement, pos, orient);
      window.xrLayers.push(layer);
      xrLayerObjects.push(lo);

      if(callback) callback(lo);

    xrSession.updateRenderState({ layers: window.xrLayers });
    }
}

export function addNewCylinderLayerImage(src, pos, orient, scale, callback){
    if(!xrSession.isImmersive) return;
    let imageElement = document.createElement('img');
    imageElement.src = src;
    imageElement.onload = function () {

    let layer = window.xrGLFactory.createCylinderLayer({
        space: xrRefSpace,
        viewPixelWidth: imageElement.width * (1/scale.x),
        viewPixelHeight: imageElement.height * (1/scale.y),
        layout: "mono",
      });
      layer.blendTextureSourceAlpha = true;
      layer.width = 1;
      layer.height = 1;
      layer.transform = new XRRigidTransform(pos, orient);
      layer.aspectRatio = imageElement.width/imageElement.height;
      layer.centralAngle = 120 * Math.PI / 180;
      layer.radius = 2;


      let lo = new LayerObject_Image(layer, imageElement, pos, orient);
      window.xrLayers.push(layer);
      xrLayerObjects.push(lo);

      if(callback) callback(lo);

    xrSession.updateRenderState({ layers: window.xrLayers });
    }
}

export function addNewEquirectLayerImage(src, pos, orient, scale, callback){
    if(!xrSession.isImmersive) return;
    let imageElement = document.createElement('img');
    imageElement.src = src;
    imageElement.onload = function () {

    let layer = window.xrGLFactory.createEquirectLayer({
        space: xrRefSpace,
        viewPixelWidth: imageElement.width * (1/scale.x),
        viewPixelHeight: imageElement.height * (1/scale.y),
        layout: "mono",
      });
      layer.blendTextureSourceAlpha = true;
      layer.width = 1;
      layer.height = 1;
      layer.transform = new XRRigidTransform(pos, orient);
      layer.centralHorizontalAngle = Math.PI*2;
      layer.upperVerticalAngle = Math.PI;
      layer.lowerVerticalAngle = -Math.PI;
      layer.radius = .5;


      let lo = new LayerObject_Image(layer, imageElement, pos, orient);
      window.xrLayers.push(layer);
      xrLayerObjects.push(lo);

      if(callback) callback(lo);

    xrSession.updateRenderState({ layers: window.xrLayers });
    }
}

export function removeLayerObject(lo){
    xrLayerObjects = xrLayerObjects.filter(item => item !== lo);
    window.xrLayers = window.xrLayers.filter(item => item !== lo.layer);
    xrSession.updateRenderState({ layers: window.xrLayers });
}



function updateInputSources(session, frame, refSpace) {

    for (let inputSource of session.inputSources) {
        let targetRayPose = frame.getPose(inputSource.targetRaySpace, refSpace);
        let offset = 0;

        // We may not get a pose back in cases where the input source has lost
        // tracking or does not know where it is relative to the given frame
        // of reference.
        if (!targetRayPose) {
            continue;
        }

        // If we have a pointer matrix we can also use it to render a cursor
        // for both handheld and gaze-based input sources.

        // Statically render the cursor 2 meters down the ray since we're
        // not calculating any intersections in this sample.
        let targetRay = new Ray(targetRayPose.transform);
        let cursorDistance = 2.0;
        let cursorPos = vec3.fromValues(
            targetRay.origin.x,
            targetRay.origin.y,
            targetRay.origin.z
        );
        vec3.add(cursorPos, cursorPos, [
            targetRay.direction.x * cursorDistance,
            targetRay.direction.y * cursorDistance,
            targetRay.direction.z * cursorDistance,
        ]);
        // vec3.transformMat4(cursorPos, cursorPos, inputPose.targetRay.transformMatrix);

        global.scene().inputRenderer.addCursor(cursorPos);
        if (inputSource.hand) {
            window.handtracking = true;
            for (const box of boxes[inputSource.handedness]) {
                global.scene().removeNode(box);
            }

            let pose = frame.getPose(inputSource.targetRaySpace, refSpace);
            if (pose === undefined) {
                console.log("no pose");
            }

            if (!frame.fillJointRadii(inputSource.hand.values(), radii)) {
                console.log("no fillJointRadii");
                continue;
            }
            if (!frame.fillPoses(inputSource.hand.values(), refSpace, positions)) {
                console.log("no fillPoses");
                continue;
            }
            const thisAvatar = window.avatars[window.playerid];
            for (const box of boxes[inputSource.handedness]) {
                // global.scene().addNode(box);
                let matrix = positions.slice(offset * 16, (offset + 1) * 16);
                let jointRadius = radii[offset];
                offset++;
                // mat4.getTranslation(box.translation, matrix);
                // mat4.getRotation(box.rotation, matrix);
                // box.scale = [jointRadius, jointRadius, jointRadius];
                updateHandtracking(thisAvatar, {
                    handedness: inputSource.handedness,
                    matrix: matrix,
                    index: offset,
                    scale: jointRadius,
                });
            }

            // // Render a special box for each index finger on each hand	
            // const indexFingerBox = indexFingerBoxes[inputSource.handedness];	
            // global.scene().addNode(indexFingerBox);	
            // let joint = inputSource.hand.get('index-finger-tip');	
            // let jointPose = frame.getJointPose(joint, xrImmersiveRefSpace);	
            // if (jointPose) {	
            //     let matrix = jointPose.transform.matrix;
            //     mat4.getTranslation(indexFingerBox.translation, matrix);
            //     mat4.getRotation(indexFingerBox.rotation, matrix);
            //     indexFingerBox.scale = [0.02, 0.02, 0.02];	
            // }
        } else if (inputSource.gripSpace) {
            window.handtracking = false;
            let gripPose = frame.getPose(inputSource.gripSpace, refSpace);
            if (gripPose) {
                // If we have a grip pose use it to render a mesh showing the
                // position of the controller.
                global.scene().inputRenderer.addController(
                    gripPose.transform.matrix,
                    inputSource.handedness
                ); // let controller = this._controllers[handedness]; // so it is updating actually
                // ZH: update location
                // if (window.playerid) {
                if (inputSource.handedness == "left") {
                    window.avatars[window.playerid].leftController.position =
                        gripPose.transform.position;
                    window.avatars[window.playerid].leftController.orientation =
                        gripPose.transform.orientation;
                    window.avatars[window.playerid].leftController.matrix =
                        gripPose.transform.matrix;
                } else if (inputSource.handedness == "right") {
                    window.avatars[window.playerid].rightController.position =
                        gripPose.transform.position;
                    window.avatars[window.playerid].rightController.orientation =
                        gripPose.transform.orientation;
                    window.avatars[window.playerid].rightController.matrix =
                        gripPose.transform.matrix;
                }
                // }
            }
        }
        let headPose = frame.getViewerPose(refSpace);
        // if (window.playerid) {
        window.avatars[window.playerid].headset.position =
            headPose.transform.position;
        window.avatars[window.playerid].headset.orientation =
            headPose.transform.orientation;
        window.avatars[window.playerid].headset.matrix =
            headPose.transform.matrix;

        for (let source of session.inputSources) {
            if (!window.handtracking && source.handedness && source.gamepad) {
                // if (source.gamepad.buttons[3].pressed) {
                //     console.log("source.gamepad.buttons[3].pressed", source.gamepad.buttons[3].pressed);
                // }
                // if (source.handedness == "left")
                //     window.avatars[window.playerid].leftController.updateButtons(source, source.gamepad.buttons);
                // if (source.handedness == "right")
                //     window.avatars[window.playerid].rightController.updateButtons(source, source.gamepad.buttons);
                // console.log("leftController", window.avatars[window.playerid].leftController);
                // console.log("rightController", window.avatars[window.playerid].rightController)
            }
        }
        // }
    }
}

function hitTest(inputSource, frame, refSpace) {
    let targetRayPose = frame.getPose(inputSource.targetRaySpace, refSpace);
    if (!targetRayPose) {
        return;
    }

    let hitResult = global.scene().hitTest(targetRayPose.transform);
    if (hitResult) {
        // for (let source of audioSources) {
        //     if (hitResult.node === source.node) {
        //         // Associate the input source with the audio source object until
        //         // onSelectEnd event is raised with the same input source.
        //         source.draggingInput = inputSource;
        //         source.draggingTransform = mat4.create();
        //         mat4.invert(source.draggingTransform, targetRayPose.transform.matrix);
        //         mat4.multiply(source.draggingTransform, source.draggingTransform, source.node.matrix);
        //         return true;
        //     }
        // }
        for (let id in window.objects) {
            if (hitResult.node === window.objects[id].node) {
                // Associate the input source with the audio source object until
                // onSelectEnd event is raised with the same input source.
                window.objects[id].draggingInput = inputSource;
                window.objects[id].draggingTransform = mat4.create();
                mat4.invert(
                    window.objects[id].draggingTransform,
                    targetRayPose.transform.matrix
                );
                mat4.multiply(
                    window.objects[id].draggingTransform,
                    window.objects[id].draggingTransform,
                    window.objects[id].node.matrix
                );
                updateObject(id);
                return true;
            }
        }
    }

    return false;
}

window.testObjSync = function (id) {
    mat4.translate(
        window.objects[id].node.matrix,
        window.objects[id].node.matrix,
        [0.2, 0.1, 0]
    );
    updateObject(id, window.objects[id].node.matrix);
};

function onSelectStart(ev) {
    let refSpace = ev.frame.session.isImmersive
        ? inputController.referenceSpace
        : inlineViewerHelper.referenceSpace;
    hitTest(ev.inputSource, ev.frame, refSpace);
}

// Remove any references to the input source from the audio sources so
// that the objects are not dragged any further after the user releases
// the trigger.
function onSelectEnd(ev) {
    // for (let source of audioSources) {
    //     if (source.draggingInput === ev.inputSource) {
    //         source.draggingInput = undefined;
    //         source.draggingTransform = undefined;
    //     }
    // }
    for (let id in window.objects) {
        if (window.objects[id].draggingInput === ev.inputSource) {
            // Associate the input source with the audio source object until
            // onSelectEnd event is raised with the same input source.
            window.objects[id].draggingInput = undefined;
            window.objects[id].draggingTransform = undefined;
        }
    }
}


function onXRFrame(t, frame) {
    if (! window.SpeechRecognition && isSpeechRecognitionEnabled)
       initWebSpeech();

    time = t / 1000;
    let session = frame.session;
    let refSpace = session.isImmersive
        ? inputController.referenceSpace
        : inlineViewerHelper.referenceSpace;
    let pose = frame.getViewerPose(refSpace);
    clay.pose = pose;

    window.session = session;
    window._latestXRFrame = frame;
    window._latestXRRefSpace = refSpace;


    session.requestAnimationFrame(onXRFrame);

    keyboardInput.updateKeyState();

    const deltaTime = global.scene().startFrame() / 1000.0;

    //MESH_DETECTION
    window.detectedMeshes = frame.detectedMeshes;

    if(window.isLayersSuported && session.isImmersive){

        for(let i = 1;i<xrLayerObjects.length;i++){
            let lo = xrLayerObjects[i];
            let layer = lo.layer;
            if (layer && layer.needsRedraw) {
                let glayer = window.xrGLFactory.getSubImage(layer, frame);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
                gl.activeTexture(gl.TEXTURE0 + i);
                gl.bindTexture(gl.TEXTURE_2D, glayer.colorTexture);
                gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, lo.img);
                gl.bindTexture(gl.TEXTURE_2D, null);
            }
        }
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    }


    updateInputSources(session, frame, refSpace);
    // ZH: send to websocket server for self avatar sync
    // if (window.playerid != null) window.wsclient.send("avatar", window.playerid);
    // corelink
    // if (window.playerid != null) {
    //     var msg = corelink_message("avatar", window.playerid);
    //     corelink.send(metaroomSyncSender, msg);
    //     // console.log("corelink.send", msg);
    //     // window.wsclient.send("avatar", window.playerid);
    // }
    // Update the position of all currently selected audio sources. It's
    // possible to select multiple audio sources and drag them at the same
    // time (one per controller that has the trigger held down).
    // updateAudioSources(frame, refSpace);

    // updateAudioNodes(global.scene());

    updateAvatars();

    // updateObjects();

    // ZH: save previous "source.gamepad.buttons" for two controllers,
    // check if changes per frame
    // send to the server if changes
    // if (window.playerid) {
    const thisAvatar = window.avatars[window.playerid];
    for (let source of session.inputSources) {
        if (source.handedness && source.gamepad) {
            updateController(thisAvatar, {
                handedness: source.handedness,
                buttons: source.gamepad.buttons,
                axes: source.gamepad.axes
            });
        }
    }
    // }

/*
    if (refSpace == inlineViewerHelper.referenceSpace) {
        inlineViewerHelper.deltaTime = deltaTime;
        inlineViewerHelper.update(deltaTime);
    }
*/
    global.scene().drawXRFrame(frame, pose, time);

    if (pose && resonance) {
        resonance.setListenerFromMatrix({ elements: pose.transform.matrix });
    }

    if (pose && resonanceScene) {
        resonanceScene.setListenerFromMatrix({ elements: pose.transform.matrix });
    }

    global.scene().endFrame();
}

function updateAvatars() {
    // update transformation of each avatar audio source
    // for (let peerUuid in window.peerConnections) {
    //     window.updateAvatarAudio(peerUuid);
    // }

    // update avatar's model's matrix
    for (let id in window.avatars) {
        let avatar = window.avatars[id];
        // avatar.leftController.model.visible = false;
        // avatar.rightController.model.visible = false;
        // if (id == window.playerid || (window.view && id == window.view.viewId)) avatar.headset.model.visible = false;
        // if(window.view && id == window.view.viewId) {
        //     avatar.leftController.model.visible = false;
        //     avatar.rightController.model.visible = false;
        // }
        if (
            avatar.headset.position.x ||
            avatar.headset.position.y ||
            avatar.headset.position.z
        )
         {
            
            // not in the default pos
            avatar.headset.model.matrix = avatar.headset.matrix;
            avatar.leftController.model.matrix = avatar.leftController.matrix;
            avatar.rightController.model.matrix = avatar.rightController.matrix;
        }
    }
}

function updateObjects() {
    // update objects' attributes
    for (let id in window.objects) {
        let type = window.objects[id]["type"];
        let matrix = window.objects[id]["matrix"];
        // create the model if model is null
        if (!window.objects[id].node && type in window.models) {
            // create the model, this is the sample by gltf model
            // we may need other model style like CG.js later
            window.objects[id].node = new Gltf2Node({
                url: window.models[type]._url,
            });
            window.objects[id].node.visible = true;
            window.objects[id].node.selectable = true;
            global.scene().addNode(window.objects[id].node);
        }
        window.objects[id].node.matrix = matrix;
    }
}

window.addProperties = (instance, setAction) => {
   instance._properties = {};
   instance.getProperty = name => instance._properties[name];
   instance.setProperty = (name, value) => {
      instance._properties[name] = value;
      if (setAction)
         setAction(name, value);
   }
}

// Start the XR application.
// initXR();
