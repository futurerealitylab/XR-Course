// Color-based filtering of a video texture.

export const init = async model => {
   webcam._animate = true;
   model.txtrSrc(10, webcam);
   let obj = model.add('square').txtr(10);
   obj.flag('uWebcam');
   obj.customShader(`
     uniform int uWebcam;
     ---------------------------------------------------------------------
      if (uWebcam == 1)
         if (color.r > .5 && color.r > color.g + color.b)
            color = vec3(0.);
   `);
   model.animate(() => {
      obj.identity().move(0,1.5,0).scale(2,1.45,1);
   });
}
