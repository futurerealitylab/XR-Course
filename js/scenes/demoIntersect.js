import * as cg from "../render/core/cg.js";

/*******************************************************************

   This demo shows how you can detect an intersection of two boxes.

*******************************************************************/

export const init = async model => {
   let box1 = model.add('cube');
   let box2 = model.add('cube');
   model.animate(() => {
      let t = .5 * model.time;
      let s = .2 * Math.sin(t);
      box1.identity().move(-.2,1.5+s,0).turnX(t  ).turnY(t  ).scale(.3,.2,.1);
      box2.identity().move( .2,1.5-s,0).turnY(t/2).turnX(t/2).scale(.2);
      let isIntersect = cg.isBoxIntersectBox(box1.getGlobalMatrix(), box2.getGlobalMatrix());
      box1.color(isIntersect ? [1,.5,.5] : [1,1,1]);
      box2.color(isIntersect ? [1,.5,.5] : [1,1,1]);
   });
}

