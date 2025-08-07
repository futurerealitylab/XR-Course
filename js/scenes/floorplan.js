import * as cg from "../render/core/cg.js";
import { Structure } from "../render/core/structure.js";

export const init = async model => {

   let S = new Structure();

   // GEOMETRY

   S.save().lineWidth(.1).color([0,1,0])
    .box([-25,0,-24], [25,0,24]) // ground outline
    .restore();

   S.lineWidth(.2);

   S.walls(0,9,[ [3,6.5],[5,6.5],[5,3.5],[25,3.5],[25,24],[5,24],[5,17],[3,17],[3,6.5]]); // garage
   S.save().lineWidth(.05)
    .box([25,0,5.5],[25,7,7.5])  // garage door east
    .box([3,0,6.5],[3,7,8.5])    // garage door west
    .box([5,0,3.5],[9,7,3.5])    // garage door north
    .box([5.5,0,24],[23.5,8,24]) // garage door south
    .restore();

   S.box([  7,0,-18  ], [ 25, 9,-6]); // master bedroom
   S.save().lineWidth(.05)
    .box([20,3,-18],[22,7,-18]) // master window north
    .box([22,3,-18],[25,7,-18])
    .box([25,3,-18],[25,7,-16]) // master window east south
    .box([25,3, -8],[25,7, -6]) // master window east north
    .restore();

   S.box([ 10,0,-6], [ 25, 9,3.5]); // master bath
   S.save().lineWidth(.05)
    .box([ 13,0,-6],[16,7,-6]) // master bath door north
    .box([ 24,3,-3],[24,7,-1]) // master bath window east
    .restore();

   S.walls(0,11, [ [-10,-18],[-10,-24],[5,-24],[5,-18] ]); // great room north wall
   S.box([5,0,-18],[7,9,-18]);
   S.save().lineWidth(.05)
    .box([-6.0,3,-24], [-3.7,9,-24]) // great room windows north
    .box([-3.7,3,-24], [-1.2,9,-24])
    .box([-1.2,3,-24], [ 1.0,9,-24])
    .restore();

   S.box([-19,0,-18  ], [ -19, 9, -9]); // dining wall west
   S.box([-19,0,-18  ], [ -10, 9,-18]); // dining wall north
   S.save().lineWidth(.05)
    .box([-19,3,-18  ], [ -19, 7,-16]) // dining window west
    .box([-19,3,-18  ], [ -16, 7,-18]) // dining window north
    .box([-16,3,-18  ], [ -13, 7,-18]) // dining window north
    .box([-19,0,-11  ], [ -19, 7, -9]) // dining door west
    .restore();

   S.save().lineCap(true).lineWidth(1).nSides(4) // patio support column
           .line([-24.5,.5,-18.5],[-24.5,8.5,-18.5])
	   .restore();
   S.save().lineWidth(.05)                       // patio
           .line([-25,9,-18],[-25,9,-9])
           .line([-25,9,-18],[-16,9,-18])
	   .restore();

   S.box([-25,0, -9  ], [-15, 9, 1]); // office
   S.save().lineWidth(.05)
    .box([-25,3, -9  ], [-25, 7,-6]) // office window west
    .box([-25,3, -9  ], [-22, 7,-9]) // office window north
    .restore();

   S.box([-25,0,  1  ], [-12, 9,13]); // bedroom
   S.save().lineWidth(.05)
    .box([-25,3,11],[-25,7,13])   // bedroom window west
    .box([-25,3,13],[-21.5,7,13]) // bedroom window north
    .box([-21.5,3,13],[-20,7,13]) // bedroom window north
    .box([-12,0,1],[-12,7,4])     // bedroom door east
    .restore();

   S.box([-12,0,  1  ], [ -2, 9,13]); // bathroom
   S.save().lineWidth(.05)
    .box([-8,3,13],[-6,7,13])         // bathroom door
    .restore();

   // TEXT LABELS

   S.color([0,.1,1]);

   S.text('garage', [15,5,14]);

   S.text('master', [16,5,-12]);

   S.text('great', [-1.5,5,-15]);
   S.text('room ', [-1.5,4,-15]);

   S.text('dining', [-14,5,-12.5]);
   S.text(' room ', [-14,4,-12.5]);

   S.text('patio', [-22,5,-14]);

   S.text('office', [-10,5,-4]);

   S.text('bedroom', [-18.5,5,7]);

   S.text('bath', [-7,5,7]);

   S.build(model, { isNormal: false } );
   model.animate(() => S.update());
}

