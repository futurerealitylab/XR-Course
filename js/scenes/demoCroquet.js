import * as croquet from "../util/croquetlib.js";

export let updateModel = e => {
   if (e.what == "rightTriggerRelease") {
      window.clay.model.add("cube").color(...e.info).setMatrix(e.where).scale(0.03);
   }
}

export const init = async model => {
   // croquet.register('croquetDemo_1.0');
   model.animate(() => {
   });
}

