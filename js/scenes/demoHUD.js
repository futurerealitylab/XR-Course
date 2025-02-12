import { G2 } from "../util/g2.js";

/***********************************************************************

	This demo shows how you can add heads-up display (HUD) objects.

	The object will move together with you as you change your view,
	and will always rotate to face you.

***********************************************************************/

export const init = async model => {

   let g2L = new G2().setAnimate(false);
   let g2R = new G2().setAnimate(false);

   model.txtrSrc(1,g2L.getCanvas());
   model.txtrSrc(2,g2R.getCanvas());

   let obj1 = model.add('cube').color(1,.5,.5).txtr(1); // HUD object.
   let obj2 = model.add('cube').color(.5,.7,1).txtr(2); // non-HUD object.

   model.animate(() => {

      g2L.setColor([1,.5,.5]);
      g2L.fillOval(-1,-1,2,2);

      g2R.setColor([.5,.5,1]);
      g2R.fillOval(-1,-1,2,2);

      obj1.hud().scale(.2,.2,.0001);
      obj2.identity().move(0,1.5,-1.5).scale(.2,.2,.0001);
   });
}
