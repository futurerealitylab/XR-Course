// Color-based filtering of a video texture: Blue objects reveal a 3D scene.
import * as cg from "../render/core/cg.js";

export const init = async model => {
   webcam._animate = true;
   model.txtrSrc(10, webcam);

   // CREATE THE VIDEO TEXTURE

   let fg = model.add('square').txtr(10).move(0,1.5,.75).scale(.5,.3625,1);
   fg.flag('uWebcam');
   fg.customShader(`
     uniform int uWebcam;
     ---------------------------------------------------------------------
      if (uWebcam == 1)
         if (color.b > .25 && color.b > 1.5 * max(color.r, color.g))
	    discard;
   `);
   let bg = model.add('square').txtr(10).move(0,1.2,0).scale(2,4*.3625,1);

   // CREATE THE 3D SCENE

   let obj = model.add();
   for (let row = 0 ; row < 5 ; row++)
   for (let col = 0 ; col < 5 ; col++)
      obj.add(row + col & 1 ? 'tubeX' : 'cube').color(cg.ease(Math.random()),
                                                      cg.ease(Math.random()),
                                                      cg.ease(Math.random()));

   // ANIMATE THE 3D SCENE

   model.animate(() => {
      for (let row = 0 ; row < 5 ; row++)
      for (let col = 0 ; col < 5 ; col++)
         obj.child(5*row+col).identity().move(.4 * (row-2), 1.5 + .4 * (col-2), .3)
	                                .scale(.1).turnX(model.time).turnY(model.time);
   });
}

