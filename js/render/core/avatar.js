import * as cg from "./cg.js";
import { controllerMatrix } from "./controllerInput.js";

export function Avatar(model) {

   this.getRoot = () => root;

   let root      = model.add();
   let head      = root.add();
   let eyes      = root.add();
   let leftHand  = root.add();
   let rightHand = root.add();
   head.add('cube' ).scale(.1).scale(.95,1.2,.8);
   eyes.add('tubeZ').scale(.1).move(-.42,.3,-.8).scale(.2,.2,.01).color('black').dull();
   eyes.add('tubeZ').scale(.1).move( .42,.3,-.8).scale(.2,.2,.01).color('black').dull();
   leftHand.add('cube').scale(.015,.02,.05);
   leftHand.add('sphere').move(-.01,-.04,.08).scale(.02).color(.48,.36,.27).dull();
   rightHand.add('cube').scale(.015,.02,.05);
   rightHand.add('sphere').move( .01,-.04,.08).scale(.02).color(.48,.36,.27).dull();

   this.update = () => {
      head.setMatrix(cg.mMultiply(clay.inverseRootMatrix,
                                  cg.mix(clay.root().inverseViewMatrix(0),
                                         clay.root().inverseViewMatrix(1), .5)));
      eyes.setMatrix(head.getMatrix());

      leftHand .setMatrix (cg.mMultiply(clay.inverseRootMatrix, controllerMatrix.left ));
      rightHand.setMatrix(cg.mMultiply(clay.inverseRootMatrix, controllerMatrix.right));
   }

   this.packData = () => {
      return { H : cg.packMatrix(head.getMatrix()),
               L : cg.packMatrix(leftHand.getMatrix()),
               R : cg.packMatrix(rightHand.getMatrix()) };
   }

   this.unpackData = data => {
      if (data) {
         head.setMatrix     (cg.mMultiply(cg.unpackMatrix(data.H), cg.mRotateY(Math.PI)));
         leftHand.setMatrix (cg.mMultiply(cg.unpackMatrix(data.L), cg.mRotateY(Math.PI)));
         rightHand.setMatrix(cg.mMultiply(cg.unpackMatrix(data.R), cg.mRotateY(Math.PI)));
      }
   }
}

