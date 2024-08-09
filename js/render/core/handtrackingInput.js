"use strict";

export const jointNum = 25;
export let jointMatrix = { left: [], right: [] };

for (let i = 0; i < jointNum; i ++) {
    jointMatrix.left[i] = { mat: [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1], scale: 1 };
    jointMatrix.right[i] = { mat: [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1], scale: 1 };
}

export let updateHandtracking = (avatar, handInfo) => {
    let handedness = handInfo.handedness;
    let index =  handInfo.index - 1;
    let scale = handInfo.scale;
    jointMatrix[handedness][index].mat = handInfo.matrix;
    jointMatrix[handedness][index].scale = scale;
}