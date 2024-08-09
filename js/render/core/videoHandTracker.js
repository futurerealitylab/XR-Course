import { HandSize } from "./handSize.js";
import * as cg from "./cg.js";

let hands = null;
let camera = null;
let isInit = false;

export function init(onFrameProc=null, onResultsProc=null) {
   console.log("init video hand tracking");
   window.handInfo = [];
   isInit = true;

   if (window.vr) {
      window.videoFromCamera = { width : 1, height : 1};
      return;
   }
   
   {
      videoElement.innerHTML = `
      <video id="videoFromCamera" autoplay="true"
             style="position:absolute;left:-1000px;"
             width=640 height=480></video>`;

      window.videoFromCamera = document.getElementById('videoFromCamera');
      window.videoFromCameraIsReady = false;
      if (navigator.mediaDevices.getUserMedia) {
        window.videoFromCamera.addEventListener('canplay', () => {
           console.log("video is ready");
           window.videoFromCameraIsReady = true;
        })
        navigator.mediaDevices.getUserMedia({ audio: false, video: true })
                 .then(function(stream) { videoFromCamera.srcObject = stream; },
                       function(error ) { console.log(error); });
      }
   }

   if(window.desktopHandtrackingEnabled && !window.desktopHandtrackingIsRemote) {
      const videoElement = window.videoFromCamera;


      function onResults(results) {
         window.handInfo = [];
         if (results.multiHandLandmarks) {
            let handNum = results.multiHandLandmarks.length;
            for (let i = 0; i < handNum; i ++) {
               window.handInfo.push({  
                                      handedness: results.multiHandedness[i], 
                                      landmarks: results.multiHandLandmarks[i],
                                      // worldLandmarks: results.multiHandWorldLandmarks[i], 
                                    })
            }
            if (onResultsProc) {
               onResultsProc(window.handInfo, results);
            }
         }
      }

      hands = new Hands({locateFile: (file) => {
         return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }});
      hands.setOptions({
         maxNumHands: 2,
         modelComplexity: 0,
         minDetectionConfidence: 0.5,
         minTrackingConfidence: 0.5
      });
      hands.onResults(onResults);


      
      if (onFrameProc == null) {
         onFrameProc = async (hands, videoElement) => {
            return hands.send({image: videoElement});
         };
      }
      console.log("video: dimensions=[" + videoElement.width.toString() + ", " + videoElement.height.toString() + "]");
      camera = new Camera(videoElement, {
         onFrame : async () => {
            if (!window.shouldUseHandtracking()) {
               return;
            }
            
            await onFrameProc(hands, videoElement);
         },
         width: 1280//videoElement.width
         ,
         height: 720//videoElement.height
      });
      camera.start();
   }
}

function VideoHandTracker() {
   this.jointMatrix = (i,j) => joint[i][j].matrix;
   this.getHandSize = hand => size[hand == 'left' ? 0 : 1];
   this.getJointMatrix = (hand,finger,j) => joint[hand == 'left' ? 0 : 1][F2G[5*finger+j]].matrix;

   let F2G = [0,1,2,3,4, 0,5,6,7,8, 0,9,10,11,12, 0,13,14,15,16, 0,17,18,19,20 ];
   let G2F = [0,1,2,3,4,  6,7,8,9,  11,12,13,14,  16,17,18,19,  21,22,23,24 ];

   let isHand = [false,false];
   let joint = [[],[]];
   let px = null, py = null;
   let size = [1,1];
   let matrix = cg.mIdentity();
   let handSize = new HandSize();
   let isMirror = true;

   for (let h = 0 ; h < 2 ; h++)
      for (let j = 0 ; j < 21 ; j++)
         joint[h][j] = { matrix: cg.mIdentity(),
                         detected: false,
                         position: [0,0,0] };

   this.setMirror = state => isMirror = state;

   this.update = () => {
      if (isInit && ! window.vr && window.shouldUseHandtracking()) {
         matrix = cg.mInverse(views[0]._viewMatrix);
         matrix = cg.mMultiply(matrix, cg.mTranslate(0,0,-1));
         matrix = cg.mMultiply(matrix, cg.mRotateZ(Math.PI));
         matrix = cg.mMultiply(matrix, cg.mScale(.432,.319,1));

         isHand[0] = isHand[1] = false;
         for (let i = 0; i < window.handInfo.length; i++) {

            // IS THIS THE LEFT HAND OR THE RIGHT HAND?

            let dx = window.handInfo[i].landmarks[4].x - window.handInfo[i].landmarks[20].x;
            let h = dx < 0 ? 0 : 1;

            isHand[h] = true;
            for (let j = 0 ; j < 21 ; j++) {
               joint[h][j].detected = true;
               joint[h][j].position = [window.handInfo[i].landmarks[j].x-.5,
                                       window.handInfo[i].landmarks[j].y-.5,
                                      window.handInfo[i].landmarks[j].z-.2];
            } 
         } 

         for (let h = 0 ; h < 2 ; h++) {
            let pose = [];
            for (let j = 0 ; j < 21 ; j++)
               pose.push(joint[h][j].position);

            let s = handSize.compute(pose);
            if (! isMirror) {
               size[h] = .8 * size[h] + .2 / Math.sqrt(s);
               s = .5 * size[h] * size[h] * size[h];
               for (let j = 0 ; j < 21 ; j++) {
                  joint[h][j].position[0] *= s;
                  joint[h][j].position[1] *= s;
                  joint[h][j].position[2] *= s;
               }
            }
            else
               size[h] = s;

            for (let j = 0 ; j < 21 ; j++) {
               let p = joint[h][j].position;
               joint[h][j].matrix = cg.mTranslate(p[0], p[1], -p[2]);
            }

            for (let j = 0 ; j < 21 ; j++) {
               let k = G2F[j] % 5;
               let j1 = k < 4 ? j+1 : j;
               let j0 = j1 - (k == 2 || k == 3 ? 2 : 1);
               if (j == 0) { j0 = 0; j1 = 9; }

               let a = joint[h][j0].position;
               let b = joint[h][j1].position;
               let d = [ b[0] - a[0], b[1] - a[1], a[2] - b[2] ];

               let m = joint[h][j].matrix;
               m = cg.mMultiply(m, cg.mAimZ(d));
               m = cg.mMultiply(m, cg.mScale(joint[h][j].detected ? j==0 ? [.02,.026,.026]
                                                                         : [.01,.013,.013] : 0));
               joint[h][j].matrix = cg.mMultiply(matrix,
                                    cg.mMultiply(m, cg.mScale(! isMirror ? .5 * size[h] * size[h]
                                                                         : 1.5 * size[h])));
            }
         }

         // IF EXACTLY ONE HAND IS VISIBLE, USE FOREFINGER AS A 2D CURSOR

         if (isHand[0] != isHand[1]) {
            let m = joint[isHand[0] ? 0 : 1][8].matrix;
            let x = m[12]*-3200+640;
            let y = m[13]*-3200+5530;
            if (px == null) { px = x; py = y; }
            px = .5 * px + .5 * x;
            py = .5 * py + .5 * y;
            anidraw.setTimelineInteractive(false);
            anidraw.mousemove({x:px, y:py});
            anidraw.setTimelineInteractive(true);
         }

         // IF A HAND IS NOT RETURNING ANY DATA, DO NOT DISPLAY IT

         for (let h = 0 ; h < 2 ; h++)
            if (! isHand[h])
               for (let j = 0 ; j < 21 ; j++)
                  joint[h][j].matrix = [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];
      }
   }

   let currentHandSize;

   let d3 = (a,b) => { 
      let x = b[0] - a[0], 
          y = b[1] - a[1],
          z = b[1] - a[1]; 
      return Math.sqrt(x*x + y*y + z*z) / currentHandSize;
   } 

   this.getHandPose = hand => {
      if (! isHand[hand == 'left' ? 0 : 1])
         return '';

      currentHandSize = this.getHandSize(hand);

      let P = this.getJointMatrix(hand, 0, 0).slice(12,15);
      let F = [];
      for (let f = 0 ; f < 5 ; f++)
         F.push(this.getJointMatrix(hand, f, 4).slice(12,15));

      let pose;
      if (d3(P,F[1]) > d3(P,F[2]) + .04)
         pose = d3(F[0],F[4]) > .115 ? 'L' : 'point';
      else if (d3(P,F[1]) < .1 && d3(F[0],F[4]) > .115)
         pose = 'thumb';
      else if (d3(F[0],F[1]) < .04)
         pose = 'pinch';
      else {
         let u = d3(F[0],F[4]) / .16;
         let v = d3(P,F[2]) / .17;
         pose = cg.round((u - .4) / .6) + ' ' + cg.round((v - .3) / .7);
      }

      return pose;
   }

   this.getFingerTouches = () => {
      if (! isHand[0] || ! isHand[1])
         return '';

      let L = [], R = [];
      for (let f = 0 ; f < 5 ; f++) {
         L.push(this.getJointMatrix('left' , f, 4).slice(12,15));
         R.push(this.getJointMatrix('right', f, 4).slice(12,15));
      }

      currentHandSize = (this.getHandSize('left') + this.getHandSize('right')) / 2;

      let T = {};

      let pose = '';
      for (let i = 0 ; i < 5 ; i++)
      for (let j = 0 ; j < 5 ; j++)
         if (d3(L[i],R[j]) < .04 && ! T[i+','+j]) {
            T[i+','+j] = true;
            pose += i + '-' + j + ' ';
         }
      return pose;
   }
}

export let videoHandTracker = new VideoHandTracker();
