import * as cg from "./cg.js";

export function IkBody(model, U) {

   const INCH = 0.0254;

   if (U === undefined)
      U = {};

   let defU = (id, value) => {
      if (U[id] === undefined)
         U[id] = value;
   }

   defU('ankleX'   ,  2.5 * INCH);
   defU('ankleY'   ,  7.5 * INCH);
   defU('bellyY'   , 37.5 * INCH);
   defU('elbowY'   , 42   * INCH);
   defU('headY'    , 63.4 * INCH);
   defU('hipX'     ,  3   * INCH);
   defU('hipY'     , 33.5 * INCH);
   defU('kneeY'    , 19.5 * INCH);
   defU('shoulderY', 51   * INCH);
   defU('wristX'   ,  9   * INCH);
   defU('wristY'   , 34   * INCH);

   this.setProportions = newU => U = newU;

   this.pointOnSpine = t => {
      let base = M.belly.getMatrix(), top = M.head.getMatrix();
      let p = [];
      for (let j = 0 ; j < 3 ; j++)
         p.push(cg.hermite(t, base[12+j], top[12+j], base[4+j], top[4+j]));
      return p;
   }

   let mocapNames = 'belly,head,wristL,wristR,ankleL,ankleR'.split(',');
   let jointNames = 'chest,elbowL,elbowR,hipL,hipR,kneeL,kneeR,shoulderL,shoulderR'.split(',');

   let M = {};
   for (let name in mocapNames) {
      M[mocapNames[name]] = model.add();
   }

   this.mocapParts = () => M;

   let J = {};
   for (let name in jointNames)
      J[jointNames[name]] = model.add();
   this.jointParts = () => J;

   // SET THE REFERENCE "ZERO POSITION" FOR ALL MOCAP PARTS

   let pRef = [
      [0        , U.bellyY, 0],
      [0        , U.headY , 0],
      [-U.wristX, U.wristY, 0],
      [ U.wristX, U.wristY, 0],
      [-U.ankleX, U.ankleY, 0],
      [ U.ankleX, U.ankleY, 0],
   ];

   let bend = 0, scaleY = 1, isXFlipped = true;
   this.setBend = value => bend = value;
   this.setScaleY = value => scaleY = value;
   this.setXFlipped = value => isXFlipped = value;

   let data = null, moveRef, turnRef, timeBegin, timeEnd;
   this.setData = src => {
      data = src;
      moveRef = [];
      turnRef = [];
      for (let i = 0 ; i < 6 ; i++) {
         let p = data[0].Bones[i].Position;
         let q = data[0].Bones[i].Quaternion;
         moveRef.push(cg.mTranslate(-pRef[i][0]+p.x, pRef[i][1]-p.y*scaleY, pRef[i][2]-p.z));
         turnRef.push(cg.mInverse(cg.mFromQuaternion({x:-q.x,y:q.y,z:q.z,w:-q.w})));
         if (i > 1)
            turnRef[i] = cg.mMultiply(turnRef[i], cg.mRotateX(i < 4 ? -.1 : .1));
      }
      timeBegin = data[            0].timestamp / 1000;
      timeEnd   = data[data.length-1].timestamp / 1000;
   }

   this.totalTime = () => timeEnd - timeBegin;

   this.update = time => {

      // RETRIEVE MOCAP DATA FOR THIS ANIMATION FRAME

      time = time % this.totalTime();
      let frame = 0;
      for ( ; frame < data.length-1 ; frame++) {
         let frameTime0 = data[frame  ].timestamp / 1000 - timeBegin;
         let frameTime1 = data[frame+1].timestamp / 1000 - timeBegin;
         if (frameTime0 <= time && frameTime1 > time)
	    break;
      }

      let bones = window.skeleton? window.skeleton: data[frame].Bones;
      for (let i = 0 ; i < 6 ; i++) {
         let p = bones[i].Position;
         let q = bones[i].Quaternion;
         let moveMatrix = cg.mMultiply(cg.mTranslate( -p.x, p.y*scaleY - (i<4 ? bend : 0), p.z ), moveRef[i]);
         let turnMatrix = cg.mMultiply(cg.mFromQuaternion({x:-q.x,y:q.y,z:q.z,q:-q.w}), turnRef[i]);
         model.child(i).setMatrix(cg.mMultiply(moveMatrix, turnMatrix));
      }

      // SET POSITIONS OF JOINTS THAT ARE RIGIDLY DETERMINED BY MOCAP

      let offset = (a,b,p) => a.setMatrix(cg.mMultiply(b.getMatrix(),cg.mTranslate(p)));
      offset(J.elbowL, M.wristL, [0, U.elbowY - U.wristY, 0]);
      offset(J.elbowR, M.wristR, [0, U.elbowY - U.wristY, 0]);

      // PLACE THE HIPS

      for (let s = -1 ; s <= 1 ; s += 2) {
         let knee = s < 0 ? J.kneeL : J.kneeR;
         let hip  = s < 0 ? J.hipL  : J.hipR;
         let K = knee.getO();
         let B = cg.mix(M.belly.getO(), M.belly.getY(), 1, -.1);
         let D = cg.mix(M.belly.getX(), M.belly.getZ(), s*U.hipX, -.2*U.hipX);
	 hip.identity().move(cg.mix(D,B,1,1));
      }

      // THEN USE IK TO PLACE THE KNEES

      for (let s = -1 ; s <= 1 ; s += 2) {
         let hip   = s < 0 ? J.hipL   : J.hipR  ;
         let knee  = s < 0 ? J.kneeL  : J.kneeR ;
         let ankle = s < 0 ? M.ankleL : M.ankleR;
	 let H = hip.getO();
	 let A = ankle.getO();
	 let D = ankle.getZ();
	 //cg.ik(U.hipY-U.kneeY, U.kneeY-U.ankleY, cg.mix(A,H,1,-1), D);
	 //knee.identity().move(cg.mix(D,H,1,1));

	 let F = cg.mix(A, ankle.getY(), 1, -U.ankleY);
	 cg.ik(U.hipY-U.kneeY, U.kneeY, cg.mix(F,H,1,-1), D);
	 knee.identity().move(cg.mix(D,H,1,1));
      }

      // IK TO PLACE THE SHOULDERS

      J.chest.identity().move(this.pointOnSpine(.65));
      let C = J.chest.getO();
      for (let s = -1 ; s <= 1 ; s += 2) {
         let elbow    = s < 0 ? J.elbowL    : J.elbowR;
         let shoulder = s < 0 ? J.shoulderL : J.shoulderR;
         let E = elbow.getO();
         let D = cg.mix(cg.mix(M.head.getX(), cg.mix(E,C,1,-1),s,1), M.head.getY(),1,.2);
	 cg.ik(U.wristX, 1.1*(U.shoulderY-U.elbowY), cg.mix(E,C,1,-1), D);
	 shoulder.identity().move(cg.mix(D,C,1,1));
      }

      // STRAIGHTEN THE ANKLES TO ALIGN WITH THE KNEE-TO-ANKLE IK DIRECTION

      for (let s = -1 ; s <= 1 ; s += 2) {
         let knee  = s < 0 ? J.kneeL  : J.kneeR ;
         let ankle = s < 0 ? M.ankleL : M.ankleR;

         let K = knee .getO();
         let A = ankle.getO();

         let x = cg.mix(J.hipR.getO(), J.hipL.getO(), 1, -1);
         let y = cg.mix(K, A, 1, -1);

         ankle.identity().move(A).aimY(y).turnY(Math.atan2(-x[2],x[0]));
      }

      if (isXFlipped) {
         for (let name in mocapNames) {
            let mocap = M[mocapNames[name]];
	    let m = mocap.getMatrix();
	    for (let i = 0 ; i < 16 ; i += 4)
	       m[i] *= -1;
         }
         for (let name in jointNames) {
            let joint = J[jointNames[name]];
	    let m = joint.getMatrix();
	    for (let i = 0 ; i < 16 ; i += 4)
	       m[i] *= -1;
         }
      }
   }
}

