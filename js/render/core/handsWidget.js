import { jointMatrix } from "./handtrackingInput.js";
import { lcb, rcb } from "../../handle_scenes.js";
import { buttonState } from "./controllerInput.js";
import * as cg from "./cg.js";

export function HandsWidget(widgets) {
   const THUMB = 0, INDEX = 1, MIDDLE = 2, RING = 3, PINKY = 4;

   let isVisible = false;
   this.setVisible = isTrue => hands.opacity(isVisible = isTrue ? 1 : .4);

   this.visible = (hand, t) => { }
   this.point = { left: 0, right: 0 };
   this.pinch = { left: 0, right: 0 };
      this.fist = { left: 0, right: 0 };
   this.bend = { left: 0, right: 0 };
   this.matrix = { left: cg.scale(0), right: cg.scale(0) };
   this.setFingerColor = () => {};
   this.getMatrix = (hand, finger, joint) => jointMatrix[hand][5 * finger + joint].mat;

   let hands = widgets.add().color(clientState.color(0)).dull();
   this.setVisible(isVisible);

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
        L_links.add(i==1 || finger==0 && i==2 ? 'can12' : 'tube12').scale(0);
        R_links.add(i==1 || finger==0 && i==2 ? 'can12' : 'tube12').scale(0);
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

      let th = [.013,.011,.011,.011,.01];
      if(window.handtracking && handSize.left < 1 && handSize.right < 1) {

         let P = {left:[], right:[]};
         for (let hand in P)
            for (let finger = 0 ; finger < 5 ; finger++)
              for (let i = 0 ; i < 5 ; i++)
                 P[hand].push(cg.mMultiply(worldCoords,clientState.teleport(hand,5*finger+i)).slice(12,15));

         hands.setMatrix(clay.inverseRootMatrix);

         for (let finger = 0 ; finger < 5 ; finger++) {
            let t = th[finger] + (isVisible ? 0 : .02);
            let aim = (link,a,b) => {
              let c = cg.mix(a,b,.5,.5);
              let d = cg.mix(a,b,-.5,.5);
              link.identity().move(c).aimZ(d).scale(t,t,cg.norm(d));
            }
            for (let i = 0 ; i < 5 ; i++) {
              let nj = 5 * finger + i;
              L_joints.child(nj).identity().move(P.left [nj]).scale(t);
              R_joints.child(nj).identity().move(P.right[nj]).scale(t);

              if (i <= 1 || finger == 0 && i <= 2) {
                L_joints.child(nj).scale(0);
                R_joints.child(nj).scale(0);
              }
            }
            for (let i = 0 ; i < 4 ; i++) {
              let nj = 5 * finger + i;
              let nl = 4 * finger + i;
              aim(L_links.child(nl), P.left [nj], P.left [nj+1]);
              aim(R_links.child(nl), P.right[nj], P.right[nj+1]);

              if (i == 0 || finger == 0 && i == 1) {
                L_links.child(nl).scale(0);
                R_links.child(nl).scale(0);
              }
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

         let touchState = hand => {
            let a = P[hand][4];
            if (a[0]!=0 || a[1]!=0 || a[2]!=0)
              for (let finger = 1 ; finger < 5 ; finger++) {
                let b = P[hand][5*finger + 4];
                let d = cg.mix(a,b,-.5,.5);
                if (cg.norm(d) < .012)
                  return finger;
              }
            return 0;
         }

         this.matrix.left  = jointMatrix.left [0].mat;
         this.matrix.right = jointMatrix.right[0].mat;

         this.pinch.left  = touchState('left' );
         this.pinch.right = touchState('right');

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

	 // Set fingertip colors according to pinch gesture.

         for (let hand in this.pinch) {
            let P = [];
            for (let f = 1 ; f < 7 ; f++)
               P[f] = clientState.pinch(clientID, hand, f);
            let joints = hand == 'left' ? L_joints : R_joints;
            let links  = hand == 'left' ? L_links  : R_links ;
            let setColor = (f,s) => {
	       joints.child(5*f+4).color(clientState.color(s));
	       links .child(4*f+3).color(clientState.color(s));
	    }
            setColor(0, P[1]?1:P[2]?2:P[3]?3:P[4]?4:P[5]?5:P[6]?6:0);
            setColor(1, P[1]?1:P[5]?5:P[6]?6:0);
            setColor(2, P[2]?2:0);
            setColor(3, P[3]?3:0);
            setColor(4, P[4]?4:0);
         }
      } else 
         hands.scale(0);
   };
 }
