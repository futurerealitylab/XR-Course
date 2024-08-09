// this script is about managing the object synchronization, including creating an object that is shared in public

'use strict';

import { Gltf2Node } from '../render/nodes/gltf2.js';
import { mat4, vec3 } from '../render/math/gl-matrix.js';
import { corelink_message } from './corelink_sender.js';
import { metaroomSyncSender } from '../corelink_handler.js'
import * as global from '../global.js';

window.envObjID = 10000;
export function initObject(objectType, objectMatrix, objid = 0) {
    // add objects
    // client side: request an ID from the server with curObject: type, transformation
    // server side: send object updates

    // window.wsclient.send("objectInit", { type: objectType, matrix: objectMatrix, objid: objid });
    var coremsg = corelink_message("object", { type: objectType, matrix: objectMatrix, objid: objid })
    corelink.send(metaroomSyncSender, coremsg);
    // console.log("corelink.send", msg);
}

export function updateObject(objectID) {
    // window.wsclient.send("object",
    //     {
    //         id: objectID,
    //         state: {
    //             type: window.objects[objectID].type,
    //             matrix: objectMatrix,
    //         },
    //     });
    var msg = corelink_message("object", window.objects[objectID].toJson());
    corelink.send(metaroomSyncSender, msg);
}

export class SyncObject {
    constructor(id, type = 'nil') {
        this.objid = id;
        this.matrix = mat4.fromValues(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
        this.type = type;
        this.node = null;
        this.draggingTransform = undefined;
        this.draggingInput = undefined;

        this.toJson = function () {
            // { type: objectType, matrix: objectMatrix, objid: objid }
            var jsonObj = {
                type: this.type,
                matrix: this.node.matrix,
                objid: this.objid,
            };
            return jsonObj;
        }

        this.fromJson = function (dirtyObject) {
            this.matrix = dirtyObject["matrix"];
        }
    }
}

window.syncDemos = function () {
    // window[flag]
    // window.demoNames
    var flags = {};
    global.demoNames().split(",").forEach(element => {
        if (element != "Speak") {
            var temp = 'demo' + element + 'State';
            flags[temp] = window[temp];
        }
    });
    var msg = corelink_message("demo", flags);
    corelink.send(metaroomSyncSender, msg);
}