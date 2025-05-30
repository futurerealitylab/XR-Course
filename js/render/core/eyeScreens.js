import * as cg from "./cg.js";

export function EyeScreens(model) {
   let root = model.add();
   for (let view = 0 ; view <= 1 ; view++)
      root.add().view(view).add('square').move(0,0,-.15).scale(.2);
   this.update = () => {
      for (let view = 0 ; view <= 1 ; view++)
         root.child(view).setMatrix(cg.mMultiply(clay.inverseRootMatrix,clay.root().inverseViewMatrix(view)));
   }
   this.root = () => root;
}

