import * as physics from "/js/util/physics.js";
import * as cg from "/js/render/core/cg.js";

export const init = async model => {

   let floor = model.add('cube').move(0,0,0).scale(10,.01,10).color('orange');

   let position1 = [1.2,15,-5];
   let rotation1 = [0,0,0];
   let obj1 = model.add('sphere').color('pink').move(position1[0],position1[1],position1[2]).scale(0.5);

   let position2 = [-1.1,7,-5];
   let rotation2 = [0,0,0];
   let obj2 = model.add('sphere').color('pink').move(position2[0],position2[1],position2[2]).scale(1);

   let position3 = [0.2,3,-5];
   let rotation3 = [0,0,0];
   let obj3 = model.add('cube').color('cyan').move(position3[0],position3[1],position3[2]).scale(0.5);

   let pState1 = physics.initializePhysicalState(1, 10, 1, 10);
   let collider1 = physics.addCollider([], 'sphere', [0,0,0], [0,0,0],[0.7,0.7,0.7]);
   
   let pState2 = physics.initializePhysicalState(1, 10, 1, 10);
   let collider2 = physics.addCollider([], 'sphere', [0,0,0], [0,0,0],[1,1,1]);

   let pState3 = physics.initializePhysicalState(1, 10, 1, 10);
   let collider3 = physics.addCollider([], 'cube', [0,0,0], [0,0,0],[1.2,0.8,0.8]);

   let wall1 = [-1,-1,0,10,-10,10];
   let wall2 = [1,1,0,10,-10,10];
   let wall3 = [-10,10,1,1,-5.5,-4.5];
   let wall4 = [-10,10,0,10,-6,-6];
   let wall5 = [-10,10,0,10,-4,-4];

   /*let box = model.add('cube').move(0,0,-2).scale(0.5);
   let collider4 = physics.addCollider([], 'box', [0,0,0], [0,0,0], [1,1,1]);*/
   server.spawnPythonThread("test.py","123");

   model.animate(() => {
      let physicalStates = physics.simulate([pState1,pState2,pState3], [collider1, collider2, collider3], [wall1, wall2, wall3, wall4, wall5], [position1, position2, position3]);
      pState1 = physicalStates[0];
      pState2 = physicalStates[1];
      pState3 = physicalStates[2];

      let d1 = physics.calculateMovement(pState1);
      position1[0] += d1[0];
      position1[1] += d1[1];
      position1[2] += d1[2];

      let r1 = physics.calculateRotation(pState1);
      rotation1[0] += r1[0];
      rotation1[1] += r1[1];
      rotation1[2] += r1[2];
      
      obj1.identity().move(position1[0],position1[1],position1[2]).
      turnX(rotation1[0]).
      turnY(rotation1[1]).
      turnZ(rotation1[2]).
      scale(0.7);

      let d2 = physics.calculateMovement(pState2);
      position2[0] += d2[0];
      position2[1] += d2[1];
      position2[2] += d2[2];
      let r2 = physics.calculateRotation(pState2);
      rotation2[0] += r2[0];
      rotation2[1] += r2[1];
      rotation2[2] += r2[2];
      obj2.identity().move(position2[0],position2[1],position2[2]).
      turnX(rotation2[0]).
      turnY(rotation2[1]).
      turnZ(rotation2[2]).
      scale(1);

      let d3 = physics.calculateMovement(pState3);
      position3[0] += d3[0];
      position3[1] += d3[1];
      position3[2] += d3[2];
      let r3 = physics.calculateRotation(pState3);
      rotation3[0] += r3[0];
      rotation3[1] += r3[1];
      rotation3[2] += r3[2];
      obj3.identity().move(position3[0],position3[1],position3[2]).
      turnX(rotation3[0]).
      turnY(rotation3[1]).
      turnZ(rotation3[2]).
      scale(1.2,0.8,0.8);
   });
}

