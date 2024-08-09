const fs = require("fs");
const http = require("http");
const https = require("https");
const WebSocket = require("ws");
const DataStore = require("./DataStore.js");
const util = require("util");

// const yargs = require('yargs');
// based on examples at https://www.npmjs.com/package/ws
const WebSocketServer = WebSocket.Server;

var env = "remote";
var port = 8447;

// process console parameters
var myArgs = process.argv.slice(2);
console.log('myArgs: ', myArgs);
myArgs.forEach((arg, index) => {
    if (arg.includes("-")) {
        var command = arg.substr(1);
        switch (command) {
            case 'env':
                env = myArgs[index + 1];
                console.log("update env with " + env)
                break;
            default:
                break;
        }
    }
});

// Yes, TLS is required
const serverConfig =
    env == "local"
        ? {
            key: fs.readFileSync("key.pem"),
            cert: fs.readFileSync("cert.pem"),
        }
        : {
            key: fs.readFileSync(
                "/www/server/panel/vhost/cert/eye.3dvar.com/privkey.pem"
            ),
            cert: fs.readFileSync(
                "/www/server/panel/vhost/cert/eye.3dvar.com/fullchain.pem"
            ),
        };

// ----------------------------------------------------------------------------------------

// Create a server for the client html page
const handleRequest = function (request, response) {
    // Render the single client html file for any request the HTTP server receives
    // console.log('request received: ' + request.url);
    if (request.url.endsWith(".png")) {
        if (!request.url.startsWith(".")) {
            request.url = "." + request.url;
        }
        // console.log('request received: ' + request.url);
        response.writeHead(200, { "Content-Type": "image/png" });
        response.end(fs.readFileSync(request.url));
    } else if (request.url.endsWith(".gif")) {
        response.writeHead(200, { "Content-Type": "image/gif" });
        response.end(fs.readFileSync(request.url));
    } else if (request.url.endsWith(".fbx")) {
        response.writeHead(200, { "Content-Type": "text/plain" });
        response.end(fs.readFileSync(request.url));
    } else if (request.url.endsWith(".js")) {
        response.writeHead(200, { "Content-Type": "application/javascript" });
        if (request.url.includes("../")) {
            response.end(fs.readFileSync(request.url.replace("../", "")));
        } else {
            if (!request.url.startsWith(".")) {
                request.url = "." + request.url;
            }
            // console.log('request received: ' + request.url);
            response.end(fs.readFileSync(request.url));
        }
    } else if (request.url.endsWith(".css")) {
        if (!request.url.startsWith(".")) {
            request.url = "." + request.url;
        }
        // console.log('request received: ' + request.url);
        response.writeHead(200, { "Content-Type": "text/css" });
        response.end(fs.readFileSync(request.url));
    } else if (request.url.endsWith(".ogg")) {
        if (!request.url.startsWith(".")) {
            request.url = "." + request.url;
        }
        // console.log('request received: ' + request.url);
        response.writeHead(200, { "Content-Type": "audio/ogg" });
        response.end(fs.readFileSync(request.url));
    } else if (request.url.endsWith(".svg")) {
        if (!request.url.startsWith(".")) {
            request.url = "." + request.url;
        }
        // console.log('request received: ' + request.url);
        response.writeHead(200, { "Content-Type": "image/svg+xml" });
        response.end(fs.readFileSync(request.url));
    } else if (request.url.endsWith(".html")) {
        if (!request.url.startsWith(".")) {
            request.url = "." + request.url;
        }
        // console.log('request received: ' + request.url);
        response.writeHead(200, { "Content-Type": "text/html" });
        response.end(fs.readFileSync(request.url));
    } else if (request.url == "/") {
        response.writeHead(200, { "Content-Type": "text/html" });
        response.end(fs.readFileSync("./index.html"));
    } else {
        if (!request.url.startsWith(".")) {
            request.url = "." + request.url;
        }
        response.writeHead(200, { "Content-Type": "text/plain" });
        response.end(fs.readFileSync(request.url));
    }
};

var HTTPS_PORT = port; //default port for https is 443
var HTTP_PORT = HTTPS_PORT - 442; //default port for http is 80
const httpsServer = https.createServer(serverConfig, handleRequest);
httpsServer.listen(HTTPS_PORT);
// console.log("httpsServer:", httpsServer);
// ----------------------------------------------------------------------------------------

// Create a server for handling websocket calls
const wss =
    // argv.env == "local" ? new WebSocketServer({ port: 3448 }) :
    new WebSocketServer({ server: httpsServer });
// console.log("wss:" + wss.options.host + "-" + wss.options.path + ":" + wss.options.port);

let wsIndex = 100;
let websocketMap = new Map();
const datastore = new DataStore();
let avatars = {};
let timers = {};
const AVATAR_RATE = 10;
const OBJECT_RATE = 10;
let objectIndex = 1000;
setInterval(() => {
    console.log("current connections:");
    console.log(Array.from(websocketMap.keys()));
    // console.log("avatars: ");
    // console.log(avatars);
    // for (let id in avatars) {
    //     var quat = avatars[id]["state"]["rot"];
    //     var fwd = [0, 0, 0];
    //     transformQuat(fwd, [0, 0, -1], quat);
    //     console.log("id", id, "pos:", JSON.stringify(avatars[id]["state"]["pos"]), "fwd", JSON.stringify(fwd));
    // }
}, 5000);

function transformQuat(out, vec, quat) {
    var q = quat;
    if (quat.x != undefined) q = [quat.x, quat.y, quat.z, quat.w];
    var a = vec;
    if (vec.x != undefined) a = [vec.x, vec.y, vec.z];
    let qx = q[0],
        qy = q[1],
        qz = q[2],
        qw = q[3];
    let x = a[0],
        y = a[1],
        z = a[2];
    let uvx = qy * z - qz * y,
        uvy = qz * x - qx * z,
        uvz = qx * y - qy * x;
    let uuvx = qy * uvz - qz * uvy,
        uuvy = qz * uvx - qx * uvz,
        uuvz = qx * uvy - qy * uvx;
    let w2 = qw * 2;
    uvx *= w2;
    uvy *= w2;
    uvz *= w2;
    uuvx *= 2;
    uuvy *= 2;
    uuvz *= 2;
    out[0] = x + uvx + uuvx;
    out[1] = y + uvy + uuvy;
    out[2] = z + uvz + uuvz;
    return out;
}

function send(to, from, message) {
    if (to == "*") {
        // send to all
        wss.clients.forEach(function each(client) {
            // console.log("send ", client.index, client.isAlive, client.readyState);
            if (from == client.index) {
                return;
            }

            if (client.readyState === WebSocket.OPEN) {
                // console.log('\tsend to', client.index, 'message:' + util.inspect(message["type"], {showHidden: false, depth: null}));//util.inspect(entry["message"], {showHidden: false, depth: null})
                client.send(JSON.stringify(message));
            } else if (client.readyState === WebSocket.CLOSING) {
                console.log("ws not open:", client.index, message);
            } else if (client.readyState === WebSocket.CLOSED) {
                console.log("ws not open:", client.index, message);
            } else if (client.readyState === WebSocket.CONNECTING) {
                console.log("ws not open:", client.index, message);
            }
        });
    } else {
        console.log("sending to:", to);
        const dst = websocketMap.get(to);
        if (dst) {
            dst.send(JSON.stringify(message));
        }
    }
}

function leave(index, username) {
    console.log("close: websocketMap.keys():", Array.from(websocketMap.keys()));
    if (!websocketMap.get(index)) {
        return;
    }

    delete avatars[index];
    console.log(avatars);
    // clearInterval(timerID);
    // TODO: change ip to username
    console.log(index);
    const response = { type: "leave", user: index };
    send("*", index, response);
    websocketMap.get(index).close();
    websocketMap.delete(index);
}

wss.on("connection", function (ws, req) {
    ws.index = wsIndex++;
    websocketMap.set(ws.index, ws);
    console.log("connection:", req.connection.remoteAddress, ws.index);
    console.log('datastore.state["objects"]', datastore.state["objects"]);
    const payload2others = { type: "initialize", id: ws.index, avatars: avatars };
    const payload2self = {
        type: "object",
        data: {
            len: Object.keys(datastore.state["objects"]).length,
            ds: datastore.state["objects"],
        },
        ts: Date.now(),
    };

    send(ws.index, -1, payload2others);
    // send('*', ws.index, payload2self);

    // notify the world that a player joined, should be a separate process from initialize
    // TODO: change id to username or something
    send("*", -1, { type: "join", id: ws.index });

    ws.on("message", function (data) {
        // Broadcast any received message to all clients
        //wss.broadcast(message);

        // deal with it according to different msg
        // console.log(data);
        let json = {};
        try {
            json = JSON.parse(data.toString());
        } catch (err) {
            // console.log(err);
            return;
        }

        switch (json["type"]) {
            // ZH: obj
            case "object": {
                // about manipulation
                console.log("receive ws msg:", json["type"]);
                const key = json["uid"];
                const id = json["id"];
                const state = json["state"];

                datastore.setObjectData(id, state);
                break;
            }
            // ZH: obj init
            case "objectInit": {
                const key = json["uid"];
                const state = json["state"];
                console.log("receive ws msg:", json["type"]);
                if (state["objid"] == 0) {
                    // create by user
                    console.log("create object from user", json["uid"]);
                    var currentObjId = objectIndex++;
                    datastore.add(currentObjId);
                    datastore.setObjectData(currentObjId, state);
                } else {
                    // create for the environment
                    if (datastore.exists(state["objid"])) {
                        // already create, then ignore this request
                    } else {
                        console.log("create object for environment", state["objid"]);
                        datastore.add(state["objid"]);
                        datastore.setObjectData(state["objid"], state);
                    }
                }

                // tell everyone else about this update, with entire list of objects
                var dirtyObjects = {};
                Object.keys(datastore.state["objects"]).forEach(function (key) {
                    // console.log(key, datastore.state["objects"][key]);
                    if (datastore.state["objects"][key]["dirty"]) {
                        datastore.state["objects"][key]["dirty"] = false;
                    }
                    dirtyObjects[key] = datastore.state["objects"][key];
                });

                const response = {
                    type: "object",
                    uid: key,
                    data: dirtyObjects,
                    success: true,
                };
                console.log(response);
                send("*", -1, response);
                break;
            }
            case "avatar": {
                // console.log("receive avatar msg");                    // console.log(json);
                const userid = json["user"];
                const state = json["state"];
                avatars[userid] = {
                    user: userid,
                    state: state,
                    ts: Date.now(),
                };
                // console.log(avatars);
                break;
            }
            case "webrtc": {
                console.log("receive ws msg:", json["type"], json["ts"], Date.now());
                // console.log(json["type"], avatars);
                const key = json["uid"];
                const state = json["state"];

                // avatars[key].webrtc = state[uuid];
                const response = {
                    type: "webrtc",
                    id: ws.index,
                    uid: key,
                    state: state,
                    ts: Date.now(),
                    success: true,
                };
                send("*", -1, response);
                break;
            }
            case "test": {
                console.log("receive test ", json["state"], "at", Date.now());
                const response = {
                    type: "test",
                    id: ws.index,
                    ts: Date.now(),
                    state: state,
                    success: true,
                };
                send("*", -1, response);
                break;
            }
            case "mute":
                {
                    console.log(
                        "receive mute from ",
                        ws.index,
                        json["state"],
                        "at",
                        Date.now()
                    );
                    const response = {
                        type: "mute",
                        id: ws.index,
                        ts: Date.now(),
                        success: true,
                        state: json["state"],
                    };
                    send("*", ws.index, response);
                }
                break;
            case "3d":
                {
                    console.log("recv 3d data");
                }
                break;
            default:
                break;
        }
    });

    ws.on("error", () => ws.terminate());

    ws.on("close", () => {
        console.log(".");
        leave(ws.index);
    });
});

wss.broadcast = function (data) {
    this.clients.forEach(function (client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
};

console.log("Server running with port " + HTTPS_PORT);

// ----------------------------------------------------------------------------------------

// Separate server to redirect from http to https
// http.createServer(function (req, res) {
//     console.log(req.headers['host'] + req.url);
//     res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
//     res.end();
// }).listen(HTTP_PORT);

timers["avatar"] = setInterval(() => {
    if (Object.keys(avatars).length === 0) {
        return;
    }
    // zhenyi
    const response = {
        type: "avatar",
        data: avatars,
        ts: Date.now(),
    };
    // console.log("timers[avatar] ", avatars);
    send("*", -1, response);
}, AVATAR_RATE);

timers["object"] = setInterval(() => {
    if (Object.keys(datastore.state["objects"]).length === 0) {
        return;
    }
    // zhenyi
    var dirtyObjects = {};
    Object.keys(datastore.state["objects"]).forEach(function (key) {
        // console.log(key, datastore.state["objects"][key]);
        if (datastore.state["objects"][key]["dirty"]) {
            datastore.state["objects"][key]["dirty"] = false;
            dirtyObjects[key] = datastore.state["objects"][key];
        }
    });

    const response = {
        type: "object",
        data: dirtyObjects,
        ts: Date.now(),
    };
    // console.log("timers[avatar] ", avatars);
    send("*", -1, response);
}, OBJECT_RATE);
