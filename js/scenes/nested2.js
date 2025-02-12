import * as cg from "../render/core/cg.js";

if (! window.peer) {
   window.peer = new Peer();
   window.conns = {};
   window.peer.on('disconnected', () => window.peer.reconnect());
   window.peer.on('open', () =>
      document.getElementById('connection-status').innerHTML = "Connected to wizard"
   )
}

window.nestedStates = {};

export const init = async model => {


   ////////////////////////////////////////////////////////////////////////////////////

   let avatars = {}, showAvatars = false;

   server.neverLoadOrSave();
   const onConnection = dataConnection => {
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

// TO DO: HAVE THE WIZARD HANDLE ALL INPUT EVENTS

/*
   // ON INPUT EVENTS, UPDATE MY INPUT STATE TO THE MODEL

   inputEvents.onMove        = hand => sendEvent(hand, inputEvents.pos(hand), 'move'       );
   inputEvents.onPress       = hand => sendEvent(hand, inputEvents.pos(hand), 'press'      );
   inputEvents.onDrag        = hand => sendEvent(hand, inputEvents.pos(hand), 'drag'       );
   inputEvents.onRelease     = hand => sendEvent(hand, inputEvents.pos(hand), 'release'    );
   inputEvents.onDoublePress = hand => sendEvent(hand, inputEvents.pos(hand), 'doublepress');

   let sendEvent = (hand, p, type) => {
      if (window.wizardConn && window.wizardConn.open)
         window.wizardConn.send({ op    : 'event',
                                  client: clientID,
                                  hand  : hand,
                                  type  : type,
				  p     : roundVec(2, p) });
   }
*/
   ////////////////////////////////////////////////////////////////////////////////////


   model.customShader(`
      uniform mat4 uWorld;
      -------------------------------
      vec4 pos = uProj * uView * uWorld * vec4(vPos, 1.);
      float mist = pow(.985, length(pos.xyz));
      color = mix(vec3(.5), color, mist);
   `);

   let touched = false;
   let tr = .375, cr = .0375, ry = .8;
   let dragPos = [.2,-.05,-.2], movePos = { left: [0,1,0], right: [0,1,0] };;
   let ilo = -2, ihi = 4;
   let container = model.add('sphere').scale(1000,1000,-1000);
   let rooms = model.add().move(0,ry,0);
   let dragMarker = model.add();
   for (let i = ilo ; i <= ihi ; i++) {
      let room = rooms.add();
         let table = room.add();
         model.txtrSrc(1, "../media/textures/concrete.png");
         table.add('cube').scale(1.5).move(0,-.11,0).scale(.3,.01,.3).txtr(1);
         table.add('cube').scale(1.5).move(0,-.45,0).scale(.05,.345,.05).color(0,0,0);
         let chair = room.add();
         chair.add('cube').move(0,2.9,-.9).scale(1,.9,.1);
         chair.add('cube').move(0,1.9,0).scale(1,.1,1);
         chair.add('cube').move(-.9,.9,-.9).scale(.1,.9,.1);
         chair.add('cube').move( .9,.9,-.9).scale(.1,.9,.1);
         chair.add('cube').move(-.9,.9, .9).scale(.1,.9,.1);
         chair.add('cube').move( .9,.9, .9).scale(.1,.9,.1);
	    //if (i == 1)
               //chair.add('cube').scale(.99).opacity(.1);
         room.add('tubeY');
   }

   inputEvents.onMove = hand => movePos[hand] = inputEvents.pos(hand);

   inputEvents.onDrag = hand => {
      let p = inputEvents.pos(hand);
      dragPos = [ Math.max(-tr, Math.min(tr, p[0])),
                  Math.max(-4*cr, p[1] - ry),
                  Math.max(-tr, Math.min(tr, p[2])) ];
   }

   model.animate(() => {


      ////////////////////////////////////////////////////////////////////////////////////

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
               const {focus, objects} = data;
               nestedStates.focus   = focus;
               nestedStates.objects = objects;
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

      ////////////////////////////////////////////////////////////////////////////////////


      model.setUniform('Matrix4fv', 'uWorld', false, worldCoords);
      let bigChairPos;
      for (let i = ihi ; i >= ilo ; i--) {
         let room = rooms.child(i - ilo);
	 room.identity().scale(Math.pow(8, i));

	 let chair = room.child(1);
	 let thing = room.child(2);

         chair.identity().move(dragPos).color(i==1&&touched?[1,.5,.5]:[0,.25,.5]).scale(cr);
	 if (i == 1) {
	    bigChairPos = chair.getGlobalMatrix().slice(12,15);
	    bigChairPos[1] += cr * 8;
         }

         thing.identity().turnY(model.time/2).move(1,1.5,0).scale(.15);
      }
      let dL = cg.subtract(movePos.left , bigChairPos);
      let dR = cg.subtract(movePos.right, bigChairPos);
      let tL = Math.max(Math.abs(dL[0]), Math.abs(dL[1]), Math.abs(dL[2]));
      let tR = Math.max(Math.abs(dR[0]), Math.abs(dR[1]), Math.abs(dR[2]));
      touched = Math.min(tL, tR) < cr * 8;
   });
}

