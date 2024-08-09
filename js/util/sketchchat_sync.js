'use strict'

import { corelink_message } from "./corelink_sender.js"
import { metaroomSyncSender } from '../corelink_handler.js'

export function setSketchchatSync() {

    setInterval(function () {
        if (window.playerid != null) {
            var sketchchat_syncobj = {
                "hand": window.handInfo[window.name],
                "name": window.name,
            }

            // if (anidraw.hasNewState()) {
            //     sketchchat_syncobj.anidraw = anidraw.getState();
            //     anidraw.unsetNewState();
            // }

            if (window.ball)
                sketchchat_syncobj.ball = window.ball;
            var msg = corelink_message("sketchchat", sketchchat_syncobj);
            // ZH
            corelink.send(metaroomSyncSender, msg);
            // console.log("corelink.send", msg);
        }
    }, 40);
}

export function setEventSketchChatHandler() {
    window.EventBus.subscribe("sketchchat", (json) => {
        if (json["state"].name != window.name) {
            window.handInfo[json["state"].name] = json["state"].hand;
            console.log("window.handInfo", window.handInfo);
        }

        if (json["state"].name != window.name) {

            if (json.state.anidraw)
                anidraw.setState(json.state.anidraw);

            let ballData = json.state.ball;
            console.log('FROM', json.state.name, 'RECEIVING BALL DATA', ballData);
        }
    });
}
