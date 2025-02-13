import * as cg from "../render/core/cg.js";
import { moleculeNames, addMolecule } from "../render/core/molecules.js";
import { controllerMatrix } from "../render/core/controllerInput.js";
import { g2 } from "../util/g2.js";

// INITIALIZE THE MODEL

console.log('running demotabletop.js');

server.init('tabletop', {});

// INITIALIZE AUDIO VOLUME DETECTION

if (!window.peer) {
   window.peer = new Peer();
   window.conns = {};
   window.peer.on('disconnected', () => {
      window.peer.reconnect();
   });
   window.peer.on('open', () => {
      document.getElementById('connection-status').innerHTML = "Connected to wizard"
   })
}


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

export const init = async model => {
   server.neverLoadOrSave();
   console.log('running init');
   document.getElementById('active-demo').innerHTML = "Tabletop demo active";
   document.getElementById('header-details').style.display = "none";
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
         inch = .0254, tableRadius = 18.25 * inch;
   let HP = { left: [0,0,0], right: [0,0,0] }, headAim = [0,0,0];
   let isPressed = {left: false, right: false};
   let wasSpeaking = false;
   let compassDirection = 0;
   let showText = true;
   let showLocalMirrorAvatar = false;
   let showRelayMirrorAvatar = false;
   let showAvatars = false;
   let blinkTime = 0;
   let avatars = {};
   let localMirrorAvatar;
   let print3D = true;

   // TRANSFORM BETWEEN 2D CANVAS POSITION AND 3D WORLD COORDS

   let xf  = t => (t - canvasWidth/2) / (canvasWidth/2) * .45;
   let ixf = t => Math.max(-999, Math.min(999, t / .45 * canvasWidth/2 + canvasWidth/2 + .5 >> 0));

   // CREATE ALL THE 3D VIEW OBJECTS

   let objs = model.add().move(0,tableHeight,0).scale(objScale);
   for (let n = 0 ; n < 100 ; n++)
      objs.add();

   // FUNCTION TO CREATE AN AVATAR

   let avatarRoot = model.add();

   let particles;

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

   // FUNCTION TO RENDER AN AVATAR

   let renderAvatar = (id, isVisible, isMirror) => {

      if (! tabletop.avatars || ! tabletop.avatars[id])
         return;

      if (! avatars[id])
         avatars[id] = createAvatar();

      let avatar = avatars[id];

      if (! isVisible) {
         avatar.scale(0);
         return;
      }

      avatar.identity();

      let P = tabletop.avatars[id];

      let headMatrix      = unpackMatrix(P[0]);
      let leftHandMatrix  = unpackMatrix(P[1]);
      let rightHandMatrix = unpackMatrix(P[2]);

      if (isMirror) {
         headMatrix      = cg.mMirrorZ(headMatrix);
         leftHandMatrix  = cg.mMirrorZ(leftHandMatrix);
         rightHandMatrix = cg.mMirrorZ(rightHandMatrix);
      }
      else {
         headMatrix      = cg.mMultiply(headMatrix     , cg.mRotateY(Math.PI));
         leftHandMatrix  = cg.mMultiply(leftHandMatrix , cg.mRotateY(Math.PI));
         rightHandMatrix = cg.mMultiply(rightHandMatrix, cg.mRotateY(Math.PI));
      }

      setAvatarMatrices(avatar, headMatrix, leftHandMatrix, rightHandMatrix);
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
/*
   let table = model.add('tubeY').move(0,tableHeight,0)
                                 .scale(tableRadius,.0001,tableRadius)
                                 .color(0,0,0).dull()
                                 .opacity(.5);
*/
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

   let table = model.add('cube').move(0,tableHeight,0)
                                .turnY(Math.PI)
                                .scale(tableRadius,.0001,tableRadius)
                                .color(0,0,0).dull()
                                .txtr(3);

   // HANDLE THE HEADS-UP OPTIONS MENU

   let menuHint = false, menuShow = false, menuChoice = -1;

   let menuItems = 'Hide text,Show local mirror,Show relay mirror,Show avatars,Menu 5,Menu 6,Menu 7,Menu 8,Menu 9,Menu 10'.split(',');

   let menuAction = () => {
      switch (menuChoice) {
      case 0:
         showText = ! showText;
         menuItems[0] = showText ? 'Hide text' : 'Show text';
         break;
      case 1:
         showLocalMirrorAvatar = ! showLocalMirrorAvatar;
         menuItems[1] = showLocalMirrorAvatar ? 'Hide local mirror' : 'Show local mirror';
         break;
      case 2:
         showRelayMirrorAvatar = ! showRelayMirrorAvatar;
         menuItems[2] = showRelayMirrorAvatar ? 'Hide relay mirror' : 'Show relay mirror';
         break;
      case 3:
         showAvatars = ! showAvatars;
         menuItems[3] = showAvatars ? 'Hide avatars' : 'Show avatars';
         break;
      default:
         break;
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
      server.send('tabletop', { op    : 'event',
                                client: clientID,
                                part  : part,
                                event : { x: ixf(p[0]), y: ixf(p[2]), type: type } });
      switch (type) {
      case 'move':
         if (part == 'left' || part == 'right') {
            handPos[part] = p;
            menuHint = ! isOnTable(handPos.left) && ! isOnTable(handPos.right);
         }
         break;
      case 'press':
         if (menuHint)
            menuShow = true;
         break;
      case 'release':
         if (menuShow)
            menuAction();
         menuShow = false;
         break;
      }
      menu.ignore = ! menuHint && ! menuShow;
   }

   // ON HAND EVENTS, UPDATE MY HAND STATE TO THE MODEL

   inputEvents.onMove    = hand => sendEvent(hand, HP[hand] = inputEvents.pos(hand), 'move'   );
   inputEvents.onPress   = hand => sendEvent(hand, HP[hand] = inputEvents.pos(hand), 'press'  );
   inputEvents.onDrag    = hand => sendEvent(hand, HP[hand] = inputEvents.pos(hand), 'drag'   );
   inputEvents.onRelease = hand => sendEvent(hand, HP[hand] = inputEvents.pos(hand), 'release');

   // REMOVE A VIEWABLE 3D OBJECT

   let removeObject = id => {
      let obj = objs.child(id);
      while (obj.nChildren() > 0)
         obj.remove(0);
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
      if (thing.items.length == 0) {
         addMolecule(obj, objInfo.type).move(xf(objInfo.x)/objScale,.45/objScale,xf(objInfo.y)/objScale)
                                       .turnY(objInfo.angle * Math.PI/180)
                                       .opacity(isInFocus ? .7 : 1);
         return;
      }

      // IF OBJECT'S FORM DOESN'T EXIST, CREATE IT (AND ITS REFLECTION)

      for (let k = 0 ; k < 2 ; k++) {
         let form = objInfo.type + k;
         if (! clay.formMesh(form)) {
            let temp = model.add();
            for (let n = 0 ; n < thing.items.length ; n++) {
               let item = thing.items[n];
               let m = item.m.slice();
               temp.add(item.type).move(m[0], k==1 ? -m[1] : m[1], m[2])
                                  .turnX(Math.PI * k)
                                  .scale(item.s)
                                  .color(item.c ? item.c : [1,1,1]);
            }
            temp.newForm(form);
            model.remove(temp);
         }
      }

      // INSTANTIATE OBJECT AND ITS REFLECTION

      for (let k = 0 ; k < 2 ; k++)
         obj.add(objInfo.type + k).opacity(isInFocus ? .8 : 1);
      obj.identity()
         .move(xf(objInfo.x)/objScale, 0, xf(objInfo.y)/objScale)
         .turnY(objInfo.angle * Math.PI/180)
         .color(cg.hexToRgba(objInfo.color));
   }

   // FIND THE POINT ON THE TABLE THAT I AM FACING

   let raytraceFromEyeToTable = () => {
      let vm = cg.mMultiply(clay.inverseRootMatrix, clay.root().inverseViewMatrix(0));
      let V = vm.slice(12,15);
      let pitch = Math.PI/10;
      let W = cg.mix(vm.slice(8,11), vm.slice(4,7), Math.cos(pitch), Math.sin(pitch));
      let dy = tableHeight - V[1];
      let dx = dy * W[0] / W[1];
      let dz = dy * W[2] / W[1];
      return cg.add(V, [dx,dy,dz]);
   }

   // FIND THE POINT ON THE MENU THAT I AM FACING

   let raytraceFromEyeToMenu = () => {
      let vm = cg.mMultiply(clay.inverseRootMatrix, clay.root().inverseViewMatrix(0));
      let mm = menu.getMatrix();
      return cg.mHitRect(vm, mm);
   }

   // ANIMATE ONE FRAME

   model.animate(() => {
      const wizardId = window['peers'].wizardId;
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
         }
         const peerIds = window['peers'].clientIds;
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
         server.send('tabletop', { op: 'speaking', client: clientID, status: isSpeaking });
         wasSpeaking = isSpeaking;
      }

      // GET THE UP-TO-DATE MODEL

      server.sync('tabletop', () => {});

      // BUILD A 3D VIEW OF THE MODEL

      for (let i = 0 ; i < objs.nChildren() ; i++)
         removeObject(i);

      let focus = tabletop.focus ? tabletop.focus[clientID] : null;
      if (tabletop.objects)
         for (let id in tabletop.objects)
            buildObject(id, tabletop.objects[id], focus);

      menuRender();
/*
      // CREATE THE DRAWINGS AS PARTICLES

      if (tabletop.drawings)
         for (let id in tabletop.drawings) {
            let drawing = tabletop.drawings[id];

            let isFocus = false;
            for (let id in drawing.ids)
               isFocus ||= id == clientID;

            let strokes = drawing.strokes;
            for (let i = 0 ; i < strokes.length ; i++) {
               let stroke = strokes[i];
               let data = [];
               for (let k = 0 ; k < stroke.length ; k += 8) {
                  let p0 = sampleStroke(stroke, (k  ) / stroke.length);
                  let p1 = sampleStroke(stroke, (k+4) / stroke.length);
                  data.push({
                     s: .007,
		     n: [0,1,0],
                     p: [ [ xf(p0.x), tableHeight, xf(p0.y) ],
		          [ xf(p1.x), tableHeight, xf(p1.y) ] ],
                  });
               }
               if (particles)
                  model.remove(particles);
               particles = model.add('particles').info(data.length);
               particles.setParticles(data);
            }
         }
*/
      // COMPUTE THE POSITIONS OF MY HEAD AND HANDS, AND SEND THEM TO THE MODEL

      let headMatrix = cg.mMultiply(clay.inverseRootMatrix,
                                    cg.mix(clay.root().inverseViewMatrix(0),
                                           clay.root().inverseViewMatrix(1), .5));
      let leftHandMatrix  = cg.mMultiply(clay.inverseRootMatrix, controllerMatrix.left );
      let rightHandMatrix = cg.mMultiply(clay.inverseRootMatrix, controllerMatrix.right);

      if (showLocalMirrorAvatar) {
         if (! localMirrorAvatar)
            localMirrorAvatar = createAvatar();
         setAvatarMatrices(localMirrorAvatar, cg.mMirrorZ(headMatrix),
                                              cg.mMirrorZ(leftHandMatrix),
                                              cg.mMirrorZ(rightHandMatrix));
      }
      
      if (localMirrorAvatar) {
         localMirrorAvatar.ignore = !showLocalMirrorAvatar;
      }

      let H = packMatrix(headMatrix);
      let L = packMatrix(leftHandMatrix);
      let R = packMatrix(rightHandMatrix);
      server.send('tabletop', { op: 'avatar', client: clientID, value: [H,L,R] });
      Object.values(window.conns).forEach(conn => {
         conn.conn.send([H,L,R]);
      })

      // RENDER MY MIRROR AVATAR, IF ENABLED

      renderAvatar(clientID, showRelayMirrorAvatar, true);

      // RENDER AVATARS OF OTHER CLIENTS, IF ENABLED

      for (let id in tabletop.avatars)
         if (id != clientID)
            // renderAvatar(id, true);

      if (print3D) {
         let s = '';
         let n = 1;
         objs.move(0,-tableHeight/objScale,0);
         for (let i = 0 ; i < objs.nChildren() ; i++)
            if (objs.child(i).nChildren() > 0) {
               let ns = objs.child(i).child(0).toObj(n);
               s += '\n########## ' + tabletop.objects[i].type + ' ##########\n\n';
               s += ns.s;
               n  = ns.n;
            }
         console.log(s);
         objs.move(0,tableHeight/objScale,0);
      }
      print3D = false;
   });
}

