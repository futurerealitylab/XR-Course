"use strict";

// TODO: add ping pong heartbeart to keep connections alive
// TODO: finish automatic reconnection
// TODO: max retries + timeout

export class Client {
    constructor(heartbeat = 30000) {
        this.heartbeatTick = heartbeat;
        this.ws = null;
        // this.subs = new evtPubSub();
    }

    // TODO: verify this is working
    heartbeat() {
        clearTimeout(this.pingTimeout);
        // Delay should be equal to the interval at which your server
        // sends out pings plus a conservative assumption of the latency.
        this.pingTimeout = setTimeout(() => {
            // this.close(); // i.e. revisit this...
        }, this.heartbeatTick + 1000);
    }

    // expected as a js object
    // TODO: add guaranteed delivery
    send(type, data) {
        let message;
        switch (type) {
            case "avatar":
                message = {
                    type: "avatar",
                    user: data,
                    ts: Date.now(),
                    state: {
                        mtx: window.avatars[data].headset.matrix,
                        pos: window.avatars[data].headset.position,
                        rot: window.avatars[data].headset.orientation,
                        controllers: {
                            left: {
                                mtx: window.avatars[data].leftController.matrix,
                                pos: window.avatars[data].leftController.position,
                                rot: window.avatars[data].leftController.orientation,
                            },
                            right: {
                                mtx: window.avatars[data].rightController.matrix,
                                pos: window.avatars[data].rightController.position,
                                rot: window.avatars[data].rightController.orientation,
                            },
                        },
                    },
                };
                break;

            case "webrtc":
                {
                    message = {
                        type: "webrtc",
                        uid: window.playerid,
                        state: data,
                        ts: Date.now(),
                    };
                }
                // console.log("send webrtc", message);
                break;
            case "object":
                {
                    // ZH: object update
                    message = {
                        type: "object",
                        ts: Date.now(),
                        uid: window.playerid,
                        id: data["id"],
                        state: data["state"],
                    };
                }
                break;
            case "objectInit":
                {
                    // ZH: object init
                    message = {
                        type: "objectInit",
                        ts: Date.now(),
                        uid: window.playerid,
                        state: data,
                    };
                }
                break;
            case "test":
                {
                    message = {
                        type: "test",
                        state: Date.now(),
                    };
                }
                break;
            case "mute":
                {
                    message = {
                        type: "mute",
                        uid: window.playerid,
                        state: data,
                    };
                }
                break;
            default:
                break;
        }
        this.ws.send(JSON.stringify(message));
    }

    connect(ip, port) {
        try {
            this.ws = new WebSocket("wss://" + ip + ":" + port);
            console.log("wss://" + ip + ":" + port);

            // function reconnect
            this.ws.onopen = () => {
                console.log("websocket is connected ...");
            };

            this.ws.onmessage = (ev) => {
                try {
                    let json = JSON.parse(ev.data);
                    window.EventBus.publish(json["type"], json);
                } catch (err) {
                    // console.log("bad json:", json);
                    console.error(err);
                }
            };
            this.ws.onclose = (event) => {
                switch (event.code) {
                    // CLOSE_NORMAL
                    case 1000:
                        console.log("WebSocket: closed");
                        break;
                    // Abnormal closure
                    default:
                        console.log("reconnecting...");
                        break;
                }
                console.log("disconnected");
                clearTimeout(this.pingTimeout);
            };

            this.ws.onerror = (e) => {
                switch (e.code) {
                    case "ECONNREFUSED":
                        console.error(e);
                        // reconnect(e);
                        this.ws.close();
                        break;
                    default:
                        // this.onerror(e);
                        break;
                }
            };
        } catch (err) {
            console.error("Couldn't load websocket", err);
        }
    }
}
