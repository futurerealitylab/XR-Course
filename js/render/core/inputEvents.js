import * as cg from "./cg.js";
import { controllerEventTypes, controllerMatrix } from "./controllerInput.js";
import * as global from "../../global.js";
import * as sync from "/js/util/sync.js";

let isDebug = false;

let now = () => Date.now() / 1000;  // THE CURRENT TIME IN SECONDS

export function InputEvents() {
   this.onMove    = hand => { if (isDebug) console.log('onMove' , hand); }
   this.onClick   = hand => { if (isDebug) console.log('onClick', hand); }
   this.onPress   = hand => { if (isDebug) console.log('onPress', hand); }
   this.onDrag    = (hand, elapsed) => { if (isDebug) console.log('onDrag'   , hand, elapsed); }
   this.onRelease = (hand, elapsed) => { if (isDebug) console.log('onRelease', hand, elapsed); }
   this.onDoublePress = hand => { if (isDebug) console.log('onDoublePress', hand); }

   let pinchUp     = { left: 100, right: 100 };
   let altPinchUp  = { left: 100, right: 100 };

   // pressTime IS TIME SINCE ONSET OF PRESS. -1 INDICATES NOT PRESSING.

   let handInfo = { left : { pressTime: -1, pressPos: [], altPressTime: -1, lastPressTime: 0 },
                    right: { pressTime: -1, pressPos: [], altPressTime: -1, lastPressTime: 0 } };

   this.isPressed = hand => handInfo[hand].pressTime > 0;

   this.flip = state => isFlipped = state === undefined ? true : state;

   let isFlipped = false;

   let altPressed = false;

   let timestep = 0;

   let prevIsHandtracking = false;

   let prevIsHoldingBothAlts = false;

   this.update = () => {
      let press = hand => {
         let currentTime = now();
         if (currentTime - handInfo[hand].lastPressTime < 0.3) {  // Double press detected if within 0.3 seconds
            this.onDoublePress(hand);
         }
         handInfo[hand].lastPressTime = currentTime;
         handInfo[hand].pressTime = currentTime;
         handInfo[hand].pressPos = pos[hand];
         this.onPress(hand);
      }

      let release = hand => {
         let duration = now() - handInfo[hand].pressTime;
         handInfo[hand].pressTime = -1;
         this.onRelease(hand, duration);
         if (duration < 0.5 && cg.distance(handInfo[hand].pressPos, pos[hand]) < .03)
            this.onClick(hand);
      }

      // ALT PRESS IS PINCH THUMB TO MIDDLE FINGER OR PRESS CONTROLLER THUMB BUTTON

      let altPress   = hand => handInfo[hand].altPressTime = now();
      let altRelease = hand => handInfo[hand].altPressTime = -1;

      pos = {};
      for (let hand in handInfo)
         pos[hand] = window.handtracking ? cg.mix(clay.handsWidget.getMatrix(hand,0,4).slice(12,15),
                                                  clay.handsWidget.getMatrix(hand,1,4).slice(12,15),.5)
                                         : clay.controllerOrigin(hand);

      if(window.handtracking != prevIsHandtracking){
         handInfo.left.altPressTime = -1;
         handInfo.right.altPressTime = -1;
         handInfo.left.pressTime = -1;
         handInfo.right.pressTime = -1;
         altPressed = false;
      }

      prevIsHandtracking = window.handtracking;
      let eventTypes = controllerEventTypes();
      for (let i = 0 ; i < eventTypes.length ; i++)
         switch (eventTypes[i]) {

            // PRESSING TRIGGERS

            case 'L0_press'  : press('left'); break;
            case 'R0_press'  : press('right'); break;
            case 'L0_release': release('left'); break;
            case 'R0_release': release('right'); break;

            // PRESSING JOYSTICKS

            case 'L3_press'  : altPress('left'); break;
            case 'R3_press'  : altPress('right'); break;
            case 'L3_release': altRelease('left'); break;
            case 'R3_release': altRelease('right'); break;
         }

      for (let hand in handInfo)
         if (handInfo[hand].pressTime >= 0)
            this.onDrag(hand, now() - handInfo[hand].pressTime);
         else
            this.onMove(hand);

      // IF ONE HAND IS ALT-PRESSING, ADJUST WORLD Y COORDINATE

      // WHILE BOTH HANDS ARE ALT-PRESSING, ADJUST WORLD COORDINATES

      let isAltL = handInfo.left.altPressTime > 0;
      let isAltR = handInfo.right.altPressTime > 0;

      if ((isAltL || isAltR) && ! (isAltL && isAltR) && !window.handtracking) {
         altPressed = true;
         let T = isAltL ? pos.left : pos.right;
         if (P)
            for (let i = 0 ; i < 3 ; i++)
               worldCoords[12+i] += Math.max(-0.05, Math.min(T[i] - P[i], 0.05));
         P = T.slice();
         clay.root().setMatrix(worldCoords);
         global.gltfRoot.matrix = worldCoords;
         inverseWorldCoords = cg.mInverse(worldCoords);
         clay.inverseRootMatrix = inverseWorldCoords;
      }
      else
         P = undefined;

      if(isAltL && isAltR != prevIsHoldingBothAlts){
         let L = pos.left;
         let R = pos.right;
         let T = cg.mix(L, R, .5);
         y = T[1];
      }

      prevIsHoldingBothAlts = isAltL && isAltR;

      if (isAltL && isAltR && !window.handtracking) {
         altPressed = true;
         let L = pos.left;
         let R = pos.right;
         let X = cg.subtract(R, L);
         if (isFlipped)
            X = cg.scale(X, -1);
         X = cg.normalize([ X[0], 0, X[2] ]);
         let Z = cg.cross(X, [0,1,0]);
         let T = cg.mix(L, R, .5);
         let wy = worldCoords[13];
         worldCoords = [ X[0],X[1],X[2],0, 0,1,0,0, Z[0],Z[1],Z[2],0, T[0],wy,T[2],1 ];
         if (y !== undefined)
            worldCoords[13] += Math.max(-0.05, Math.min(T[1] - y, 0.05));
         y = T[1];
         clay.root().setMatrix(worldCoords);
         global.gltfRoot.matrix = worldCoords;
         inverseWorldCoords = cg.mInverse(worldCoords);
         clay.inverseRootMatrix = inverseWorldCoords;
      }
      else
         y = undefined;

      if (!isAltL && !isAltR) {
         if (altPressed) {
            altPressed = false;
            sync.setOriginPos(worldCoords);
         }

         timestep += 1;
         if (timestep % 20 == 0) {
            sync.syncBound();
         }

         clay.root().setMatrix(worldCoords);
         global.gltfRoot.matrix = worldCoords;
         inverseWorldCoords = cg.mInverse(worldCoords);
         clay.inverseRootMatrix = inverseWorldCoords;
      }
   }

   let P, y, pos = {};
   global.gltfRoot.matrix = worldCoords;
   let inverseWorldCoords = cg.mInverse(worldCoords);
   this.pos = hand => cg.mTransform(inverseWorldCoords, pos[hand]);
}

window.worldCoords = cg.mIdentity();
