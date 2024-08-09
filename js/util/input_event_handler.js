"use strict";

import { onPress, onDrag, onRelease } from "../render/core/controllerInput.js";

// ZH: process controller input, as an event, for local or remote source
const debug = false;

function console_log(content) {
    if(debug) {
        console.log(content);
    }
}

export function left_controller_trigger(operation) {
    // console_log("in left_controller_trigger", operation);
    if (window["demoSyncTestState"] == 1) {
        console_log("demoSyncTestState");
        if (operation == "press")
            window.posY += 0.1;
    }
    if (operation == "press") {
        onPress("left", 0);
    } else if (operation == "drag") {
        onDrag("left", 0);
    } else if (operation == "release") {
        onRelease("left", 0);
    }
}

export function right_controller_trigger(operation) {
    console_log("right_controller_trigger", operation);
    if (window["demoSyncTestState"] == 1) {
        console_log("demoSyncTestState");
        if (operation == "press")
            window.posY += 0.1;
    }
    if (operation == "press") {
        onPress("right", 0);
    } else if (operation == "drag") {
        onDrag("right", 0);
    } else if (operation == "release") {
        onRelease("right", 0);
    }
}