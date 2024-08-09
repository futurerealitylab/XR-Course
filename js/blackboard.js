import { metaroomSyncSender } from "./corelink_handler.js";
import { corelink_message } from "./util/corelink_sender.js"

window.blackboard = {};
window.blackboardhistory = {};

window.setBlackboard = function (KEY_NAME, VALUE) {
    setBlackboardLocal(KEY_NAME, VALUE)
    var index = Date.now();
    var msg = corelink_message("blackboard", { key: KEY_NAME, value: VALUE, index: index });
    corelink.send(metaroomSyncSender, msg);
    // Q1: is it enough to only record key_name? Q2: Date.now() may vary from clients, how about using unique ID?
}

export function setBlackboardLocal(key, value, index) {
    window.blackboard[key] = value;
    window.blackboardhistory[index] = key;
}

window.getBlackboard = function (KEY_NAME) {
    return window.blackboard[KEY_NAME];
}

window.getBlackboardHistory = function (index) {
    return window.blackboardhistory[index];
}

// window.sendBlackboard = function (key, value) {
//     var msg = corelink_message("blackboard", { key: key, value: value, });
//     corelink.send(metaroomSyncSender, msg);
// }