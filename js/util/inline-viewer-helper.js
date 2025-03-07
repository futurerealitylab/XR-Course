// Copyright 2019 The Immersive Web Community Group
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

/*
Provides a simple method for tracking which XRReferenceSpace is associated with
which XRSession. Also handles the necessary logic for enabling mouse/touch-based
view rotation for inline sessions if desired.
*/

import { quat } from "../render/math/gl-matrix.js";
import * as keyboardInput from "./input_keyboard.js";

const EXPECTED_FRAME_TIME_INV = 60;

const LOOK_SPEED = 0.0025 * EXPECTED_FRAME_TIME_INV;
const WALK_SPEED = 0.02   * EXPECTED_FRAME_TIME_INV;

window.mouseX = 0;
window.mouseY = 0;
window.mouseZ = 0;

export class InlineViewerHelper {

  constructor(canvas, referenceSpace) {

    //this.theta = 2 * Math.PI * ((5 * window.playerid) % 8) / 8;
    //this.theta = Math.PI;
    this.theta = 0;
    this.lookYaw = this.theta;
    this.walkPosition = [-Math.sin(this.theta), 0, -Math.cos(this.theta)];

    this.lookPitch = 0;
    this.viewerHeight = 0;

    this.canvas = canvas;
    this.baseRefSpace = referenceSpace;
    this.refSpace = referenceSpace;

    this.dirty = false;
    this.deltaTime = 0;

    canvas.style.cursor = "grab";

    canvas.addEventListener("mousedown", event => {
      window.mouseX = event.x;
      window.mouseY = event.y;
      window.mouseZ = 1;
      if (window.interactMode == 2) {
         anidraw.mousedown(event);
	       return;
      }
    });

    canvas.addEventListener("mouseup", event => {
      window.mouseZ = 0;
      if (window.interactMode == 2) {
         anidraw.mouseup(event);
	 return;
      }
    });

    canvas.addEventListener("mousemove", event => {
      window.mouseX = event.x;
      window.mouseY = event.y;

      if (window.interactMode == 2) {
         anidraw.mousemove(event);
	 return;
      }

      // Only rotate when the left button is pressed
      if (event.buttons & 1) {
        if(window.interactMode == 0) this.rotateView(event.movementX, event.movementY);
      }
      if (window.webrtc_start != undefined) {
        window.webrtc_start();
      }
    });

    // Keep track of touch-related state so that users can touch and drag on
    // the canvas to adjust the viewer pose in an inline session.
    let primaryTouch = undefined;
    let prevTouchX = undefined;
    let prevTouchY = undefined;

    document.addEventListener("keydown", (event) => {
      this.onKeyDown(event);
    });

    document.addEventListener("keyup", (event) => {
      this.onKeyUp(event);
    });

    canvas.addEventListener("touchstart", (event) => {
      if (primaryTouch == undefined) {
        let touch = event.changedTouches[0];
        primaryTouch = touch.identifier;
        prevTouchX = touch.pageX;
        prevTouchY = touch.pageY;
      }
    });

    canvas.addEventListener("touchend", (event) => {
      for (let touch of event.changedTouches) {
        if (primaryTouch == touch.identifier) {
          primaryTouch = undefined;
          if(window.interactMode == 0) this.rotateView(touch.pageX - prevTouchX, touch.pageY - prevTouchY);
        }
      }
    });

    canvas.addEventListener("touchcancel", (event) => {
      for (let touch of event.changedTouches) {
        if (primaryTouch == touch.identifier) {
          primaryTouch = undefined;
        }
      }
    });

    canvas.addEventListener("touchmove", (event) => {
      for (let touch of event.changedTouches) {
        if (primaryTouch == touch.identifier && window.interactMode == 0) {
          this.rotateView(touch.pageX - prevTouchX, touch.pageY - prevTouchY);
          prevTouchX = touch.pageX;
          prevTouchY = touch.pageY;
        }
      }
    });
  }

  setHeight(value) {
    if (this.viewerHeight != value) {
      this.viewerHeight = value;
    }
    this.dirty = true;
  }

  rotateView(dx, dy) {
    const deltaTime = this.deltaTime;
    const change = LOOK_SPEED * deltaTime;
    this.lookYaw += dx * change;
    this.lookPitch += dy * change;
    if (this.lookPitch < -Math.PI * 0.5) {
      this.lookPitch = -Math.PI * 0.5;
    }
    if (this.lookPitch > Math.PI * 0.5) {
      this.lookPitch = Math.PI * 0.5;
    }
    this.dirty = true;
  }

  update() {
    const deltaTime = Math.min(this.deltaTime, 1.0);

    if(interactMode == 0) {
      if (keyboardInput.keyIsDown(keyboardInput.KEY_A)) {
        // console.log("strafe left");
        this.walkPosition[2] += WALK_SPEED * Math.cos(this.lookYaw + 0.5 * Math.PI) * deltaTime;
        this.walkPosition[0] += WALK_SPEED * Math.sin(this.lookYaw + 0.5 * Math.PI) * deltaTime;
      }
      if (keyboardInput.keyIsDown(keyboardInput.KEY_D)) {
        // console.log("strafe right");
        this.walkPosition[2] -= WALK_SPEED * Math.cos(this.lookYaw + 0.5 * Math.PI) * deltaTime;
        this.walkPosition[0] -= WALK_SPEED * Math.sin(this.lookYaw + 0.5 * Math.PI) * deltaTime;
      }
      if (keyboardInput.keyIsDown(keyboardInput.KEY_F)) {
	this.lookPitch -= deltaTime;
      }
      if (keyboardInput.keyIsDown(keyboardInput.KEY_C)) {
	this.lookPitch += deltaTime;
      }
      if (keyboardInput.keyIsDown(keyboardInput.KEY_W)) {
        // console.log("move forward");
        this.walkPosition[2] += WALK_SPEED * Math.cos(this.lookYaw) * deltaTime;
        this.walkPosition[0] += WALK_SPEED * Math.sin(this.lookYaw) * deltaTime;
      }
      if (keyboardInput.keyIsDown(keyboardInput.KEY_S)) {
        // console.log("move back");
        this.walkPosition[2] -= WALK_SPEED * Math.cos(this.lookYaw) * deltaTime;
        this.walkPosition[0] -= WALK_SPEED * Math.sin(this.lookYaw) * deltaTime;
      }
      if (keyboardInput.keyIsDown(keyboardInput.KEY_DOWN)) {
        // console.log("move forward");
        this.walkPosition[1] += WALK_SPEED * deltaTime;
      }
      if (keyboardInput.keyIsDown(keyboardInput.KEY_UP)) {
        // console.log("move back");
        this.walkPosition[1] -= WALK_SPEED * deltaTime;
      }
      let rotateYWalkPosition = sgn => {
	   let x = this.walkPosition[0];
	   let z = this.walkPosition[2];
	   let r = Math.sqrt(x*x + z*z);
	   let theta = Math.atan2(x, z) + sgn * WALK_SPEED * deltaTime;
	   this.walkPosition[0] = r * Math.sin(theta);
	   this.walkPosition[2] = r * Math.cos(theta);
      }
      if (keyboardInput.keyIsDown(keyboardInput.KEY_LEFT)) {
        // console.log("turn left");
        this.lookYaw += WALK_SPEED * deltaTime;
	if (this._isShiftKeyDown)
	   rotateYWalkPosition(1);
      }
      if (keyboardInput.keyIsDown(keyboardInput.KEY_RIGHT)) {
        // console.log("turn right");
        this.lookYaw -= WALK_SPEED * deltaTime;
	if (this._isShiftKeyDown)
	   rotateYWalkPosition(-1);
      }
      this.dirty = true;
    }
  }

  onKeyDown(e) {
    if (e.keyCode == 32) this._isSpaceKeyDown = true;
    if (e.key == 'Shift') this._isShiftKeyDown = true;
    if (e.key == 'Meta') this._isMetaKeyDown = true;
    if (e.key == 'Control') this._isControlKeyDown = true;
   
    if (window.interactMode == 2) {
       anidraw.keydown(e);
       return;
    }
   
    if (window.interactMode == 3) {
       editText.keydown(e);
       return;
    }
  }

  onKeyUp(e) {
    if (this._isControlKeyDown) {
       if (clay.model._controlActions[e.key]) {
          clay.model._controlActions[e.key].func();
          return;
       }
    }

    if (e.key == 't' && this._isSpaceKeyDown) {
       if (window.interactMode == 3)
          window.interactMode = 0;
       else
          window.interactMode = 3;
       this._editModeSwitch = true;
       return;
    }
    if (window.interactMode == 3) {
       if (! this._editModeSwitch)
          editText.keyup(e);
       this._editModeSwitch = false;
    }

    if (e.keyCode == 32) this._isSpaceKeyDown = false;
    if (e.key == '~') { window.isWhitescreen = ! window.isWhitescreen; return; }
    if (e.key == 'Shift') this._isShiftKeyDown = false;
    if (e.key == 'Meta') this._isMetaKeyDown = false;
    if (e.key == 'Control') this._isControlKeyDown = false;

    if (window.interactMode == 3)
       return;

    if (e.key == 'z' && this._isSpaceKeyDown) {
       if (window.interactMode == 2)
          window.interactMode = 0;
       else
          window.interactMode = 2;
       anidraw.showTimeline(window.interactMode == 2);
       return;
    }

    if (window.interactMode == 2) {
       anidraw.keyup(e);
       return;
    }

    switch (e.keyCode) {
      case keyboardInput.KEY_TAB:
        window.isMirrored = !window.isMirrored;
        break;
      case keyboardInput.KEY_ESC:
        window.isVideo = !window.isVideo;
        break;
      case keyboardInput.KEY_BACKQUOTE:
        toggleHeader();
/*
        window.isHeader = !window.isHeader;
        header.style.position = 'absolute';
        header.style.left = window.isHeader ? '8px' : '-1000px';
*/
        break;
      case keyboardInput.KEY_Z:
        window.isSlideShow = !window.isSlideShow;
        break;
      case keyboardInput.KEY_SPACE:
        if (this._isShiftKeyDown)
           window.interactMode = 1 - window.interactMode;
        break;
    }
    this.dirty = true;
  }

  reset() {
    this.lookYaw = 0;
    this.lookPitch = 0;
    this.refSpace = this.baseRefSpace;
    this.dirty = false;
  }

  // XRReferenceSpace offset is immutable, so return a new reference space
  // that has an updated orientation.
  get referenceSpace() {
    if (this.dirty) {
      // Represent the rotational component of the reference space as a
      // quaternion.
      let invOrient = quat.create();
      quat.rotateX(invOrient, invOrient, -this.lookPitch);
      quat.rotateY(invOrient, invOrient, -this.lookYaw);
      let xform = new XRRigidTransform(
        {},
        { x: invOrient[0], y: invOrient[1], z: invOrient[2], w: invOrient[3] }
      );
      this.refSpace = this.baseRefSpace.getOffsetReferenceSpace(xform);
      xform = new XRRigidTransform({ y: -this.viewerHeight });
      this.refSpace = this.refSpace.getOffsetReferenceSpace(xform);
      xform = new XRRigidTransform({ x: this.walkPosition[0], y: this.walkPosition[1], z: this.walkPosition[2], w: 1 });
      this.refSpace = this.refSpace.getOffsetReferenceSpace(xform);
      this.dirty = false;
    }
    return this.refSpace;
  }
}
