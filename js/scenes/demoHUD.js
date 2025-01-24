import { G2 } from "../util/g2.js";

/***********************************************************************

	This demo shows how you can add heads-up display (HUD) objects.

	The object will move together with you as you change your view,
	and will always rotate to face you.

***********************************************************************/

export const init = async model => {
   let g2 = new G2();
   model.txtrSrc(1, g2.getCanvas());
   model.txtrSrc(2, g2.getCanvas());

   g2.textHeight(.1);
   let obj1 = model.add('cube').txtr(1); // HUD object.
   let obj2 = model.add('cube').txtr(2); // non-HUD object.

   model.animate(() => {
      g2.clock(0,0,1,1)
      obj1.hud().scale(.2,.2,.0001);
      obj2.identity().move(0,1.5,-1).scale(.2,.2,.0001);
   });
}
