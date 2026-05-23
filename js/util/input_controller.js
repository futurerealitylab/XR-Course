import { quat } from "../render/math/gl-matrix.js";
import * as keyboardInput from "./input_keyboard.js";

const WALK_SPEED = 0.05;
const KEYBOARD_MOVE_SPEED = 1.35;
const KEYBOARD_TURN_SPEED = 1.6;
const KEYBOARD_PITCH_SPEED = 1.0;

export class InputController {
    constructor(referenceSpace) {
      //this.theta = 2 * Math.PI * ((7 * window.playerid) % 12) / 12;
      //this.theta = Math.PI;
      this.theta = 0;
      this.lookYaw = this.theta;
      this.lookPitch = 0;
      this.viewerHeight = 0;

      //this.walkPosition = [-Math.sin(this.theta), 0, -Math.cos(this.theta)];
      this.walkPosition = [-.5 * Math.sin(this.theta), 0, -.5 * Math.cos(this.theta)];
  
      this.baseRefSpace = referenceSpace;
      this.refSpace = referenceSpace;
  
      this.dirty = true;
  
      // Keep track of touch-related state so that users can touch and drag on
      // the canvas to adjust the viewer pose in an inline session.
      let primaryTouch = undefined;
      let prevTouchX = undefined;
      let prevTouchY = undefined;
    }

    walk(x,y){
        this.walkPosition[0] += WALK_SPEED * x;
        this.walkPosition[2] += WALK_SPEED * y;
        this.dirty = true;
    }

    setHeight(value) {
      if (!Number.isFinite(value)) {
        return this.viewerHeight;
      }

      if (this.viewerHeight !== value) {
        this.viewerHeight = value;
        this.dirty = true;
      }

      return this.viewerHeight;
    }

    adjustHeight(delta) {
      if (!Number.isFinite(delta) || delta === 0) {
        return this.viewerHeight;
      }

      return this.setHeight(this.viewerHeight + delta);
    }

    update(deltaTime) {
      if (window.interactMode !== 0) {
        return;
      }

      const dt = Math.min(Math.max(deltaTime || 0, 0), 0.1);
      if (dt === 0) {
        return;
      }

      if (keyboardInput.keyIsDown(keyboardInput.KEY_W)) {
        this.walkPosition[2] += KEYBOARD_MOVE_SPEED * Math.cos(this.lookYaw) * dt;
        this.walkPosition[0] += KEYBOARD_MOVE_SPEED * Math.sin(this.lookYaw) * dt;
        this.dirty = true;
      }

      if (keyboardInput.keyIsDown(keyboardInput.KEY_S)) {
        this.walkPosition[2] -= KEYBOARD_MOVE_SPEED * Math.cos(this.lookYaw) * dt;
        this.walkPosition[0] -= KEYBOARD_MOVE_SPEED * Math.sin(this.lookYaw) * dt;
        this.dirty = true;
      }

      if (keyboardInput.keyIsDown(keyboardInput.KEY_A)) {
        this.walkPosition[2] += KEYBOARD_MOVE_SPEED * Math.cos(this.lookYaw + 0.5 * Math.PI) * dt;
        this.walkPosition[0] += KEYBOARD_MOVE_SPEED * Math.sin(this.lookYaw + 0.5 * Math.PI) * dt;
        this.dirty = true;
      }

      if (keyboardInput.keyIsDown(keyboardInput.KEY_D)) {
        this.walkPosition[2] -= KEYBOARD_MOVE_SPEED * Math.cos(this.lookYaw + 0.5 * Math.PI) * dt;
        this.walkPosition[0] -= KEYBOARD_MOVE_SPEED * Math.sin(this.lookYaw + 0.5 * Math.PI) * dt;
        this.dirty = true;
      }

      if (keyboardInput.keyIsDown(keyboardInput.KEY_LEFT) || keyboardInput.keyIsDown(keyboardInput.KEY_J)) {
        this.lookYaw += KEYBOARD_TURN_SPEED * dt;
        this.dirty = true;
      }

      if (keyboardInput.keyIsDown(keyboardInput.KEY_RIGHT) || keyboardInput.keyIsDown(keyboardInput.KEY_L)) {
        this.lookYaw -= KEYBOARD_TURN_SPEED * dt;
        this.dirty = true;
      }

      if (keyboardInput.keyIsDown(keyboardInput.KEY_UP) || keyboardInput.keyIsDown(keyboardInput.KEY_I)) {
        this.lookPitch -= KEYBOARD_PITCH_SPEED * dt;
        this.dirty = true;
      }

      if (keyboardInput.keyIsDown(keyboardInput.KEY_DOWN) || keyboardInput.keyIsDown(keyboardInput.KEY_K)) {
        this.lookPitch += KEYBOARD_PITCH_SPEED * dt;
        this.dirty = true;
      }

      this.lookPitch = Math.max(-Math.PI * 0.5, Math.min(Math.PI * 0.5, this.lookPitch));
    }
  
    reset() {
      this.lookYaw = 2 * Math.PI * ((7 * window.playerid) % 12) / 12;
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
        xform = new XRRigidTransform({x: this.walkPosition[0], y: this.walkPosition[1], z: this.walkPosition[2], w: 1});
        this.refSpace = this.refSpace.getOffsetReferenceSpace(xform);
        this.dirty = false;
      }
      return this.refSpace;
    }
  }
