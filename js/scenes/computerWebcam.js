/* Color-based filtering of a video texture: Blue objects reveal a 3D scene.

How this demo works:

   Objects in the model are built as a sandwich. In both the near and far
   parts of the sandwich are squares that act as screens which stream the
   contents of the computer's webcam as a video texture. The two video images
   are visually aligned so that the pixels on both screens show the same
   view of the video image.

   In between these two screens is an animated 3D scene.

   The front screen contains a custom shader which causes that screen to
   not render at any pixels where the video image is blue.

   Therefore, wherever the user holds a blue object in front of the webcam,
   the front screen does not render. Therefore, at pixels which contain an
   object of the 3D scene, the objects of the 3D screen become visible. At
   those pixels which do not contain objects of the 3D scene, the rear video
   screen becomes visible.

   The net visual effect is that objects in the 3D scene become visible
   wherever the video contains a blue object, but nowhere else.

The eventual goal:

   This demo is just a test of the basic principle. The eventual plan is
   to replace the webcam video feed by the video feed from a depth camera
   (RGB+Depth), where the depth will appear in the fragment shader as the
   alpha channel, and to replace the shader logic which responds to blue
   objects by shader logic which responds to depth.

   The goal is to create a mixed reality scene in which virtual 3D objects
   properly intermix with real people and physical objects, with correct
   depth priority.
*/

import * as cg from "../render/core/cg.js";

export const init = async model => {

   // REMOVE THE WEBXR MENU, SO THAT THE VIDEO WILL COVER THE ENTIRE WINDOW

   header.innerHTML = '';

   // USE COMPUTER'S WEBCAM AS AN ANIMATING TEXTURE (WON'T WORK ON HEADSETS)

   webcam._animate = true;
   model.txtrSrc(10, webcam);

   // CREATE THE VIDEO TEXTURE AND CUSTOM SHADER

   let fg = model.add('square').txtr(10).move(0,1.6,1-1/8).scale(1.6/8,1.2/8,1).flag('uFG');
   let bg = model.add('square').txtr(10).move(0,1.6,1-8.0).scale(1.6*8,1.2*8,1).flag('uBG');

   model.customShader(`
     uniform int uFG, uBG;
     ------------------------------------------------------------------------
      if (uFG == 1 && color.b > .25 && color.b > 1.5 * max(color.r, color.g))
         discard;
      if (uFG == 1 || uBG == 1)
         color = 2. * color * color;
   `);

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

