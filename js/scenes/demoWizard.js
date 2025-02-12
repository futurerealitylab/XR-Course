import * as cg from "../render/core/cg.js";
import { G2 } from "../util/g2.js";

const inch = .0254, canvasRadius = 350,
      tableRadius = 18.25 * inch, tableHeight = 30.5 * inch,
      objScale = .45 * thingsScale;

server.init('wizard', {});

window.isSpeaking = false;
if (! window.audioContext) {
   let onSuccess = stream => {
      window.audioContext = new AudioContext();
      let mediaStreamSource = audioContext.createMediaStreamSource(stream);
      let scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);
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
   let HP = { left: [0,0,0], right: [0,0,0] }, headAim = [0,0,0];

   let xf  = t => (t - canvasWidth/2) / (canvasWidth/2) * .45;
   let ixf = t => Math.max(-999, Math.min(999, t / .45 * canvasWidth/2 + canvasWidth/2 + .5 >> 0));
   let objs = model.add();
   for (let n = 0 ; n < 100 ; n++)
      objs.add();

   let g2 = new G2();
   let X = x => .5 - .5 * x / tableRadius;
   let Y = y => .5 + .5 * y / tableRadius;
   g2.setColor('#00000050');
   g2.fillOval(0,0,1,1);

   let L = xformPos(HP.left , true);
   let lr = isPressed.left ? .015 : .02;
   g2.setColor(isPressed.left ? '#000000b0' : '#00000080');
   g2.fillOval(X(L[0]) - lr , Y(L[2]) - lr , 2*lr , 2*lr );

   let R = xformPos(HP.right, true);
   let rr = isPressed.right ? .015 : .02;
   g2.setColor(isPressed.right ? '#000000b0' : '#00000080');
   g2.fillOval(X(R[0]) - rr , Y(R[2]) - rr , 2*rr , 2*rr );

   let A = xformPos(headAim , true);
   g2.setColor('#00000080');
   g2.fillRect(X(A[0]) - .002, Y(A[2]) - .02 , .004, .04 );
   g2.fillRect(X(A[0]) - .02 , Y(A[2]) - .002, .04 , .004);

   model.txtrSrc(3, g2.getCanvas());

   let table = model.add('cube').move(0,tableHeight,0)
                                .scale(tableRadius,.0001,tableRadius)
				.color(0,0,0).dull()
				.txtr(3);

   let isPressed = {left: false, right: false};
   let id = {left: -1, right: -1};
   let wasSpeaking = false;

   let isOnTable = p => cg.norm([p[0],0,p[2]]) < tableRadius;

   // TRANSFORM POSITION ACCORDING TO WHICH SEAT THE CLIENT IS IN

   let xformPos = (p, invert) => {
      if (wizard.focus && wizard.focus[clientID]) {
         let seat = wizard.focus[clientID].seat;
	 let x = p[0];
	 let z = p[2];
	 let angle = (invert ? 1 : -1) * Math.PI/2 * seat;
	 p[0] =  x * Math.cos(angle) + z * Math.sin(angle);
	 p[2] = -x * Math.sin(angle) + z * Math.cos(angle);
      }
      return p;
   }

   // GET THE TRANSFORMED HAND POSITION

   let handPos = hand => xformPos(inputEvents.pos(hand));

   // ON PRESS EVENT, FIND OBJECT AT THIS HAND, IF ANY, AND GRAB IT

   inputEvents.onPress = hand => {
      isPressed[hand] = true;
      let p = handPos(hand);
      let dMin = 10000;
      id[hand] = -1;
      for (let i in wizard)
         if (isInt(i)) {
            let objInfo = wizard[i];
            let x = xf(objInfo.x),
                z = xf(objInfo.y);
            let d = cg.distance([p[0],p[2]], [x,z]);
            if (d < dMin) {
               dMin = d;
	       if (d < .06)
                  id[hand] = i;
            }
         }
   }

   // SEND FOCUS DATA FOR THIS CLIENT TO THE SERVER

   let sendFocus = (part, p, down) => {
      server.send('wizard', { op    : 'focus',
                              client: clientID,
			      part  : part,
			      value : { x: ixf(p[0]), y: ixf(p[2]), down: down } });
   }

   // ON MOVE EVENT, UPDATE THE HAND POSITION ON THE SERVER

   inputEvents.onMove = hand => {
      HP[hand] = handPos(hand);
      sendFocus(hand, handPos(hand), false);
   }

   // ON DRAG EVENT, UPDATE THE HAND POSITION ON THE SERVER
   // AND MOVE AN OBJECT IF IT HAS BEEN GRABBED

   let prevA;

   inputEvents.onDrag = hand => {
      HP[hand] = handPos(hand);
      sendFocus(hand, HP[hand], true);
      if (id[hand] >= 0) {

         // IF BOTH HANDS ARE DRAGGING THE SAME OBJECT, DO COMBINED MOVE AND TURN

         if (id.left == id.right) {
            let L = HP.left;
            let R = HP.right;
	    let p = cg.mix(L,R,.5);
	    if (isOnTable(p)) {

	       // PLACE THE OBJECT AT THE AVERAGE POSITION BETWEEN THE TWO HANDS

               let objInfo = wizard[id.left];
               objInfo.x = ixf(p[0]);
               objInfo.y = ixf(p[2]);

	       // TURN THE OBJECT BY CHANGES IN DIRECTION FROM LEFT TO RIGHT HAND

	       let A = Math.atan2(R[0]-L[0], R[2]-L[2]) * 180 / Math.PI;
	       if (prevA !== undefined)
	          objInfo.angle = objInfo.angle + A - prevA + .5 >> 0;
	       prevA = A;

               server.send('wizard', { op: 'object', id: id[hand], obj: objInfo });
	    }
	 }

	 // OTHERWISE, INDEPENDENTLY MOVE ANY OBJECT AT EACH HAND

         else {
            let p = handPos(hand);
            if (isOnTable(p)) {
               let objInfo = wizard[id[hand]];
               objInfo.x = ixf(p[0]);
               objInfo.y = ixf(p[2]);
               server.send('wizard', { op: 'object', id: id[hand], obj: objInfo });
            }
         }
      }
   }

   // ON RELEASE EVENT, RELEASE ANY OBJECT THAT HAS BEEN GRABBED

   inputEvents.onRelease = hand => {
      isPressed[hand] = false;
      id[hand] = -1;
      prevA = undefined;
   }

   let removeObject = id => {
      let obj = objs.child(id);
      while (obj.nChildren() > 0)
         obj.remove(0);
   }

   // BUILD A VIEWABLE 3D OBJECT FROM ITS OBJECT MODEL

   let buildObject = (id, objInfo, isSelected) => {
      removeObject(id);

      // CREATE BOTH THE OBJECT AND ITS BELOW-THE-TABLE MIRROR.

      let opacity = isSelected ? .7 : 1;
      let thing = things[objInfo.type];
      let obj = objs.child(id);
      for (let n = 0 ; n < thing.items.length ; n++) {
         let item = thing.items[n];
         let m = item.m.slice();
         let c = item.c ? item.c : cg.hexToRgba(objInfo.color);
         for (let k = 0 ; k < 2 ; k++) {
            obj.add(item.type).move(xf(objInfo.x) / objScale, 0, xf(objInfo.y) / objScale)
                              .turnY(objInfo.angle*Math.PI/180)
                              .move(m).scale(item.s).color(c)
                              .opacity(k==0 ? opacity : .8 * opacity);
            m[1] = -m[1];
         }
      }
   }

   wizard = server.synchronize('wizard');

   // FIND THE POINT ON THE TABLE THAT THE HEADSET IS FACING

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

   // ANIMATE ONE FRAME

   model.animate(() => {

      window.suppressPeopleBillboards = true;

      // FIND OUT WHERE ON THE TABLE THE USER IS LOOKING

      headAim = raytraceFromEyeToTable();
      let h = isOnTable(headAim) ? .2 : .001;
      let r = isOnTable(headAim) ? .002 : .008;
      sendFocus('head', xformPos(headAim), false);

      // TELL THE WIZARD WHEN THIS CLIENT STARTS OR STOPS SPEAKING

      if (isSpeaking != wasSpeaking) {
         server.send('wizard', { op: 'speaking', client: clientID, status: isSpeaking });
	 wasSpeaking = isSpeaking;
      }

      // INITIALLY, LOAD OBJECTS FROM PERSISTENT STATE

      server.sync('wizard', msgs => {

         // LOOP THROUGH ALL MESSAGES.

         for (let msgID in msgs) {
            let msg = msgs[msgID];
            switch (msg.op) {

            // DELETE AN OBJECT.

            case 'remove':
               delete wizard[msg.id];
	       removeObject(msg.id);
               break;

            // GET STATUS OF WHO IS CURRENTLY SPEAKING

            case 'speaking':
               wizard.focus[msg.client].isSpeaking = msg.status;
               break;

            // GET FOCUS DATA.

            case 'focus':
	       let client = msg.client;
               if (! wizard.focus)
                  wizard.focus = {};
               if (msg.remove)
                  delete wizard.focus[client];
               else {
                  if (! wizard.focus[client])
                     wizard.focus[client] = { seat: 0, isSpeaking: false };
	          if (msg.seat !== undefined) 
                     wizard.focus[client].seat = msg.seat;
                  else {
		     if (wizard.focus[client][msg.part]) {
                        wizard.focus[client][msg.part].x = msg.value.x;
                        wizard.focus[client][msg.part].y = msg.value.y;
                        wizard.focus[client][msg.part].down = msg.value.down;
                        if (msg.value.id !== undefined)
                           wizard.focus[client][msg.part].id = msg.value.id;
                     }
                  }
               }
               break;

            // ADD OR MODIFY AN OBJECT.

            case 'object':
               wizard[msg.id] = msg.obj;
               break;
            }
         }

         // REBUILD 3D OBJECTS, AND HIGHLIGHT ANY OBJECT
         // THAT IS CURRENTLY SELECTED BY THIS CLIENT.

	 for (let i = 0 ; i < objs.nChildren() ; i++)
	    removeObject(i);

         for (let id in wizard)
            if (isInt(id)) {
	       let S = part => wizard.focus[clientID][part] && wizard.focus[clientID][part].id == id;
               buildObject(id, wizard[id], S('left') || S('right') || S('head'));
            }
      });

      let seat = wizard.focus && wizard.focus[clientID] ? wizard.focus[clientID].seat : clientID;
      objs.identity().move(0,tableHeight,0).turnY(Math.PI/2 * seat).scale(objScale);
   });
}

