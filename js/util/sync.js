import * as cg from "/js/render/core/cg.js";
import * as room_mng from "/js/util/room_manager.js";

export let setOriginPos = (worldCoords) => {
    if (window.xrRefSpace.boundsGeometry === undefined)
       return;

    let bound = "";

    for (let i = 0; i < window.xrRefSpace.boundsGeometry.length; i++) {
        bound = bound.concat(window.xrRefSpace.boundsGeometry[i].x.toString());
        bound = bound.concat(" ");
        bound = bound.concat(window.xrRefSpace.boundsGeometry[i].z.toString());
        bound = bound.concat(" ");
    }

    let originCoords = "";

    for (let i = 0; i < worldCoords.length; i++) {
        originCoords = originCoords.concat(worldCoords[i].toString());
        originCoords = originCoords.concat(" ");
    }

    localStorage.setItem("BoundInfo", bound);
    localStorage.setItem("OriginCoords", originCoords);

}

export let syncBound = () => {
 
    // Set up correct room ID
    let id = room_mng.getRoomID();
    window.roomID = id;
   // return;
    // Access the origin bound information.
    let originBoundInfo = localStorage.getItem("BoundInfo");
    if (originBoundInfo == null)
        return;
    let originBoundStr = originBoundInfo.split(" ");
    let originBound = [];
    for (let i = 0; i < originBoundStr.length; i++) {
        if (!isNaN(parseFloat(originBoundStr[i]))) {
            originBound.push(parseFloat(originBoundStr[i]));
        }
    }

    // Access the current bound information.
    let newBound = [];
    if (window.xrRefSpace.boundsGeometry === undefined) return;
    if (window.xrRefSpace.boundsGeometry.length == 0) return;
    
    for (let i = 0; i < window.xrRefSpace.boundsGeometry.length; i++) {
        newBound.push(window.xrRefSpace.boundsGeometry[i].x);
        newBound.push(window.xrRefSpace.boundsGeometry[i].z);
    }

    // (originX, originZ) is the center position of the origin bound information on the horizontal plane which has been saved in the browser cache
    let originX = 0;
    let originZ = 0;
    // (newX, newZ) is the center position of the current bound information on the horizontal plane which is exposed in the current session.
    let newX = 0;
    let newZ = 0;
    // By comparing these two points, we can know how much the user transform has been deviated from the last time the origin bound is saved.

    // Calculate the origin center
    for (let i = 0; i < originBound.length - 1; i += 2) {
        originX += originBound[i];
        originZ += originBound[i + 1];
    }

    originX /= (originBound.length / 2);
    originZ /= (originBound.length / 2);

    // Calculate the current center
    for (let i = 0; i < newBound.length - 1; i += 2) {
        newX += newBound[i];
        newZ += newBound[i + 1];
    }

    newX /= (newBound.length / 2);
    newZ /= (newBound.length / 2);

    if (Math.abs(cg.distance([originX, 0, originZ], [originBound[0], 0, originBound[1]]) - cg.distance([newX, 0, newZ], [newBound[0], 0, newBound[1]])) > 0.1)
        return;

    if (cg.distance([originX, 0, originZ], [newX, 0, newZ]) > 100)
        return;

    // originD is the vector that starts from the center of the origin bound and ends at the first bound cloud point.
    let originD = [originBound[0] - originX, originBound[1] - originZ];
    // newD is the vector that starts from the center of the current bound and ends at the first bound cloud point.
    let newD = [newBound[0] - newX, newBound[1] - newZ];
    // angle is the angle between originD and newD. By computing the angle, we can know what angle has the current user transform deviated from the original angle.
    let angle = Math.atan2(newD[1], newD[0]) - Math.atan2(originD[1], originD[0]);

    let originCoordsInfo = localStorage.getItem("OriginCoords");
    let originCoordsStr = originCoordsInfo.split(" ");
    let originCoords = [];

    for (let i = 0; i < originCoordsStr.length; i++) {
        if (!isNaN(parseFloat(originCoordsStr[i]))) {
            originCoords.push(parseFloat(originCoordsStr[i]));
        }
    }

    let offsetX = originCoords[12] - originX;
    let offsetZ = originCoords[14] - originZ;

    let newOffsetX = Math.cos(angle) * offsetX - Math.sin(angle) * offsetZ;
    let newOffsetZ = Math.sin(angle) * offsetX + Math.cos(angle) * offsetZ;

    let dxx = Math.cos(angle) * originCoords[0] - Math.sin(angle) * originCoords[2];
    let dxz = Math.sin(angle) * originCoords[0] + Math.cos(angle) * originCoords[2];

    let X = [dxx, 0, dxz];
    X = cg.normalize(X);
    let Z = cg.cross(X, [0, 1, 0]);

    worldCoords = [X[0], X[1], X[2], 0, 0, 1, 0, 0, Z[0], Z[1], Z[2], 0, newOffsetX + newX, originCoords[13], newOffsetZ + newZ, 1];
    if(window.meshPose)
    worldCoords = window.meshPose.transform.matrix;
}

