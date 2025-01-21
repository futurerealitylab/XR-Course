export const init = async model => {
   model.txtrSrc(1, '../media/textures/sky.jpg');
   let joint1 = model.add();
   let joint2 = joint1.add();
   let obj1 = joint1.add('tubeX');
   let obj2 = joint2.add('cube');
   model.animate(() => {
      joint1.identity()
            .move(.3 * Math.cos(model.time),1.5,0)
	    .turnZ(Math.sin(model.time))
	    ;
      joint2.identity()
            .move(0,.3 * Math.sin(model.time),0)
	    ;
      obj1.identity().scale(.2).txtr(1);

      obj2.identity().scale(.1).color(0,1,1);
   });
}

