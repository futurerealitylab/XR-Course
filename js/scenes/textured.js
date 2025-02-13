// This is a very simple scene of a rotating object.

export const init = async model => {
   model.txtrSrc(10, '../media/textures/water_vase.jpg');
   let obj = model.add('square').txtr(10);
   model.animate(() => {
      obj.identity().move(0,1.5,0).scale(.3603,.2503,1);
   });
}
