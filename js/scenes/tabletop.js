import * as cg from "../render/core/cg.js";
import { moleculeNames, addMolecule } from "../render/core/molecules.js";
import { RobotPicker } from "../render/core/robotPicker.js";
import { Wheelie } from "../render/core/wheelie.js";
import { controllerMatrix } from "../render/core/controllerInput.js";
import { G2 } from "../util/g2.js";
import * as global from "../global.js";
import { Gltf2Node } from "../render/nodes/gltf2.js";


// load gltf model
// let flower = new Gltf2Node({ url: './media/gltf/sunflower/sunflower.gltf' });
// let buddha = new Gltf2Node({ url: './media/gltf/buddha_statue_broken/scene.gltf' });

let roomSolid = new Gltf2Node({ url: './media/gltf/60_fifth_ave/60_fifth_ave.gltf' , alpha: 1});
let roomClear = new Gltf2Node({ url: './media/gltf/60_fifth_ave/60_fifth_ave.gltf' , alpha: .3});
let tableRange = 1;
let isInTableRange = false;

//FLAGS
let enableMenu = false;



// INITIALIZE THE MODEL

// INITIALIZE PEER TO PEER COMMUNICATION

if (! window.peer) {
   window.peer = new Peer();
   window.conns = {};
   window.peer.on('disconnected', () => window.peer.reconnect());
   window.peer.on('open', () =>
      document.getElementById('connection-status').innerHTML = "Connected to wizard"
   )
}

// INITIALIZE AUDIO VOLUME DETECTION

window.isSpeaking = false;
if (! window.audioContext) {
   let onSuccess = stream => {
      window.audioContext = new AudioContext();
      let mediaStreamSource = audioContext.createMediaStreamSource(stream);
      let scriptProcessor = audioContext.createScriptProcessor(2048,1,1);
      mediaStreamSource.connect(scriptProcessor);
      scriptProcessor.connect(audioContext.destination);
      scriptProcessor.onaudioprocess = e => {
         let amplitude = 0, data = e.inputBuffer.getChannelData(0);
         for (let i = 0 ; i < 2048 ; i++)
            amplitude += data[i] * data[i];
         window.isSpeaking = amplitude > .5;
      }
   }
   navigator.mediaDevices.getUserMedia({video: false, audio: true})
                         .then(onSuccess)
                         .catch(err => console.log('error:', err));
}

window.tabletopStates = {};


export const init = async model => {

   let largeObjRoot = model.add();
   // // add gltf model to scene
   // // flower.translation = [0, 1.16, 0]; // 1.16 is pedestal height
   // flower.scale = [0.1, 0.1, 0.1];
   // buddha.scale = [0.5, 0.5, 0.5];
   // global.gltfRoot.addNode(flower);
   // global.gltfRoot.addNode(buddha);

   roomSolid.translation = [0,0,0];
   roomClear.translation = [0,0,0];
   global.gltfRoot.addNode(roomSolid);
   global.gltfRoot.addNode(roomClear);


   server.neverLoadOrSave();
   console.log('running init');
   document.getElementById('active-demo').innerHTML = "Tabletop demo active";
   const onConnection = (dataConnection) => {
      window.conns[dataConnection.peer] = {
         open: false,
         conn: dataConnection,
         avatar: null,
      }
      dataConnection.on('open', () => {
         window.conns[dataConnection.peer].open = true;
         window.conns[dataConnection.peer].avatar = createP2PAvatar();
      })
      dataConnection.on('close', () => {
         avatarRoot.remove(window.conns[dataConnection.peer].avatar);
         delete window.conns[dataConnection.peer];
      })
      dataConnection.on('data', (data) => {
         if (data.toString() === 'hello') {
            console.log('received hello');
            return;
         }
         const avatar = window.conns[dataConnection.peer].avatar;
         avatar.ignore = !showAvatars;
         if (showAvatars) {
            avatar.identity();
            avatar.scale(1);
            let headMatrix      = unpackMatrix(data[0]);
            let leftHandMatrix  = unpackMatrix(data[1]);
            let rightHandMatrix = unpackMatrix(data[2]);
            headMatrix      = cg.mMultiply(headMatrix     , cg.mRotateY(Math.PI));
            leftHandMatrix  = cg.mMultiply(leftHandMatrix , cg.mRotateY(Math.PI));
            rightHandMatrix = cg.mMultiply(rightHandMatrix, cg.mRotateY(Math.PI));
            setAvatarMatrices(avatar, headMatrix, leftHandMatrix, rightHandMatrix);
         }
      })
   }
   window.peer.on('connection', onConnection);

   // DECLARE VARIABLES

   const canvasRadius = 350, objScale = .45 * thingsScale,
         inch = .0254, tableRadius = .374;
   let HP = { left: [0,0,0], right: [0,0,0] }, headAim = [0,0,0];
   let isPressed = {left: false, right: false};
   let wasSpeaking = false;
   let compassDirection = 0;
   let showText = true;
   let showMirrorAvatar = false;
   let showAvatars = false;
   let showRobot = false;
   let showWheelie = false;
   let wheelies = {};
   let blinkTime = 0;
   let avatars = {};
   let agents = {};
   let displayTrackedObjects = false;
   let mirrorAvatar;
   let print3D = true;
   let Lb = 0, Rb = 0;

   //CENTER OFFSET FOR CERTAIN TRACKED OBJECTS
   let track_obj_offset = {table : [-0, -0.9, 0.2], round: [-0.2, -0.9, 0.1], chair: [-0.1, -1.35, 0.5], bigtable: [0.05, -1.35, 0.2]};


   // TRANSFORM BETWEEN 2D CANVAS POSITION AND 3D WORLD COORDS

   let xf  = t => (t - canvasWidth/2) / (canvasWidth/2) * .45;
   let ixf = t => Math.max(-999, Math.min(999, t / .45 * canvasWidth/2 + canvasWidth/2 + .5 >> 0));

   // CREATE ALL THE 3D VIEW OBJECTS

   let objs = model.add().turnZ(.0).move(0,tableHeight,0).scale(objScale);
   for (let n = 0 ; n < 100 ; n++)
      objs.add();

   let robot = new RobotPicker(model, [0,tableHeight,0], .55, .45);
   robot.root.ignore = ! showRobot;
/*
   let wheelie = new Wheelie(model, [0,tableHeight,0]);
   wheelie.root.ignore = ! showWheelie;
*/


   // CREATE AVATARS

   let avatarRoot = model.add();

   const createP2PAvatar = () => {
      let avatar = model.add();
      let head      = avatar.add();
      let eyes      = avatar.add();
      let leftHand  = avatar.add();
      let rightHand = avatar.add();
      head.add('cube' ).scale(.1).scale(.95,1.2,.8);
      eyes.add('tubeZ').scale(.1).move(-.42,.3,.8).scale(.2,.2,.001).color('black').dull();
      eyes.add('tubeZ').scale(.1).move( .42,.3,.8).scale(.2,.2,.001).color('black').dull();
      leftHand.add('cube').scale(.015,.02,.05);
      leftHand.add('sphere').move( .01,-.04,.08).scale(.02).color(.48,.36,.27).dull();
      rightHand.add('cube').scale(.015,.02,.05);
      rightHand.add('sphere').move(-.01,-.04,.08).scale(.02).color(.48,.36,.27).dull();
      return avatar;
   }

   let createAvatar = id => {
      let avatar = avatarRoot.add();
      avatars[id] = avatar;

      let head      = avatar.add();
      let eyes      = avatar.add();
      let leftHand  = avatar.add();
      let rightHand = avatar.add();

      head.add('cube' ).scale(.1).scale(.95,1.2,.8);

      eyes.add('tubeZ').scale(.1).move(-.42,.3,.8).scale(.2,.2,.001).color('black').dull();
      eyes.add('tubeZ').scale(.1).move( .42,.3,.8).scale(.2,.2,.001).color('black').dull();

      leftHand.add('cube').scale(.015,.02,.05);
      leftHand.add('sphere').move( .01,-.04,.08).scale(.02).color(.48,.36,.27).dull();

      rightHand.add('cube').scale(.015,.02,.05);
      rightHand.add('sphere').move(-.01,-.04,.08).scale(.02).color(.48,.36,.27).dull();

      return avatar;
   }

   let setAvatarMatrices = (avatar, headMatrix, leftHandMatrix, rightHandMatrix) => {
      avatar.child(0).setMatrix(headMatrix);
      avatar.child(1).setMatrix(headMatrix);
      avatar.child(2).setMatrix(leftHandMatrix);
      avatar.child(3).setMatrix(rightHandMatrix);

      if (avatar.blinkTime === undefined)
         avatar.blinkTime = 0;
      if (model.time > avatar.blinkTime)
         avatar.blinkTime = model.time + 3 + 1.5 * Math.random();
      if (avatar.blinkTime - model.time < .1)
         avatar.child(1).scale(0);
   }

   // CREATE THE TABLETOP 2D DISPLAY
   let tableRangeDisplayColor = [1,1,.4];
   model.add('cube').move(tableRange, 0, 0).scale(.01,.01,tableRange).color(tableRangeDisplayColor).opacity(.5);
   model.add('cube').move(-tableRange, 0, 0).scale(.01,.01,tableRange).color(tableRangeDisplayColor).opacity(.5);
   model.add('cube').move(0, 0, tableRange).scale(tableRange,.01,.01).color(tableRangeDisplayColor).opacity(.5);
   model.add('cube').move(0, 0, -tableRange).scale(tableRange,.01,.01).color(tableRangeDisplayColor).opacity(.5);

   // TEXTURE FUNCTION
   let g2 = new G2();
   let X = x => .5 + .5 * x / tableRadius;
   let Y = y => .5 - .5 * y / tableRadius;

   g2.setColor('#00000080');
   g2.fillOval(0,0,1,1);

   if (showText && tabletopStates.speech) {
      g2.setColor('black');
      g2.lineWidth(.001);
      g2.textHeight(.02);
      g2.fillText(tabletopStates.speech, .5, .5, 'center', compassDirection * .63);
   }

   // DRAW SHADOWS ON THE TABLE OF THE CONTROLLER POSITIONS

   let lr = isPressed.left ? .015 : .02;
   let L = HP.left;
   g2.setColor(isPressed.left ? '#000000b0' : '#00000080');
   g2.fillOval(X(L[0]) - lr , Y(L[2]) - lr , 2*lr , 2*lr );

   if (handPos.left[1] < tableHeight + .1) {
      g2.setColor(isPressed.left ? '#000000' : '#000000a0');
      g2.fillOval(X(L[0]) - .2*lr , Y(L[2]) - .2*lr , .4*lr , .4*lr );
   }

   let R = HP.right;
   let rr = isPressed.right ? .015 : .02;
   g2.setColor(isPressed.right ? '#000000b0' : '#00000040');
   g2.fillOval(X(R[0]) - rr , Y(R[2]) - rr , 2*rr , 2*rr );

   if (handPos.right[1] < tableHeight + .1) {
      g2.setColor(isPressed.right ? '#000000' : '#00000040');
      g2.fillOval(X(R[0]) - .2*rr , Y(R[2]) - .2*rr , .4*rr , .4*rr );
   }

   // DRAW CROSSHAIRS ON THE TABLE SHOWING THE HEAD GAZE

   let A = headAim;
   g2.setColor('#00000080');
   g2.fillRect(X(A[0]) - .002, Y(A[2]) - .02 , .004, .04 );
   g2.fillRect(X(A[0]) - .02 , Y(A[2]) - .002, .04 , .004);

   // SHOW ANY DRAWINGS

   if (tabletopStates.drawings) {
      let context = g2.getContext();
      g2.lineWidth(.003);
      context.save();
         context.setLineDash([3*1.4,9*1.4]);
         context.lineCap = 'square';
         for (let id in tabletopStates.drawings) {
            let drawing = tabletopStates.drawings[id];

            let isFocus = false;
            for (let id in drawing.ids)
                  isFocus ||= id == clientID;
            g2.setColor(isFocus ? '#00000090' : 'black');

            let strokes = drawing.strokes;
            for (let i = 0 ; i < strokes.length ; i++) {
               let stroke = strokes[i];
               let X = k => stroke[k]/canvasWidth,
                   Y = k => 1 - stroke[k+1]/canvasWidth;
               let path = [];
               for (let k = 0 ; k < stroke.length ; k += 2)
                  path.push([X(k), Y(k)]);
               g2.drawPath(path);
               g2.fillOval(X(0) - .0045, Y(0) - .0045, .009, .009);
            }
         }
      context.restore();
   }

   model.txtrSrc(3, g2.getCanvas());


   let table = model.add('ringY').move(0,tableHeight,0)
                                .turnY(Math.PI)
                                .scale(tableRadius,tableRadius,tableRadius)
                                .color(1,1,1)
                                .txtr(3);

   // HANDLE THE HEADS-UP OPTIONS MENU

   let menuHint = false, menuShow = false, menuChoice = -1;

   let menuItems = 'Hide text,Show mirror,Show avatars,Show robot,Show wheelie,,,,,'.split(',');

   let toggleText = () => {
      showText = ! showText;
      menuItems[0] = showText ? 'Hide text' : 'Show text';
   }

   let toggleMirror = () => {
      showMirrorAvatar = ! showMirrorAvatar;
      menuItems[1] = showMirrorAvatar ? 'Hide mirror' : 'Show mirror';
   }

   let toggleAvatars = () => {
      showAvatars = ! showAvatars;
      menuItems[2] = showAvatars ? 'Hide avatars' : 'Show avatars';
   }

   let toggleRobot = () => {
      showRobot = ! showRobot;
      menuItems[3] = showRobot ? 'Hide robot' : 'Show robot';
      robot.root.ignore = ! showRobot;
   }

   let toggleWheelie = () => {
      showWheelie = ! showWheelie;
      menuItems[4] = showWheelie ? 'Hide wheelie' : 'Show wheelie';
   }

   let menuAction = () => {
      switch (menuChoice) {
      case 0 : toggleText()   ; break;
      case 1 : toggleMirror() ; break;
      case 2 : toggleAvatars(); break;
      case 3 : toggleRobot()  ; break;
      case 4 : toggleWheelie(); break;
      default:                  break;
      }
   }

   let menu = model.add('cubeXZ')
                   .color(1,1,1).dull()
                   .texture(() => {
      if (menuShow) {
         let M = cg.mMultiply(clay.inverseRootMatrix, clay.root().inverseViewMatrix(0));
         menuChoice = 30 * M[9] >> 0;
         g2.setColor('#00a0ffa0');
         g2.fillRect(0,0,1,1,.1);
         g2.lineWidth(.002);
         g2.textHeight(.09);
         for (let n = 0 ; n < menuItems.length ; n++) {
            g2.setColor(n == menuChoice ? 'white' : 'black');
            g2.fillText(menuItems[n], .5, .92-.09*n, 'center');
         }
      }
      else if (menuHint) {
         g2.setColor('#00a0ff');
         g2.textHeight(.22);
         g2.fillText('PRESS'  , .5, .89, 'center');
         g2.fillText('TRIGGER', .5, .62, 'center');
         g2.fillText('TO SEE' , .5, .35, 'center');
         g2.fillText('OPTIONS', .5, .08, 'center');
      }
   });

   let menuRender = () => {
      let M0 = cg.mMultiply(clay.inverseRootMatrix, clay.root().inverseViewMatrix(0));
      let M1 = cg.mMultiply(clay.inverseRootMatrix, clay.root().inverseViewMatrix(1));
      menu.identity().move( (M0[12] + M1[12])/2,
                            (M0[13] + M1[13])/2 + .04 * M0[9] - .05,
                            (M0[14] + M1[14])/2 )
                     .turnY(Math.atan2(M0[8] + M1[8], M0[10] + M1[10]))
                     .move(0,0,-.3)
                     .scale(menuShow ? .07 : menuHint ? .03 : 0,
                            menuShow ? .07 : menuHint ? .03 : 0, .00001);      
   }

   // DETERMINE WHETHER A POINT IS OVER THE TABLE

   let isOnTable = p => cg.norm([p[0],0,p[2]]) < tableRadius;

   let handPos = { left: [0,0,0], right: [0,0,0] };

   // SEND AN EVENT TO THE MODEL

   let sendEvent = (part, p, type) => {
      if (part == 'left' || part == 'right')
         isPressed[part] = type=='press' || type=='drag';
      if (window.wizardConn && window.wizardConn.open)
         window.wizardConn.send({ op    : 'event',
                                  client: clientID,
                                  part  : part,
                                  event : { x: ixf(p[0]), y: ixf(p[2]), type: type,
				            b: part=='left' ? Lb : part=='right' ? Rb : 0 } });
      switch (type) {
      case 'move':
         if (part == 'left' || part == 'right') {
            handPos[part] = p;
            if(enableMenu)
               menuHint = ! isOnTable(handPos.left) && ! isOnTable(handPos.right);
            else
               menuHint = false;
         }
         break;
      case 'press':
         if (menuHint && enableMenu)
            menuShow = true;
         break;
      case 'release':
         if (menuShow && enableMenu)
            menuAction();
         menuShow = false;
         break;
      }
      menu.ignore = ! menuHint && ! menuShow || !enableMenu;
   }

   // ON HAND EVENTS, UPDATE MY HAND STATE TO THE MODEL

   inputEvents.onMove    = hand => sendEvent(hand, HP[hand] = inputEvents.pos(hand), 'move'   );
   inputEvents.onPress   = hand => sendEvent(hand, HP[hand] = inputEvents.pos(hand), 'press'  );
   inputEvents.onDrag    = hand => sendEvent(hand, HP[hand] = inputEvents.pos(hand), 'drag'   );
   inputEvents.onRelease = hand => sendEvent(hand, HP[hand] = inputEvents.pos(hand), 'release');
   inputEvents.onDoublePress   = hand => sendEvent(hand, HP[hand] = inputEvents.pos(hand), 'doublepress'  );
   
   // REMOVE A VIEWABLE 3D OBJECT

   let removeObject = id => {
      let obj = objs.child(id);
      while (obj.nChildren() > 0)
         obj.remove(0);
   }

   function lerp(a, b, t) {
      return a + (b - a) * t;
   }

   // BUILD A VIEWABLE 3D OBJECT FROM ITS OBJECT MODEL,
   // CREATING BOTH THE OBJECT AND ITS BELOW-THE-TABLE MIRROR IMAGE.

   let buildObject = (id, objInfo, focus) => {

      let isInFocus = false;
      if (focus)
         for (let part in focus)
            if (id == focus[part])
               isInFocus = true;

      removeObject(id);
      let thing = things[objInfo.type];
      let obj = objs.child(id);
      let isGltf = groups.gltf && groups.gltf.hasOwnProperty(objInfo.type);
      if (thing.items.length == 0 && !isGltf) {
         addMolecule(obj, objInfo.type).move(xf(objInfo.x)/objScale,.45/objScale,xf(objInfo.y)/objScale)
                                       .turnY(objInfo.angle * Math.PI/180)
                                       .opacity(isInFocus ? .7 : 1);
         return;
      }

      // if(objInfo.type == "flower") {
      //    flower.translation = [xf(objInfo.x)/1,tableHeight,xf(objInfo.y)/1];
      //    return;
      // }
      // if(objInfo.type == "buddha") {
      //    buddha.translation = [xf(objInfo.x)/1,tableHeight,xf(objInfo.y)/1];
      //    return;
      // }

      // IF OBJECT'S FORM DOESN'T EXIST, CREATE IT (AND ITS REFLECTION)

      // let form = objInfo.type;
      // if (! clay.formMesh(form)) {
      //    let temp = model.add();
      //    for (let n = 0 ; n < thing.items.length ; n++) {
      //       let item = thing.items[n];
      //       temp.add(item.type).move(item.m).scale(item.s).color(item.c ? item.c : [1,1,1]);
      //    }
      //    temp.newForm(form);
      //    model.remove(temp);
      // }

      // // INSTANTIATE OBJECT AND ITS REFLECTION

      // // miniature objects
      // obj.add(objInfo.type).opacity((isInFocus ? .8 : .9) * lerp(1, 0, (objInfo.z/objScale + track_obj_offset[objInfo.type][1])/2));
      for (let k = 0 ; k < 1 ; k++) { // disabled large object rendering for now because it is buggy
         let form = objInfo.type;
         if (! clay.formMesh(form)) {
            let temp = model.add();
            for (let n = 0 ; n < thing.items.length ; n++) {
               let item = thing.items[n];
               let m = item.m.slice();
               let scale = k == 1 ? 5 : 1;
// changed reflection rendering to large size object for quick demo
               temp.add(item.type).move( k==1 ? (m[0] + 3) : m[0], k==1 ? (m[1] - 1.5) : m[1], m[2])
                                  .turnX(Math.PI * k)
                                  .scale(item.s[0] * scale, item.s[1] * scale, item.s[2] * scale)
                                  .color(item.c ? item.c : [1,1,1]);
            }
            temp.newForm(form);
            model.remove(temp);
         }


      }

      // INSTANTIATE OBJECT AND ITS REFLECTION

      if(objInfo.trackedId < 0)
         obj.add(objInfo.type).opacity(.85);
      else
         obj.add(objInfo.type).opacity(tabletopStates.flags?.5:.001);
      if(objInfo.trackedId > 0) {
         let offset = track_obj_offset[objInfo.type];
         let m = cg.mFromQuaternion(objInfo.quaternion);
         m[12] = xf(objInfo.x)/objScale + offset[0];
         m[13] = objInfo.z/objScale + offset[1];
         m[14] = xf(objInfo.y)/objScale + offset[2]; // cg.hexToRgba(objInfo.color)
         obj.setMatrix(m).color(cg.hexToRgba(objInfo.color));//.text(objInfo.type, 0.2);
      } else {
         obj.identity()
         .move(xf(objInfo.x)/objScale, objInfo.z/objScale, xf(objInfo.y)/objScale)
         .turnY(objInfo.angle * Math.PI/180)
         .color(cg.hexToRgba(objInfo.color));
      }

      // room scale objects
      // let largeScale = 5;
      
      let largeObj = largeObjRoot.add(objInfo.type).opacity(0.9);
      if(objInfo.trackedId > 0) {
         let offset = track_obj_offset[objInfo.type];
         let m = cg.mFromQuaternion(objInfo.quaternion);
         m[12] = xf(objInfo.x)/objScale + offset[0];
         m[13] = objInfo.z/objScale + offset[1];
         m[14] = xf(objInfo.y)/objScale + offset[2];
         largeObj.setMatrix(m).color(cg.hexToRgba(objInfo.color))
         .opacity(.75);
      } else {
         largeObj.identity()
         .move(xf(objInfo.x)/objScale, objInfo.z/objScale, xf(objInfo.y)/objScale)
         .turnY(objInfo.angle * Math.PI/180)
         .color(cg.hexToRgba(objInfo.color))
         .opacity(.75);
      }
      largeObjRoot.identity().turnZ(.0).move(0, .0, 5).scale(0.4)
      
   }

   // FIND THE POINT ON THE TABLE THAT I AM FACING

   let eyeMatrix = () => cg.mMultiply(clay.inverseRootMatrix, clay.root().inverseViewMatrix(0));

   let raytraceFromEyeToTable = () => {
      let eyeMat = eyeMatrix();
      let V = eyeMat.slice(12,15);
      let pitch = Math.PI/10;
      let W = cg.mix(eyeMat.slice(8,11), eyeMat.slice(4,7), Math.cos(pitch), Math.sin(pitch));
      let dy = tableHeight - V[1];
      let dx = dy * W[0] / W[1];
      let dz = dy * W[2] / W[1];
      return cg.add(V, [dx,dy,dz]);
   }

   // FIND THE POINT ON THE MENU THAT I AM FACING

   let raytraceFromEyeToMenu = () => cg.mHitRect(eyeMatrix(), menu.getMatrix());

   // ANIMATE ONE FRAME

   //let wheelieState = 0;

   model.animate(() => {



      while (largeObjRoot.nChildren() > 0)
         largeObjRoot.remove(0);

      if (! robot.root.ignore) {
         let t = model.time / 2;
	 let h = Math.abs(Math.sin(2*t));
         robot.update([
	    (1 - h) * tableRadius * Math.sin(t),
	    tableHeight + .4 * h,
	    (1 - h) * tableRadius * Math.cos(t)
	 ]);
      }
/*
      if (! wheelie.root.ignore) {
         if (wheelie.isAtXZTarget()) {
	    wheelieState = (wheelieState + 1) % 4;
	    wheelie.setXZTarget([ .4 * Math.cos(Math.PI/2 * wheelieState),
	                          .4 * Math.sin(Math.PI/2 * wheelieState) ]);
         }
	 wheelie.setLookTarget(eyeMatrix().slice(12,15));
         wheelie.update(model.time);
      }
*/
      const wizardId = window['peers']?.wizardId;
      if (window.peer.open) {

         if (wizardId && !window.wizardConn) {
            const conn = window.peer.connect(wizardId);
            console.log('connecting to wizard: ', wizardId);
            window.wizardConn = conn;
            conn.on('open', () => {
               console.log('peer-to-peer connection with wizard established');
            })
            conn.on('close', () => {
               delete window.wizardConn;
               console.log('peer-to-peer connection with wizard closed');
            })
            conn.on('data', (data) => {
               const {drawings, focus, objects, speech, agents, flags} = data;
               tabletopStates.drawings = drawings;
               tabletopStates.focus = focus;
               tabletopStates.objects = objects;
               tabletopStates.speech = speech;
               tabletopStates.agents = agents;
               tabletopStates.flags = flags;
            })
         }
         const peerIds = window['peers']?.clientIds;
         if (peerIds) {
            peerIds.forEach(peerId => {
               // initiate peer connection if none exists and my id is bigger than theirs
               if (!window.conns[peerId] && window.peer.id > peerId) {
                  const conn = window.peer.connect(peerId);
                  console.log('connecting to peer: ', peerId);
                  onConnection(conn);
               }
            })
         }
      }


      // SUPPRESS ALL BILLBOARDS OF OTHER USERS

      window.suppressPeopleBillboards = true;

      // RETRIEVE MY COMPASS DIRECTION AROUND THE TABLE

      let V0 = cg.mMultiply(clay.inverseRootMatrix, clay.root().inverseViewMatrix(0)).slice(12,15);
      let V1 = cg.mMultiply(clay.inverseRootMatrix, clay.root().inverseViewMatrix(1)).slice(12,15);
      compassDirection = Math.atan2(V0[0]+V1[0],V0[2]+V1[2]);

      // FIND OUT WHERE ON THE TABLE I AM LOOKING, AND UPDATE THE MODEL

      headAim = raytraceFromEyeToTable();
      let h = isOnTable(headAim) ? .2 : .001;
      let r = isOnTable(headAim) ? .002 : .008;
      sendEvent('head', headAim, 'move');

      // UPDATE THE MODEL WHENEVER I START OR STOP SPEAKING

      if (isSpeaking != wasSpeaking) {
         if (window.wizardConn && window.wizardConn.open)
            window.wizardConn.send({ op: 'speaking', client: clientID, status: isSpeaking });
         wasSpeaking = isSpeaking;
      }

      // BUILD A 3D VIEW OF THE MODEL

      for (let i = 0 ; i < objs.nChildren() ; i++)
         removeObject(i);

      let focus = tabletopStates.focus ? tabletopStates.focus[clientID] : null;

      if (tabletopStates.objects)
         for (let id in tabletopStates.objects)
            buildObject(id, tabletopStates.objects[id], focus);

      // SHOW THE AGENTS

      for (let id in tabletopStates.agents) {
         let agent = tabletopStates.agents[id];
         if (! wheelies[id]) {
	    wheelies[id] = new Wheelie(model, [0,tableHeight,0]);
	    agents[id] = { x: 0, y: 0, h: 0 };
         }
	 else {
	    if ( agents[id].x != agent.x ||
	         agents[id].y != agent.y ||
	         agents[id].h != agent.h ) {
               wheelies[id].setXZTarget([agent.x/1000, agent.y/1000]);
               agents[id] = agent;
            }
	    wheelies[id].update(model.time);
	 }
	 wheelies[id].root.ignore = ! showWheelie;
      }

      // DRAW THE POP-UP MENU

      menuRender();

      // COMPUTE THE POSITIONS OF MY HEAD AND HANDS, AND SEND THEM TO THE MODEL

      let headMatrix = cg.mMultiply(clay.inverseRootMatrix,
                                    cg.mix(clay.root().inverseViewMatrix(0),
                                           clay.root().inverseViewMatrix(1), .5));
      let leftHandMatrix  = cg.mMultiply(clay.inverseRootMatrix, controllerMatrix.left );
      let rightHandMatrix = cg.mMultiply(clay.inverseRootMatrix, controllerMatrix.right);

      Lb = leftHandMatrix [13] < tableHeight + .1;
      Rb = rightHandMatrix[13] < tableHeight + .1;

      let positionMatrix = headMatrix;
      let viewX = positionMatrix[12];
      let viewZ = positionMatrix[14];
      let dist = Math.sqrt(viewX*viewX+viewZ*viewZ);
      isInTableRange = viewX < tableRange;
      isInTableRange &= viewX > -tableRange;
      isInTableRange &= viewZ < tableRange;
      isInTableRange &= viewZ > -tableRange;

      roomSolid.scale = isInTableRange ? [.001,.001,.001] : [1.3,1.3,1.3];
      roomClear.scale = !isInTableRange ? [.001,.001,.001] : [1.3,1.3,1.3];

      if (showMirrorAvatar) {
         if (! mirrorAvatar)
            mirrorAvatar = createP2PAvatar();
         setAvatarMatrices(mirrorAvatar, cg.mMirrorZ(headMatrix),
                                         cg.mMirrorZ(leftHandMatrix),
                                         cg.mMirrorZ(rightHandMatrix));
      }
      
      if (mirrorAvatar)
         mirrorAvatar.ignore = !showMirrorAvatar;

      let H = packMatrix(headMatrix);
      let L = packMatrix(leftHandMatrix);
      let R = packMatrix(rightHandMatrix);

      Object.values(window.conns).forEach(conn => conn.conn.send([H,L,R]))

      // RENDER AVATARS OF OTHER CLIENTS, IF ENABLED

      if (print3D) {
         let s = '';
         let n = 1;
         objs.move(0,-tableHeight/objScale,0);
         for (let i = 0 ; i < objs.nChildren() ; i++)
            if (objs.child(i).nChildren() > 0) {
               let ns = objs.child(i).child(0).toObj(n);
               s += '\n########## ' + tabletopStates.objects[i].type + ' ##########\n\n';
               s += ns.s;
               n  = ns.n;
            }
         objs.move(0,tableHeight/objScale,0);
	 if (s.length > 0)
            print3D = false;
      }
   });
}
