import * as cg from "../render/core/cg.js";
import { moleculeNames, addMolecule } from "../render/core/molecules.js";

export const init = async model => {
   let molecules = model.add().move(0,1.5,0).scale(.1);
   let z = -3 * (moleculeNames.length - 1);
   for (let n = 0 ; n < moleculeNames.length ; n++, z += 6) {
      let name = moleculeNames[n];
      addMolecule(molecules, name).move(0,0,z);
   }
   model.animate(() => { });
}

