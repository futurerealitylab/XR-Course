"use strict";

import { Gltf2Node } from "../render/nodes/gltf2.js";
import { mat4, vec3 } from "../render/math/gl-matrix.js";
import { corelink_event } from "../util/corelink_sender.js";
import * as global from "../global.js";

export function initAvatar(id) {
  // console.log("init avatar", id)
  let headset = new Headset();
  let leftController = new Controller("left");
  let rightController = new Controller("right");
  // setup render nodes for new avatar
  headset.model.name = "headset" + id;
  global.scene().addNode(headset.model);
  leftController.model.name = "LC" + id;
  global.scene().addNode(leftController.model);
  rightController.model.name = "RC" + id;
  global.scene().addNode(rightController.model);
  let avatar = new Avatar(headset, id, leftController, rightController);
  window.avatars[id] = avatar;
}

export class Avatar {
  constructor(head, id, leftController, rightController) {
    this.playerid = id;
    this.headset = head;
    this.leftController = leftController;
    this.rightController = rightController;
    // TODO: Do we really want this to be the default?
    // this.mode = MR.UserType.browser;
    // webrtc
    this.roomID = "chalktalk";
    this.localUuid = this.createUUID();
    this.localStream = null;
    this.name = "user" + id;
    this.nameTagColor = [0.5 + Math.random(),0.5 + Math.random(),1.2 + 2 * Math.random()];
    this.vr = false;

    this.audioContext = null;
    // toJson will be called in corelink_sender.js for generating the msg to be sent over corelink server
    this.toJson = function () {
      var jsonObj = {
        name: this.name,
        mtx: this.headset.matrix,
        pos: this.headset.position,
        rot: this.headset.orientation,
        color: this.nameTagColor,
        device: this.device,
        controllers: {
          left: {
            mtx: this.leftController.matrix,
            pos: this.leftController.position,
            rot: this.leftController.orientation,
            btn: this.leftController.toJson(),
          },
          right: {
            mtx: this.rightController.matrix,
            pos: this.rightController.position,
            rot: this.rightController.orientation,
            btn: this.rightController.toJson(),
          },
        },
      }
      // console.log("this.name", this.name, "jsonObj.name", jsonObj.name);
      return jsonObj;
    }
    // fromJson will be called in event.js for unpacking the msg from the server
    this.fromJson = function (payload) {
      this.headset.matrix = payload["state"]["mtx"];
      this.headset.position = payload["state"]["pos"];
      this.headset.orientation = payload["state"]["rot"];
      this.leftController.matrix = payload["state"]["controllers"]["left"]["mtx"];
      this.leftController.position = payload["state"]["controllers"]["left"]["pos"];
      this.leftController.orientation = payload["state"]["controllers"]["left"]["rot"];
      this.leftController.fromJson(payload["state"]["controllers"]["left"]["btn"]);
      this.rightController.matrix = payload["state"]["controllers"]["right"]["mtx"];
      this.rightController.position = payload["state"]["controllers"]["right"]["pos"];
      this.rightController.orientation = payload["state"]["controllers"]["right"]["rot"];
      this.rightController.fromJson(payload["state"]["controllers"]["right"]["btn"]);
      this.headset.model.visible = true;
      this.leftController.model.visible = false;
      this.rightController.model.visible = false;
      this.name = payload["state"]["name"];
      this.nameTagColor = payload["state"]["color"];
      this.device = payload["state"]["device"];
    }
  }

  // Taken from http://stackoverflow.com/a/105074/515584
  // Strictly speaking, it's not a real UUID, but it gets the job done here
  createUUID() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }

    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
  }
}

export class Headset {
  constructor(verts) {
    // this.vertices = verts;
    this.position = vec3.fromValues(0, 0, 0);
    this.orientation = [0, 0, 0, 1];
    this.matrix = mat4.fromValues(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    //this.model = new Gltf2Node({ url: './media/gltf/headset/headset.gltf' });
    this.model = new Gltf2Node({ url: '' });
    this.model.scale = vec3.fromValues(1, 1, 1);
    this.model.name = "headset";
    this.model.visible = true;
  }
}

export class Controller {
  constructor(handedness) {
    // this.vertices = verts;
    this.handedness = handedness;
    this.position = vec3.fromValues(0, 0, 0);
    this.orientation = [0, 0, 0, 1];
    this.analog = new Button();
    this.trigger = new Button();
    this.buttons = null;
    this.prevbuttons = null;
    // this.side = new Button();
    // this.x = new Button();
    // this.y = new Button();
    if (handedness == "left") {
      this.model = new Gltf2Node({ url: './media/gltf/controller/controller-left.gltf' });
    }
    else {
      this.model = new Gltf2Node({ url: './media/gltf/controller/controller.gltf' });
    }
    this.matrix = mat4.fromValues(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    this.model.scale = vec3.fromValues(1, 1, 1);
    this.model.name = "ctrl";
    this.model.visible = false;

    this.updateButtons = function (src, newBtns) {
      // send corelink msg if changed
      // if (this.prevbuttons)
      // console.log("updateButtons", this.prevbuttons[3].pressed, this.buttons[3].pressed);
      const buttonCount = newBtns.length;

      // NOTE: to handle multiple devices, initialize with profile info on start
      // 
      // to find the profile(s)
      // for input devices, see 
      // https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API/Inputs#input_profiles
      // uncomment to see the profile info
      // {
      //    console.log(src.profiles);
      // }
      // next: go to https://github.com/immersive-web/webxr-input-profiles
      // which has a registry of pre-made metadata for accessing the inputs by name
      //
      // e.g. All Oculus controllers:
      // https://github.com/immersive-web/webxr-input-profiles/tree/main/packages/registry/profiles/oculus
      //
      // Vive:
      // https://github.com/immersive-web/webxr-input-profiles/blob/main/packages/registry/profiles/htc/htc-vive.json
      // etc.

      if (this.buttons) {
        for (let i = 0; i < buttonCount; i++) {
          if ((!this.prevbuttons && this.buttons[i].pressed)
            || (this.prevbuttons && this.buttons[i].pressed && !this.prevbuttons[i].pressed)) {
              corelink_event({ it: this.handedness + "trigger", op: "press" });
          }
          else if ((!this.prevbuttons && this.buttons[i].pressed)
            || (this.prevbuttons && this.buttons[i].pressed && this.prevbuttons[i].pressed)) {
              corelink_event({ it: this.handedness + "trigger", op: "drag" });
          }
          else if ((!this.prevbuttons && !this.buttons[i].pressed)
            || (this.prevbuttons && !this.buttons[i].pressed && this.prevbuttons[i].pressed)) {
              corelink_event({ it: this.handedness + "trigger", op: "release" });
          }
        }
      
      
        if (!this.prevbuttons) {
          this.prevbuttons = Array.from({ length: buttonCount }, (v, i) => i);
          for (let i = 0; i < buttonCount; i++) {
            this.prevbuttons[i] = {
              pressed: false,
              touched: false,
            };
          }
        }

        // this.prevbuttons = Array.from(this.buttons);
        for (let i = 0; i < buttonCount; i++) {
          this.prevbuttons[i].pressed = this.buttons[i].pressed;//JSON.parse(JSON.stringify(this.buttons[i]));
          this.prevbuttons[i].touched = this.buttons[i].touched;
        }
      }

      this.buttons = newBtns;
    }

    this.toJson = function () {
      var jsonObj = {
        analog: this.analog.pressed,
        trigger: this.trigger.pressed,
        handedness: this.handedness,
        buttons: this.buttons,
      }
      // console.log("this.name", this.name, "jsonObj.name", jsonObj.name);
      return jsonObj;
    }
    // fromJson will be called in event.js for unpacking the msg from the server
    this.fromJson = function (payload) {
      this.analog.pressed = payload["analog"];
      this.trigger.pressed = payload["trigger"];
      this.buttons = payload["buttons"];
    }
  }
}

export class Button {
  //buttons have a 'pressed' variable that is a boolean.
  /*A quick mapping of the buttons:
    0: analog stick
    1: trigger
    2: side trigger
    3: x button
    4: y button
    5: home button
  */
  constructor() {
    this.pressed = false;
  }
}

window.updateName = function () {
  window.avatars[window.playerid].name = document.getElementById("name").value;
}
