/****************************************************************

   This demo shows how you can vary an object's opacity.

****************************************************************/

export const init = async model => {

   // NOTE: Creation order matters when rendering transparent objects.
   //       Transparent objects need to render *after* opaque objects.

   let cube1 = model.add('cube').color(1,1,0);
   let cube2 = cube1.add('cube').color(0,1,1).move(2.5,0,0);

   model.move(0,1.5,0).scale(.1).animate(() => {
      cube1.identity().turnZ(0.3 * model.time)
                      .turnY(1.0 * model.time);
      cube2.opacity(.5 + .5 * Math.sin(4 * model.time));
   });
}
