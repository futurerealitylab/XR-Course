/***************************************************************

   This demo shows how objects can "melt" into each other
   to create blended shapes.

   If you toggle 'a' mode, the arm bends over time.

   As long as the object is melted, a new polyhedral mesh
   will be created at every animation frame.

   Once you toggle 'r' mode to "rubberize" it, the model
   will become a fixed polyhedral mesh. However, because
   the underlying shapes are still animating, the
   mesh will stretch like rubber, since each vertex
   animates as a weighted blend of those two spheres.

   You can turn off blending entirely by toggling 'b' mode,
   which lets you see the underlying shapes.

***************************************************************/

export const init = async model => {
   let isAnimate = true, isBlending = true, isRubber = true, t = 0;

   model.control('a', 'animate' , () => isAnimate  = ! isAnimate );
   model.control('b', 'blending', () => isBlending = ! isBlending);
   model.control('r', 'rubber'  , () => isRubber   = ! isRubber  );

   model.color(1,.5,.5);

   model.move(0,1.5,0).scale(.3);
   let shape1 = model.add('sphere');
   let shape2 = model.add('sphere');
   let elbow  = model.add('sphere');
   let muscle = model.add('sphere');

   model.animate(() => {
      model.blend(isBlending);
      model.melt(isAnimate && ! isRubber);
      t += isAnimate ? model.deltaTime : 0;
      shape1.identity().move(-1,0,0).scale(1.1,.28,.28);
      let bend = .7-.7*Math.cos(t);
      shape2.identity().turnZ(bend).move(.8,0,0).scale(1,.23,.23);
      elbow .identity().move(-.07,-.07,0).scale(.2);
      muscle.identity().move(-.8,.05+.15*bend,0).scale(.35,.2,.24);
   });
}
