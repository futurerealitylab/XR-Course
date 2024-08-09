import * as cg from "/js/render/core/cg.js";

export let saveRoom = (roomID) => {

    let room = "room";
    room = room.concat(roomID.toString());

    let bound = "";

    for (let i = 0; i < window.xrRefSpace.boundsGeometry.length; i++) {
        bound = bound.concat(window.xrRefSpace.boundsGeometry[i].x.toString());
        bound = bound.concat(" ");
        bound = bound.concat(window.xrRefSpace.boundsGeometry[i].z.toString());
        bound = bound.concat(" ");
    }

    localStorage.setItem(room, bound);

}

export let getRoom = (roomID) => {

    let room = "room";
    room = room.concat(roomID.toString());

    return localStorage.getItem(room);

}

export let getAllRoom = () => {

    let str = "";

    for (let i = 0; i < 15; i++) {
        let room = "room";
        room = room.concat(i.toString());

        if (localStorage.getItem(room) != null) {
            str = str.concat("+");
            str = str.concat(i.toString());
            str = str.concat(":");
            str = str.concat(localStorage.getItem(room));
        }
    }

    return str;

}

export let receiveRoom = (str) => {

    strList = str.split("+");

    for (let i = 0; i < strList.length; i++) {
        if (strList[i].length > 0) {
            let roomStr = strList[i].split(":");
            localStorage.setItem(roomStr[0], roomStr[1]);
        }
    }

}

export let getRoomID = () => {
return -1;
    let minErr = 50;
    let id = -1;

    let currentBound = [];
    let currentX = 0;
    let currentZ = 0;

    if (window.xrRefSpace.boundsGeometry == undefined)
        return -1;

    for (let i = 0; i < window.xrRefSpace.boundsGeometry.length; i++) {
        currentX += window.xrRefSpace.boundsGeometry[i].x;
        currentZ += window.xrRefSpace.boundsGeometry[i].z;
    }

    currentX /= window.xrRefSpace.boundsGeometry.length;
    currentZ /= window.xrRefSpace.boundsGeometry.length;

    for (let i = 0; i < window.xrRefSpace.boundsGeometry.length; i++) {
        let dist = Math.sqrt((window.xrRefSpace.boundsGeometry[i].x - currentX) 
                           * (window.xrRefSpace.boundsGeometry[i].x - currentX)
                           + (window.xrRefSpace.boundsGeometry[i].z - currentZ) 
                           * (window.xrRefSpace.boundsGeometry[i].z - currentZ));
        currentBound.push(dist);
    }

    for (let i = 0; i < 15; i++) {
        let room = "room";
        room = room.concat(i.toString());

        if (localStorage.getItem(room) != null) {
            let roomInfo = localStorage.getItem(room);
            let roomStr = roomInfo.split(" ");

            let roomBoundPoints = [];

            for (let j = 0; j < roomStr.length; j++) {
                if (!isNaN(parseFloat(roomStr[j]))) {
                    roomBoundPoints.push(parseFloat(roomStr[j]));
                }
            }

            let roomX = 0;
            let roomZ = 0;
            let roomBound = [];

            for (let j = 0; j < roomBoundPoints.length - 1; j += 2) {
                roomX += roomBoundPoints[j];
                roomZ += roomBoundPoints[j + 1];
            }

            roomX /= (roomBoundPoints.length / 2);
            roomZ /= (roomBoundPoints.length / 2);

            for (let j = 0; j < roomBoundPoints.length - 1; j += 2) {
                let dist = Math.sqrt((roomBoundPoints[j] - roomX) 
                                   * (roomBoundPoints[j] - roomX)
                                   + (roomBoundPoints[j + 1] - roomZ) 
                                   * (roomBoundPoints[j + 1] - roomZ));
                roomBound.push(dist);
            }

            if (roomBound.length == currentBound.length) {
                let currentErr = 0;
                for (let k = 0; k < roomBound.length; k++) {
                    currentErr += (roomBound[k] - currentBound[k]) * (roomBound[k] - currentBound[k]);
                }

                if (currentErr < minErr) {
                    minErr = currentErr;
                    id = i;
                }
            }
        }
    }

    return id;

}
