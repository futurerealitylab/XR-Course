import { corelink_message } from "./corelink_sender.js"
import { metaroomSyncSender } from '../corelink_handler.js'

let isVerbose = false;

export function setSketchObjectSync() {
    setInterval(function () {
        if (window.playerid != null) {
            // to Ken: replace dataInfo with real info like window.ball in demoDesktopHand.js
            var dataInfo = { "speech": window.speech }
            var msg = corelink_message("sketchobject", dataInfo);
            corelink.send(metaroomSyncSender, msg);
            if (isVerbose) console.log("corelink.send", msg);
        }
    }, 100);
}

export function setEventSketchObjectHandler() {
    window.EventBus.subscribe("sketchobject", (json) => {
        if (isVerbose) console.log("[sketchobject]");
        if (json["uid"] == window.playerid) {
            if (isVerbose) console.log("self msg on sketchobject");
            //   return;
        }
        // to Ken: handle incoming object
        var newSketchObject = json["state"];
        if (isVerbose) console.log("incoming newSketchObject", newSketchObject);
        if(window.vr) window.speech = json["state"]["speech"];
    });
}
