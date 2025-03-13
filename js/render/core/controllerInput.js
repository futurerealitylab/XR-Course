"use strict";
const buttonNum = 7;
import { corelink_event } from "../../util/corelink_sender.js";
import * as cg from "./cg.js";

const debug = false;

function console_log(content) {
  if(debug) {
      console.log(content);
  }
}

export let viewMatrix = [], time = 0;
window.isPressed = false;
window.isDragged = false;
window.isReleased = true;

export let controllerMatrix = { left: [], right: [] };
export let buttonState = { left: [], right: [] };
export let joyStickState = { left: {x: 0, y: 0}, right: {x: 0, y: 0} };

for (let i = 0; i < buttonNum; i++) 
  buttonState.left[i] = buttonState.right[i] = {pressed: false, touched: false, value: 0};

const validHandedness = ["left", "right"];
window.initxr = false;

export let updateController = (avatar, buttonInfo) => {
  controllerMatrix.left = avatar.leftController.matrix;
  controllerMatrix.right = avatar.rightController.matrix;

  if (validHandedness.includes(buttonInfo.handedness)) {
    // console.log(buttonInfo.buttons)
    let h = buttonInfo.handedness;
    let b = buttonInfo.buttons;
    let a = buttonInfo.axes;

    for (let i = 0; i < buttonNum; i++)
       buttonState[h][i] = b[i];
    joyStickState[h] = { x: a[2], y: a[3] };
  }
};

export let onPress = (hand, button) => {
  console_log("onPress:", hand, "controller, button", button);
  window.isPressed = true;
  window.isReleased = false;
  window.isDragged = false;
  //ZH
  // console_log("handleSelect");
  // corelink_event({ it: "lefttrigger", op: "press" });
};

export let onDrag = (hand, button) => {
  console_log("onDrag:", hand, "controller, button", button);
  window.isDragged = true;
  window.isReleased = false;
  window.isPressed = false;
};

export let onRelease = (hand, button) => {
  console_log("onRelease", hand, "controller, button", button);
  window.isReleased = true;
  window.isPressed = false;
  window.isDragged = false;

  //ZH
  // console_log("handleSelect");
  // corelink_event({ it: "lefttrigger", op: "release" });
};

export let getViews = (views) => {
  viewMatrix = [];
  for (let view of views) viewMatrix.push(view.viewMatrix);
};

export function ControllerBeam(model, hand) {
   this.isEnabled = true;
   this.hand = hand;
   let bend = Math.PI/4;
   this.beam = model.add();
   this.beam.add('tubeZ').color(10,0,0).dull(1).turnX(-bend)
                                               .move([0,.0212,-10.092])
                                               .scale(.0005,.0005,10);
   this.update = matrix => {
      if (! this.isEnabled) {
         this.beam.setMatrix(cg.mScale(0));
         return;
      }
      let m = cg.mMultiply(clay.inverseRootMatrix, matrix ? matrix : controllerMatrix[hand]);
      let update = (offset, fallback) =>
             this.beam.setMatrix(
                this.m = m.length ? cg.mMultiply(m, cg.mTranslate(offset))
                                  : cg.mTranslate(fallback));

      if (matrix) {
         let r = ! clay.handsWidget.point[hand] ? 0 :
                   clay.handsWidget.pinch[hand] ? .0015 : .0005;
         this.beam.child(0).identity().move(0,0,-10.14).scale(r,r,10);
      }
      else
         this.beam.child(0).identity().turnX(-bend)
                                      .move([0,.0212,-10.092])
                                      .scale(.0005,.0005,10);

      if (hand == 'left' ) update(matrix ? [0,0,0] : [0,0,0], [-.2,0,0]);
      if (hand == 'right') update(matrix ? [0,0,0] : [0,0,0], [ .2,0,0]);
   }
   this.beamMatrix = () =>
      cg.mMultiply(worldCoords,
                   window.handtracking ? this.m :
                                         cg.mMultiply(this.m, cg.mMultiply(cg.mRotateX(-bend),
			                                                   cg.mTranslate([0,.02,0]))));
   this.hitRect = m => this.isEnabled ? cg.mHitRect(this.beamMatrix(), m) : null;
   this.projectOntoBeam = P => {
      let bm = this.beamMatrix();	// get controller beam matrix
      let o = bm.slice(12, 15);		// get origin of beam
      let z = bm.slice( 8, 11);		// get z axis of beam
      let p = cg.subtract(P, o);	// shift point to be relative to beam origin
      let d = cg.dot(p, z);		// compute distance of point projected onto beam
      let q = cg.scale(z, d);		// find point along beam at that distance
      return cg.add(o, q);		// shift back to global space
   }
   this.hitLabel = label => this.hitRect(cg.mMultiply(worldCoords,
                                                      cg.mMultiply(label.getMatrixFromRoot(),
                                                                   cg.mScale(label.getInfo().length/2,1,1))));
}

let buttonPress = { left: [], right: [] };
for (let hand in buttonPress)
   for (let button = 0 ; button < buttonNum ; button++)
      buttonPress[hand].push(false);

export let controllerEventTypes = () => {
   let eventTypes = [];
   for (let hand in buttonPress)
      for (let button = 0 ; button < buttonNum ; button++)
         if (buttonState[hand][button]) {
            let prefix = (hand=='left' ? 'L' : 'R') + button + '_';
            let wasDown = buttonPress[hand][button];
            let isDown  = buttonState[hand][button].pressed;
	    if (window.handtracking)
               isDown ||= clay.handsWidget.pinch[hand] > 0;
            if (isDown && ! wasDown) eventTypes.push(prefix + 'press'  );
            if (      isDown       ) eventTypes.push(prefix + 'drag'   );
            if (wasDown && ! isDown) eventTypes.push(prefix + 'release');
            buttonPress[hand][button] = isDown;
         }
   return eventTypes;
}

