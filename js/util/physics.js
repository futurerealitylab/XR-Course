/* TO DO LIST:
 * PHYSICS-BASED STATE
 * - MASS
 * - INERTIA
 * - FRICTION
 * - VELOCITY
 * - ANGULAR VELOCITY
 * COLLISION-RELATED
 * - COLLISION SHAPES (SPHERE, BOX)
 * - COLLISION DETECTION
 * */

import * as cg from "/js/render/core/cg.js";

let staticParams = 0.01;
let gravity = 9.8;

// p = [0: enable gravity, 1:mass, 2:inertia, 3:rotational inertia, 4:vx, 5:vy, 6:vz, 0, 8:ax, 9:ay, 10:az, 0, 12:wx, 13:wy, 14:wz, 0, 16:angax, 17:angay, 18:angaz, 19:0]
export let initializePhysicalState = (enableGravity, mass, inertia, rInertia) => {
    let p = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    p[0] = enableGravity;
    p[1] = mass;
    p[2] = inertia;
    p[3] = rInertia;

    return p;
}

// collider = [0:collision type, 1:position x, 2:position y, 3:position z, 4:rotation x, 5:rotation y, 6:rotation z, 7:scale x, 8:scale y, 9:scale z]
export let addCollider = (previousCollider, colliderType, colliderPosition, colliderOrientation, colliderScale) => {
    previousCollider.push(colliderType === "sphere" ? 0 : 1);

    previousCollider.push(colliderPosition[0]);

    previousCollider.push(colliderPosition[1]);

    previousCollider.push(colliderPosition[2]);

    previousCollider.push(colliderOrientation[0]);

    previousCollider.push(colliderOrientation[1]);

    previousCollider.push(colliderOrientation[2]);

    previousCollider.push(colliderScale[0]);

    previousCollider.push(colliderType === "sphere" ? 0 : colliderScale[1]);

    previousCollider.push(colliderType === "sphere" ? 0 : colliderScale[2]);
    return previousCollider;
};

export let addForce = (force, forcePosition, position, collider, physicalState) => {
    physicalState[8] += force[0] / physicalState[1];
    physicalState[9] += force[1] / physicalState[1];
    physicalState[10] += force[2] / physicalState[1];
    //PENDING: ANGULAR FORCE

    return physicalState;
}

export let addGravity = (physicalState) => {
    physicalState[9] -= gravity;
    return physicalState;
}

export let addAngularForce = (torque, physicalState) => {
    physicalState[16] += torque[0] * physicalState[2];
    physicalState[17] += torque[1] * physicalState[2];
    physicalState[18] += torque[2] * physicalState[2];
    return physicalState;
}

// simulation result = [dx, dy, dz, dax, day, daz]
export let physicsStep = (physicalState) => {

    if (window.previousTime === undefined)
        return physicalState;

    for (let i = 0; i < Date.now() - window.previousTime; i++)
    {
        physicalState[4] += physicalState[8] * window.deltaTime;
        physicalState[5] += physicalState[9] * window.deltaTime;
        physicalState[6] += physicalState[10] * window.deltaTime;

        physicalState[12] += physicalState[16] * window.deltaTime;
        physicalState[13] += physicalState[17] * window.deltaTime;
        physicalState[14] += physicalState[18] * window.deltaTime;

        if (Math.abs(physicalState[4]) < 0.01)
            physicalState[4] = 0;
        if (Math.abs(physicalState[5]) < 0.01)
            physicalState[5] = 0;
        if (Math.abs(physicalState[6]) < 0.01)
            physicalState[6] = 0;

        if (Math.abs(physicalState[12]) < 0.01)
            physicalState[12] = 0;
        if (Math.abs(physicalState[13]) < 0.01)
            physicalState[13] = 0;
        if (Math.abs(physicalState[14]) < 0.01)
            physicalState[14] = 0;

        physicalState[8] = 0;
        physicalState[9] = 0;
        physicalState[10] = 0;
        physicalState[16] = 0;
        physicalState[17] = 0;
        physicalState[18] = 0;
    }

    return physicalState;
}

export let calculateMovement = (physicalState) => {
    return [physicalState[4] * window.deltaTime,
            physicalState[5] * window.deltaTime,
            physicalState[6] * window.deltaTime];
}
export let calculateRotation = (physicalState) => {
    return [physicalState[12] * window.deltaTime,
            physicalState[13] * window.deltaTime,
            physicalState[14] * window.deltaTime];
}

export let sphereToGroundCollision = (collider, position, physicalState) => {
    let sphereBottomY = position[1] - collider[7];
    const groundY = 0;
    if (sphereBottomY <= groundY) {
        position[1] += groundY - sphereBottomY;

        if (physicalState[5] < 0) {
            physicalState[5] = -physicalState[5] * 0.5;
        }

        if (Math.abs(physicalState[4]) > staticParams || Math.abs(physicalState[6]) > staticParams) {
            let frictionFactor = 0.1;
            physicalState[4] *= (1 - frictionFactor);
            physicalState[6] *= (1 - frictionFactor);
        }
    }
    return physicalState;
};

export let boxToGroundCollision = (collider, position, physicalState) => {
    const groundY = 0;
    let boxBottomY = position[1] - collider[8];

    if (boxBottomY <= groundY) {
        let penetrationDepth = groundY - boxBottomY;
        position[1] += penetrationDepth;
        if (physicalState[5] < 0) {
            physicalState[5] = -physicalState[5] * 0.3;
        }

        if (Math.abs(physicalState[5]) < staticParams && Math.sqrt(physicalState[4]**2 + physicalState[6]**2) > staticParams) {
            let frictionForceMagnitude = frictionCoefficient * gravity * physicalState[1];
            physicalState[4] -= frictionForceMagnitude * (physicalState[4] > 0 ? 1 : -1);
            physicalState[6] -= frictionForceMagnitude * (physicalState[6] > 0 ? 1 : -1);
        }
    }

    return physicalState;
};




export let sphereToSphereCollision = (collider1, collider2, position1, position2, physicalState1, physicalState2) => {
    let s1Position = cg.add([collider1[0], collider1[1], collider1[2]], position1);
    let s2Position = cg.add([collider2[0], collider2[1], collider2[2]], position2);

    if (cg.distance(s1Position, s2Position) <= collider1[7] + collider2[7]) {
        let aToB = cg.normalize(cg.subtract(s2Position, s1Position));

        let n = aToB;

        let avn = cg.vec2vecProj([physicalState1[4], physicalState1[5], physicalState1[6]], n);
        let avp = [physicalState1[4] - avn[0], physicalState1[5] - avn[1], physicalState1[6] - avn[2]];

        let bvn = cg.vec2vecProj([physicalState2[4], physicalState2[5], physicalState2[6]], n);
        let bvp = [physicalState2[4] - bvn[0], physicalState2[5] - bvn[1], physicalState2[6] - bvn[2]];

        let av = cg.norm(avn);
        let bv = -cg.norm(bvn);

        let avc = 2 * physicalState2[1] / (physicalState1[1] + physicalState2[1]) * bv + (physicalState1[1] - physicalState2[1]) / (physicalState1[1] + physicalState2[1]) * av;
        let bvc = 2 * physicalState1[1] / (physicalState1[1] + physicalState2[1]) * av + (physicalState2[1] - physicalState1[1]) / (physicalState1[1] + physicalState2[1]) * bv;

        avn[0] *= (avc/av)/1.5;
        avn[1] *= (avc/av)/1.5;
        avn[2] *= (avc/av)/1.5;

        bvn[0] *= (bvc/bv)/1.5;
        bvn[1] *= (bvc/bv)/1.5;
        bvn[2] *= (bvc/bv)/1.5;

        if (cg.dot([physicalState1[4], physicalState1[5], physicalState1[6]], aToB) > 0) {
            physicalState1[4] = avn[0]+avp[0];
            physicalState1[5] = avn[1]+avp[1];
            physicalState1[6] = avn[2]+avp[2];
        }

        if (cg.dot([physicalState2[4], physicalState2[5], physicalState2[6]], aToB) < 0) {
            physicalState2[4] = bvn[0]+bvp[0];
            physicalState2[5] = bvn[1]+bvp[1];
            physicalState2[6] = bvn[2]+bvp[2];
        }

        let fnA = cg.vec2vecProj([physicalState1[8] * physicalState1[1], physicalState1[9] * physicalState1[1], physicalState1[10] * physicalState1[1]], aToB);
        let fnB = cg.vec2vecProj([physicalState2[8] * physicalState2[1], physicalState2[9] * physicalState2[1], physicalState2[10] * physicalState2[1]], cg.scale(aToB, -1));

        if (cg.dot(fnA, aToB) > 0) {
            physicalState1 = addForce(cg.scale(fnA,-1), position1, position1, collider1, physicalState1);
            physicalState2 = addForce(fnA, position2, position2, collider2, physicalState2);
        }

        if (cg.dot(fnB, cg.scale(aToB, -1)) > 0) {
            physicalState1 = addForce(fnB, position1, position1, collider1, physicalState1);
            physicalState2 = addForce(cg.scale(fnB,-1), position2, position2, collider2, physicalState2);
        }
    }

    return [physicalState1, physicalState2];
}

// This function calculates the collision response for sphere hitting a wall represented in an XXYYZZ format.
// It can be helpful for simulating sphere hitting room-scale wall or pedestal
// But noted that the wall cannot be rotated away from XYZ axis
export let sphereToWallCollision = (sphereCollider, spherePosition, spherePhysicalState, wallXXYYZZ) => {
    let sPositionX = sphereCollider[1] + spherePosition[0];
    let sPositionY = sphereCollider[2] + spherePosition[1];
    let sPositionZ = sphereCollider[3] + spherePosition[2];

    let x = Math.max(wallXXYYZZ[0], Math.min(sPositionX, wallXXYYZZ[1]));
    let y = Math.max(wallXXYYZZ[2], Math.min(sPositionY, wallXXYYZZ[3]));
    let z = Math.max(wallXXYYZZ[4], Math.min(sPositionZ, wallXXYYZZ[5]));

    let distance = cg.distance([sPositionX,sPositionY,sPositionZ], [x,y,z]);

    if (distance < sphereCollider[7]) {
        let centerX = (wallXXYYZZ[0] + wallXXYYZZ[1]) / 2;
        let centerY = (wallXXYYZZ[2] + wallXXYYZZ[3]) / 2;
        let centerZ = (wallXXYYZZ[4] + wallXXYYZZ[5]) / 2;
        let d = cg.subtract([x, y, z], [sPositionX, sPositionY, sPositionZ]);

        spherePhysicalState = addForce(d, spherePosition, spherePosition, sphereCollider, spherePhysicalState);
        if (d[0] != 0 && spherePhysicalState[4] * (centerX - sPositionX) > 0) {
            spherePhysicalState[4] = -spherePhysicalState[4] / 1.5;

            if (Math.abs(d[0]) > staticParams)
                spherePhysicalState[8] = -d[0]*20;
            else
                spherePhysicalState[8] = 0;
        }
        if (d[1] != 0) {
            if (spherePhysicalState[5] * (centerY - sPositionY) > 0)
            {
                spherePhysicalState[5] = -spherePhysicalState[5] / 1.5;
            }

            if (Math.abs(d[1]) > staticParams)
                spherePhysicalState[9] = -d[1] * 20;
            else
                spherePhysicalState[9] = 0;
            if (Math.abs(sPositionY - sphereCollider[7] - wallXXYYZZ[3]) < staticParams) {
                if (cg.norm([spherePhysicalState[4], 0, spherePhysicalState[6]]) > staticParams) {
                    let dir = cg.normalize([-spherePhysicalState[4], 0, -spherePhysicalState[6]]);
                    let friction = spherePhysicalState[2] * spherePhysicalState[1] * gravity;
                    spherePhysicalState = addForce([dir[0] * friction, 0, dir[2] * friction],
                                                   [sPositionX, 0, sPositionZ], spherePosition, sphereCollider, spherePhysicalState);
                }
            }
        }
        if (d[2] != 0 && spherePhysicalState[6] * (centerZ - sPositionZ) > 0) {
            spherePhysicalState[6] = -spherePhysicalState[6] / 1.5;

            if (Math.abs(d[2]) > staticParams)
                spherePhysicalState[10] = -d[2] * 20;
            else
                spherePhysicalState[10] = 0;
        }
    }

    return spherePhysicalState;
}

export let sphereToBoxCollision = (sphereCollider, boxCollider, spherePosition, boxPosition, spherePhysicalState, boxPhysicalState) => {
    let sphereCenter = [spherePosition[0] + sphereCollider[1], spherePosition[1] + sphereCollider[2], spherePosition[2] + sphereCollider[3]];
    let sphereRadius = sphereCollider[7];
    let boxMin = [boxPosition[0] + boxCollider[1] - boxCollider[7], boxPosition[1] + boxCollider[2] - boxCollider[8], boxPosition[2] + boxCollider[3] - boxCollider[9]];
    let boxMax = [boxPosition[0] + boxCollider[1] + boxCollider[7], boxPosition[1] + boxCollider[2] + boxCollider[8], boxPosition[2] + boxCollider[3] + boxCollider[9]];

    let closestPoint = [Math.max(boxMin[0], Math.min(sphereCenter[0], boxMax[0])), Math.max(boxMin[1], Math.min(sphereCenter[1], boxMax[1])), Math.max(boxMin[2], Math.min(sphereCenter[2], boxMax[2]))];

    let distanceVector = [closestPoint[0] - sphereCenter[0], closestPoint[1] - sphereCenter[1], closestPoint[2] - sphereCenter[2]];
    let distance = Math.sqrt(distanceVector[0] ** 2 + distanceVector[1] ** 2 + distanceVector[2] ** 2);
    if (distance < sphereRadius) {
        let overlap = sphereRadius - distance + 0.01;
        let normal = [distanceVector[0] / distance, distanceVector[1] / distance, distanceVector[2] / distance];

        let c = -0.2;//prevent tunneling
        spherePosition[0] += normal[0] * overlap * c;
        spherePosition[1] += normal[1] * overlap * c;
        spherePosition[2] += normal[2] * overlap * c;

        let velocityDotNormal = spherePhysicalState[4] * normal[0] + spherePhysicalState[5] * normal[1] + spherePhysicalState[6] * normal[2];
        spherePhysicalState[4] -= 1.8 * velocityDotNormal * normal[0];
        spherePhysicalState[5] -= 1.8 * velocityDotNormal * normal[1];
        spherePhysicalState[6] -= 1.8 * velocityDotNormal * normal[2];
    }

    return [spherePhysicalState, boxPhysicalState];
};

export let boxToSphereCollision = (boxCollider, sphereCollider, boxPosition, spherePosition, boxPhysicalState, spherePhysicalState) => {
    let sphereCenter = [spherePosition[0] + sphereCollider[1], spherePosition[1] + sphereCollider[2], spherePosition[2] + sphereCollider[3]];
    let sphereRadius = sphereCollider[7];
    let boxMin = [
        boxPosition[0] + boxCollider[1] - boxCollider[7] ,
        boxPosition[1] + boxCollider[2] - boxCollider[8] ,
        boxPosition[2] + boxCollider[3] - boxCollider[9] ,
    ];
    let boxMax = [
        boxPosition[0] + boxCollider[1] + boxCollider[7] ,
        boxPosition[1] + boxCollider[2] + boxCollider[8] ,
        boxPosition[2] + boxCollider[3] + boxCollider[9] ,
    ];

    let closestPoint = [
        Math.max(boxMin[0], Math.min(sphereCenter[0], boxMax[0])),
        Math.max(boxMin[1], Math.min(sphereCenter[1], boxMax[1])),
        Math.max(boxMin[2], Math.min(sphereCenter[2], boxMax[2])),
    ];
    let distanceVector = [closestPoint[0] - sphereCenter[0], closestPoint[1] - sphereCenter[1], closestPoint[2] - sphereCenter[2]];
    let distance = Math.sqrt(distanceVector[0] ** 2 + distanceVector[1] ** 2 + distanceVector[2] ** 2);
    if (distance < sphereRadius) {
        let overlap = sphereRadius - distance;
        let normal = [distanceVector[0] / distance, distanceVector[1] / distance, distanceVector[2] / distance];
        spherePosition[0] += normal[0] * overlap;
        spherePosition[1] += normal[1] * overlap;
        spherePosition[2] += normal[2] * overlap;

        let velocityDotNormal = spherePhysicalState[4] * normal[0] + spherePhysicalState[5] * normal[1] + spherePhysicalState[6] * normal[2];
        spherePhysicalState[4] -= 2 * velocityDotNormal * normal[0];
        spherePhysicalState[5] -= 2 * velocityDotNormal * normal[1];
        spherePhysicalState[6] -= 2 * velocityDotNormal * normal[2];
    }

    return [boxPhysicalState, spherePhysicalState];
};

export let boxToBoxCollision = (collider1, collider2, position1, position2, physicalState1, physicalState2) => {
    let overlapX = Math.abs(position1[0] - position2[0]) < (collider1[7] + collider2[7]);
    let overlapY = Math.abs(position1[1] - position2[1]) < (collider1[8] + collider2[8]);
    let overlapZ = Math.abs(position1[2] - position2[2]) < (collider1[9] + collider2[9]);

    if (overlapX && overlapY && overlapZ) { // collision
        let penetrationX = (collider1[7] + collider2[7]) - Math.abs(position1[0] - position2[0]);
        let penetrationY = (collider1[8] + collider2[8]) - Math.abs(position1[1] - position2[1]);
        let penetrationZ = (collider1[9] + collider2[9]) - Math.abs(position1[2] - position2[2]);

        let minPenetration = Math.min(penetrationX, penetrationY, penetrationZ);
        let correctionVector = [0, 0, 0];

        if (minPenetration === penetrationX) {
            correctionVector[0] = position1[0] < position2[0] ? -penetrationX : penetrationX;
        } else if (minPenetration === penetrationY) {
            correctionVector[1] = position1[1] < position2[1] ? -penetrationY : penetrationY;
        } else {
            correctionVector[2] = position1[2] < position2[2] ? -penetrationZ : penetrationZ;
        }

        for (let i = 0; i < 3; i++) {
            position1[i] += correctionVector[i] ;
            position2[i]-= correctionVector[i] ;
            physicalState1[i + 4] *= -0.1;
            physicalState2[i + 4] *= -0.1;
        }
    }

    return [physicalState1, physicalState2];
};



export let simulate = (physicalStates, colliders, walls, positions) => {
    
    // Calculate gravity
    for (let i = 0; i < physicalStates.length; i++) {
        if (physicalStates[i] == 0) continue;
        let physicalState = addGravity(physicalStates[i]);
        physicalStates[i] = physicalState;
    }
    // Calculate collision
    // Sorted by the height of the object
    let sort = [];
    for (let i = 0; i < positions.length; i++) {
        sort.push(i);
    }

    for (let i = 0; i < positions.length; i++) {
        for (let j = i; j < positions.length; j++) {
            if (positions[sort[i]][1] < positions[sort[j]][1]) {
                let temp = sort[i];
                sort[i] = sort[j];
                sort[j] = temp;
            }
        }
    }

    for (let i = 0; i < colliders.length; i++) {
        for (let m = 0; m < colliders[sort[i]].length; m += 10) {
            for (let j = i + 1; j < colliders.length; j++) {
                for (let n = 0; n < colliders[sort[j]].length; n += 10) {
                    let collider1 = colliders[sort[i]].slice(m, m + 10);
                    let collider2 = colliders[sort[j]].slice(n, n + 10);

                    let physicalState1 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                    let physicalState2 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

                    if (collider1[0] == 0) {
                        if (collider2[0] == 0) {
                            [physicalState1, physicalState2] = sphereToSphereCollision(collider1, collider2, positions[sort[i]], positions[sort[j]], physicalStates[sort[i]], physicalStates[sort[j]]);
                            physicalStates[sort[i]] = physicalState1;
                            physicalStates[sort[j]] = physicalState2;
                        }
                    }
                    if (collider1[0] == 1 && collider2[0] == 1) { 
                        [physicalState1, physicalState2] = boxToBoxCollision(collider1, collider2, positions[sort[i]], positions[sort[j]], physicalStates[sort[i]], physicalStates[sort[j]]);
                            physicalStates[sort[i]] = physicalState1;
                            physicalStates[sort[j]] = physicalState2;
                    }
                    if (collider1[0] == 0 && collider2[0] == 1) { 
                        [physicalState1, physicalState2] = sphereToBoxCollision(collider1, collider2, positions[sort[i]], positions[sort[j]], physicalStates[sort[i]], physicalStates[sort[j]]);
                            physicalStates[sort[i]] = physicalState1;
                            physicalStates[sort[j]] = physicalState2;
                    }
                    if (collider1[0] == 1 && collider2[0] == 0) { 
                        [physicalState1, physicalState2] = sphereToBoxCollision(collider2, collider1, positions[sort[i]], positions[sort[j]], physicalStates[sort[i]], physicalStates[sort[j]]);
                            physicalStates[sort[i]] = physicalState1;
                            physicalStates[sort[j]] = physicalState2;
                    }
                  
                }
            }
        }
    }

    // Calculate wall collision
    for (let i = 0; i < colliders.length; i++) {
        for (let m = 0; m < colliders[i].length; m += 10) {
            let collider = colliders[i].slice(m, m + 10);
            if (collider[0] == 0) {
                for (let j = 0; j < walls.length; j++) {
                    //let physicalState = sphereToWallCollision(collider, positions[i], physicalStates[i], walls[j]);
                    //physicalStates[i] = physicalState;
                }
            }
        }
    }

    // Calculate ground collision
    for (let i = 0; i < colliders.length; i++) {
        for (let m = 0; m < colliders[i].length; m += 10) {
            let collider = colliders[i].slice(m, m + 10);
            if (collider[0] == 0) {
                let physicalState = sphereToGroundCollision(collider, positions[i], physicalStates[i]);
                physicalStates[i] = physicalState;
            }
            if (collider[0] == 1) {
                let physicalState = boxToGroundCollision(collider, positions[i], physicalStates[i]);
                physicalStates[i] = physicalState;
            }
        }
    }

    // Compute physics steps
    for (let i = 0; i < physicalStates.length; i++) {
        let physicalState = physicsStep(physicalStates[i]);
        physicalStates[i] = physicalState;
    }

    window.previousTime = Date.now();

    return physicalStates;
}