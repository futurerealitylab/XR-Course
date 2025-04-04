import { jointMatrix } from "./handtrackingInput.js";
import { lcb, rcb } from "../../handle_scenes.js";
import { buttonState } from "./controllerInput.js";
import * as cg from "./cg.js";

export function HandsWidget(widgets) {
    const THUMB = 0, INDEX = 1, MIDDLE = 2, RING = 3, PINKY = 4;

    this.visible = (hand, t) => { }
    this.point = { left: 0, right: 0 };
    this.pinch = { left: 0, right: 0 };
        this.fist = { left: 0, right: 0 };
    this.bend = { left: 0, right: 0 };
    this.matrix = { left: cg.scale(0), right: cg.scale(0) };
    this.setFingerColor = () => {};
    this.getMatrix = (hand, finger, joint) => jointMatrix[hand][5 * finger + joint].mat;

    let hands = widgets.add().opacity(.01);

    let L_joints = hands.add();
    let R_joints = hands.add();

    let L_links  = hands.add();
    let R_links  = hands.add();

    for (let finger = 0 ; finger < 5 ; finger++) {
       for (let i = 0 ; i < 5 ; i++) {
          L_joints.add(finger+i==0 ? 'sphere' : 'sphere12').scale(0);
          R_joints.add(finger+i==0 ? 'sphere' : 'sphere12').scale(0);
       }
       for (let i = 0 ; i < 4 ; i++) {
          L_links.add('tube12').scale(0);
          R_links.add('tube12').scale(0);
       }
    }

    this.update = () => {

        // IF HAND SIZE BLOWS UP, THEN DO NOT SHOW THE HANDS WIDGET.

        let handSize = {};
        for (let hand in {left:0,right:0}) {
           let lo = [ 1000, 1000, 1000];
           let hi = [-1000,-1000,-1000];
           for (let n = 0 ; n < jointMatrix[hand].length ; n++) {
              let mat = jointMatrix[hand][n].mat;
              for (let i = 0 ; i < 3 ; i++) {
                 lo[i] = Math.min(lo[i], mat[12+i]);
                 hi[i] = Math.max(hi[i], mat[12+i]);
              }
           }
           handSize[hand] = cg.distance(lo, hi);
        }

        let th = [.014,.012,.012,.012,.01];
        if(window.handtracking && handSize.left < 1 && handSize.right < 1) {
            hands.setMatrix(clay.inverseRootMatrix);
            for (let finger = 0 ; finger < 5 ; finger++) {

               let j3 = 5 * finger + 3;
               let j4 = 5 * finger + 4;
               let L3 = jointMatrix.left[j3].mat;
               let L4 = jointMatrix.left[j4].mat;
               let R3 = jointMatrix.right[j3].mat;
               let R4 = jointMatrix.right[j4].mat;
               for (let k = 12 ; k < 15 ; k++) {
                  L4[k] += .5 * (L4[k] - L3[k]);
                  R4[k] += .5 * (R4[k] - R3[k]);
               }

               let aim = (link,A,B) => {
                  let a = A.slice(12,15);
                  let b = B.slice(12,15);
                  let c = cg.mix(a,b,.5,.5);
                  let d = cg.mix(a,b,-.5,.5);
                  link.identity().move(c).aimZ(d).scale(th[finger],th[finger],cg.norm(d));
               }
               for (let i = 0 ; i < 5 ; i++) {
                  let nj = 5 * finger + i;
                  L_joints.child(nj).setMatrix(jointMatrix.left [nj].mat).scale(th[finger]);
                  R_joints.child(nj).setMatrix(jointMatrix.right[nj].mat).scale(th[finger]);
               }
               for (let i = 0 ; i < 4 ; i++) {
                  let nj = 5 * finger + i;
                  let nl = 4 * finger + i;
                  aim(L_links.child(nl), jointMatrix.left [nj].mat, jointMatrix.left [nj+1].mat);
                  aim(R_links.child(nl), jointMatrix.right[nj].mat, jointMatrix.right[nj+1].mat);
               }
            }
            L_joints.child(0).scale(0);
            L_links.child(0).scale(0);
            R_joints.child(0).scale(0);
            R_links.child(0).scale(0);

            this.fingerBend = (hand, finger, joint) => {
               let matrices = jointMatrix[hand];
               let a = matrices[0].mat.slice(8,11);
               let b = matrices[5 * finger + joint].mat.slice(8,11);
               return 1 - cg.dot(a,b);
            }

            let measureBend = jointMatrix => {
               let a = jointMatrix[0].mat.slice(8,11);
               let b = jointMatrix[9].mat.slice(8,11);
               return 1 - cg.dot(a,b);
            }

            let touchState = joints => {
               let a = joints.child(4).getMatrix().slice(12,15);
               if (a[0]!=0 || a[1]!=0 || a[2]!=0)
                  for (let finger = 1 ; finger < 5 ; finger++) {
                     let b = joints.child(5*finger + 4).getMatrix().slice(12,15);
                     let d = cg.mix(a,b,-.5,.5);
                     if (cg.norm(d) < .012)
                        return finger;
                  }
               return 0;
            }

            this.matrix.left  = jointMatrix.left [0].mat;
            this.matrix.right = jointMatrix.right[0].mat;

            this.pinch.left  = touchState(L_joints);
            this.pinch.right = touchState(R_joints);

/*
            let s = 1;
            let a = L_joints.child(4).getMatrix().slice(12,15);
            if (a[0]!=0 || a[1]!=0 || a[2]!=0) {
               let b = L_joints.child(5 + 4).getMatrix().slice(12,15);
               let d = cg.mix(a,b,-.5,.5);
               s = cg.norm(d);
            }
            console.log(this.pinch.left, (1000 * s >> 0) / 1000);
*/

      for (let hand in this.point) {
               if (this.pinch[hand] > 1) {
                  this.point[hand] = false;
                  continue;
               }

                
               let b01 = this.fingerBend(hand, 0, 1);
               let b02 = this.fingerBend(hand, 0, 2);
               let b03 = this.fingerBend(hand, 0, 3);
               let b11 = this.fingerBend(hand, 1, 1);
               let b12 = this.fingerBend(hand, 1, 2);
               let b13 = this.fingerBend(hand, 1, 3);
               let b21 = this.fingerBend(hand, 2, 1);
               let b22 = this.fingerBend(hand, 2, 2);
               let b23 = this.fingerBend(hand, 2, 3);
               let b31 = this.fingerBend(hand, 3, 1);
               let b32 = this.fingerBend(hand, 3, 2);
               let b33 = this.fingerBend(hand, 3, 3);
               let b41 = this.fingerBend(hand, 4, 1);
               let b42 = this.fingerBend(hand, 4, 2);
               let b43 = this.fingerBend(hand, 4, 3);

               let b0 = b01 + b02 + b03;
               let b1 = b11 + b12 + b13;
               let b2 = b21 + b22 + b23;
               let b3 = b31 + b32 + b33;
               let b4 = b41 + b42 + b43;

               this.fist[hand] = b1 > 3 && b2 > 3 && b3 > 3 && b4 > 3;

               this.point[hand] = b11 < 1 && b2 > 3;
               if (this.point[hand])
                  if (b1 > 1)
                     this.pinch[hand] = 1;
            }

            this.bend.left  = measureBend(jointMatrix.left);
            this.bend.right = measureBend(jointMatrix.right);
        } else 
            hands.scale(0);
    };
 }
