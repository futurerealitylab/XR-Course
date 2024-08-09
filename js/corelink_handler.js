"use strict";

import { initXR } from "../js/immersive-pre.js"
import { ab2str, corelink_message } from "../js/util/corelink_sender.js"
import { initSelfAvatar } from "../js/primitive/event.js"
import { initAvatar } from "../js/primitive/avatar.js"
import * as global from "../js/global.js";
import * as mtt from "../js/util/mtt/mtt.js"

const workspace = 'Chalktalk'
const protocol = 'ws'
// const datatype = ['sync', 'webrtc', 'event', 'init', 'bb'];
const datatype = ['sync', 'webrtc', 'event', 'init'];
var receiverdata = 0.0
export var metaroomSyncSender = "";
export var metaroomToioSender = ""
export var metaroomWebrtcSender = "";
export var metaroomEventSender = "";
export var metaroomInitSender = "";
export var metaroomSyncReceiver = "";
export var metaroomWebrtcReceiver = "";
export var metaroomEventReceiver = "";
export var metaroomInitReceiver = "";
export var metaroomBlackboardSender = "";

// realsense
var assembled_packets = {}
var last_assembled_frame = 0;

const isVerbose = (false) ? console : null;
// TODO: replace debug logs with above to preserve line numbers when printing
// example usage : isVerbose?.log(<...>) // NOTE: only use for debug stuff because performance is not
// yet fully understood for regular program use
let console_log = (...args) => { if (isVerbose) console_log(...args); }


window.offlineMode = true;
function checkInternet() {
    var ifConnected = window.navigator.onLine;
    if (ifConnected) {
        isVerbose?.log('Connection available');
    } else {
        window.offlineMode = true;
        isVerbose?.log('Connection not available');
    }
}

function handleRealsenseData(streamID, data, header) {
    let packet_info = header["packet"];
    let frame = parseInt(header["frame"]);
    if (frame > last_assembled_frame) {
        let breakpos = packet_info.indexOf("/");
        if (breakpos > -1) {
            let packnum = parseInt(packet_info.substring(0, breakpos));
            let packtotal = parseInt(packet_info.substring(breakpos + 1));
            if (packnum != NaN && packtotal != NaN) {
                if (!assembled_packets[streamID]) {
                    assembled_packets[streamID] = {};
                }
                if (!assembled_packets[streamID][frame]) {
                    assembled_packets[streamID][frame] = new Array(packtotal);
                }
                assembled_packets[streamID][frame][packnum - 1] = data;
                let packet_ready = true;
                for (let i = 0; i < packtotal; i++) {
                    if (!assembled_packets[streamID][frame][i]) {
                        packet_ready = false;
                    }
                }
                if (packet_ready) {
                    // let complete_packet = "";
                    // for (let i = 0; i < packtotal; i++) {
                    //     complete_packet += String.fromCharCode.apply(null, new Uint8Array(assembled_packets[streamID][frame][i]));
                    // }
                    // console_log(complete_packet);
                    // console_log("receive frame " + frame);
                    // receiverdata = JSON.parse(complete_packet);
                    // window[streamID + '_data'] = receiverdata;
                    // window.EventBus.publish(receiverdata["type"], receiverdata);
                    // delete assembled_packets[streamID][frame];
                    // last_assembled_frame = frame;
                    let totalLen = 0;
                    for (let i = 0; i < packtotal; i++) {
                        totalLen += assembled_packets[streamID][frame][i].byteLength;
                    }
                    let complete_packet = new Uint16Array(totalLen / 2); // divide by 2 since we have 2B per int
                    let pos = 0;
                    for (let i = 0; i < packtotal; i++) {
                        complete_packet.set(new Uint16Array(assembled_packets[streamID][frame][i]), pos);
                        pos += assembled_packets[streamID][frame][i].byteLength / 2;
                    }
                    console_log("receive frame " + frame + " total packets: " + packtotal);
                    window[streamID + '_data'] = complete_packet;
                    window.EventBus.publish("realsense", complete_packet);
                    delete assembled_packets[streamID][frame];
                    last_assembled_frame = frame;
                }
            }
        }
    } else {
        if (assembled_packets[streamID] && assembled_packets[streamID][frame]) {
            delete assembled_packets[streamID][frame];
        }
    }
}

export const run = async () => {
    checkInternet();
    initSelfAvatar(0);
    if (window.offlineMode) {
        // Start the XR application.
        await initXR();
        // Start the XR application.
        window.initxr = true;
        return;
    }

    var config = {};
    config.username = 'Testuser';
    config.password = 'Testpassword';
  config.host = 'corelink.hpc.nyu.edu';
    // config.host = 'localhost'
    // config.host = '10.19.161.212';
    config.port = 20012;

    global.setVerbosePrint(false);
    corelink.setDebug(global.isVerbosePrint());

    try {

        if (await corelink.connect({ username: config.username, password: config.password }, { ControlIP: config.host, ControlPort: config.port }).catch((err) => {
            console_log(err);
        })) {
            corelink.on('sender', (e) => console_log('sender callback', e));

            corelink.on('stale', (streamID) => {
                console_log("Stream has been dropped", streamID)
            });

            corelink.on('dropped', (streamID) => {
                console_log("Steam has been dropped", streamID)
            });

            if (metaroomSyncSender = await corelink.createSender({
                workspace, protocol, type: 'sync', echo: true, alert: true,
            }).catch((err) => { console_log(err) })) {
                console_log("ZH: metaroomSyncSender", metaroomSyncSender);
                // initialize
                initSelfAvatar(metaroomSyncSender);
            }

            // if (metaroomToioSender = await corelink.createSender({
            //     workspace, protocol, type: 'toioCmd', echo: true, alert: true,
            // }).catch((err) => { console_log(err) })) {
            //     console_log("ZH: metaroomToioSender", metaroomToioSender);
            // }

            if (metaroomWebrtcSender = await corelink.createSender({
                workspace, protocol, type: 'webrtc', echo: true, alert: true,
            }).catch((err) => { console_log(err) })) {
                console_log("ZH: metaroomWebrtcSender", metaroomWebrtcSender);
            }

            if (metaroomEventSender = await corelink.createSender({
                workspace, protocol, type: 'event', echo: false, alert: true,
            }).catch((err) => { console_log(err) })) {
                console_log("ZH: metaroomEventSender", metaroomEventSender);
            }

            if (metaroomInitSender = await corelink.createSender({
                workspace, protocol, type: 'init', echo: false, alert: true,
            }).catch((err) => { console_log(err) })) {
                // window.bInit = false;
                console_log("ZH: metaroomInitSender", metaroomInitSender);
                if (metaroomInitReceiver != "") {
                    var msg = corelink_message("init", {
                        displayName: window.playerid,
                        uuid: window.localUuid,
                        dest: "all",
                    });
                    corelink.send(metaroomInitSender, msg);
                    // setTimeout(10000, corelink.send(metaroomInitSender, msg));
                    console_log("corelink.send", msg);
                }
            }
            // Zhenyi
            // if (metaroomBlackboardSender = await corelink.createSender({
            //     workspace, protocol, type: 'bb', echo: true, alert: true,
            // }).catch((err) => { console_log(err) })) {
            //     console_log("ZH debug: metaroomBlackboardSender", metaroomBlackboardSender);
            // }
            console_log('finished creating sender');

            if (metaroomSyncReceiver = await corelink.createReceiver({
                workspace, protocol, type: "sync", echo: true, alert: true,
            }).catch((err) => { console_log(err) })) {
                console_log('finished creating sync receiver');
            }

            if (metaroomInitReceiver = await corelink.createReceiver({
                workspace, protocol, type: "init", echo: true, alert: true,
            }).catch((err) => { console_log(err) })) {
                console_log('finished creating init receiver')
                if (metaroomInitSender != "") {
                    var msg = corelink_message("init", {
                        displayName: window.playerid,
                        uuid: window.localUuid,
                        dest: "all",
                    });
                    corelink.send(metaroomInitSender, msg);
                    console_log("corelink.send", msg);
                }
            }

            if (metaroomEventReceiver = await corelink.createReceiver({
                workspace, protocol, type: "event", echo: true, alert: true,
            }).catch((err) => { console_log(err) })) {
                console_log('finished creating event receiver')
            }

            if (metaroomWebrtcReceiver = await corelink.createReceiver({
                workspace, protocol, type: "webrtc", echo: true, alert: true,
            }).catch((err) => { console_log(err) })) {
                console_log('finished creating webrtc receiver');
            }

            
            // metaroomReceiver.forEach(async data => {
            //     // console_log("[webrtc debug] metaroomReceiver.forEach", data.streamID, data.meta.name)
            //     // var btn = document.createElement("BUTTON")   // Create a <button> element
            //     // btn.innerHTML = " Plot: " + data.streamID + " " + data.meta.name
            //     // btn.id = "stream" + data.streamID
            //     // var iDiv = document.createElement('div')
            //     // iDiv.id = data.streamID
            //     // btn.onclick = () => plotmydata(iDiv.id)
            //     // document.body.appendChild(btn)
            //     // document.body.appendChild(iDiv)
            // })

            corelink.on('receiver', async (data) => {
                console_log("[webrtc debug] corelink.on('receiver', async (data)", data.streamID, data.meta.name)
                await corelink.subscribe({ streamIDs: [data.streamID] })
                if (!(data.streamID in window.avatars)) {
                    initAvatar(data.streamID);
                }
            })

            const TYPE_STRING_LITERAL = "MTT_T_STRING";
            const TYPE_COUNT = 1;

            function msgMake(msg) {
                return `{
                    "type" : "${TYPE_STRING_LITERAL}",
                    "msg" : "${msg}"
                }`;
            }

            function makeSendData(msg) {
                const encoded = global.utf8Encoder().encode(
                    msgMake("FC Hello world! received=[" + msg + "]")
                );
                return encoded;
            }

            const defaultTypes = new Set(["avatar", "realsense", "toioCmd", "robotCarCmd"]);
            corelink.on('data', (streamID, data, header) => {
                // speed up realsense handler
                if (header && header["packet"] && header["frame"]) {
                    handleRealsenseData(streamID, data, header);
                } else {
                    // other type
                    receiverdata = ab2str(data)
                    try {
                        var jsonObj = JSON.parse(receiverdata);
                        window[streamID + '_data'] = jsonObj;
                        window.EventBus.publish(jsonObj["type"], jsonObj);

                        
                        const IN_TYPE = jsonObj["type"];
                        if (!defaultTypes.has(IN_TYPE)) {
                            // global.setVerbosePrint(true);
                            // use global.setVerbosePrint(true) to enable
                            if (global.isVerbosePrint()) {
                                console_log("corelink.on('data', (streamID, data, header)", streamID,
                                window[streamID + '_data']["type"], window[streamID + '_data'])
                            }

                            if(IN_TYPE == "toioInfo") {
                                window.toioInfo = jsonObj["toioInfo"];
                                window.toioInfoFull = jsonObj;
                            } else if(IN_TYPE == "vive") {
                                window.viveInfo = jsonObj;
                                if(jsonObj["vivetracker"].length > 0) window.robotCarInfo = jsonObj["vivetracker"];
                            } else if(IN_TYPE == "Skeleton" && !window.sendRecordedViveData) {
                                window.skeletonFullInfo = jsonObj;
                                window.skeleton = jsonObj["Bones"];
                            } else if(IN_TYPE == "recordedSkeleton" && window.sendRecordedViveData) {
                                window.skeletonFullInfo = jsonObj;
                                window.skeleton = jsonObj["Bones"];
                            } else if(IN_TYPE == "Tablet") {
                                if(jsonObj.id == '6F8D8359-9D9B-4E7E-A2E2-3F1EAA66EEAE' ) window.ARCamTrans1 = jsonObj["arCamTrans"];
                                if(jsonObj.id == "1F1668AF-524E-45A3-9E3A-2BE0CB5B1A5F") window.ARCamTrans2 = jsonObj["arCamTrans"];
                            } else if(IN_TYPE == "Python") {
                                window.pythonInfo = jsonObj["Bones"];
                            } else if(IN_TYPE == "object") {
                                window.objectFullInfo = jsonObj;
                            } else if(IN_TYPE == window.team && jsonObj["uid"]!= window.localUuid) {
                                window.teamObj[jsonObj["uid"]] = jsonObj["objState"];
                                window.teamAvatar[jsonObj["uid"]] = jsonObj["avatarState"];
                                // console.log("team avatar", jsonObj["avatarState"])
                            } 
                            mtt.messageHandleIncomingJSON(mtt.ctx(), jsonObj);
                        }
                        
                    } catch (e) {
                        console.error(e);
                        console_log(receiverdata);
                    }
                }
            }).catch((err) => { console_log(err) })
            

            if (mtt.ctx().net.sender = await corelink.createSender({
                workspace, protocol, type: 'MTT', echo: false, alert: true,
            }).catch((err) => { console_log(err) })) {
                
            }

            if (mtt.ctx().net.receiver = await corelink.createReceiver({
                workspace, protocol, type: "MTT", echo: false, alert: true,
            }).catch((err) => { console_log(err) })) {
            }

            mtt.ctx().net.sendProcedure = corelink.send;

            await initXR();

            // Start the XR application.
            window.initxr = true;
        }
    } catch (err) {
        console.error(err);
        mtt.ctx().net.sendProcedure = () => { console.warn("cannot connect"); }

        await initXR();

        // Start the XR application.
        window.initxr = true;
    }
}

function rand() {
    return Math.random();
}
