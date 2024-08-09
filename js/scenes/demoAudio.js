
/*******************************************************************

   This demo shows how you can play different sounds
   based on an object position in the scene.

   The complete audio API can be found at:
   	https://www.w3schools.com/jsref/dom_obj_audio.asp

*******************************************************************/

export const init = async model => {
   let d1 = new Audio('../../media/sound/pianoSounds/D1.m4a');
   let g1 = new Audio('../../media/sound/pianoSounds/G1.m4a');
   let cube = model.add('cube');
   let x0 = 0;				   // keep around previous x

   model.move(0,1.5,0).scale(.3).animate(() => {
      cube.identity().move(Math.cos(model.time),1.5,0).scale(.1);

      let x = cube.getGlobalMatrix()[12];  // retrieve x coord
      if (x <= -.1 && x0 > -.1) d1.play(); // x becomes < -1
      if (x >=  .1 && x0 <  .1) g1.play(); // x becomes > +1
      x0 = x;				   // remember previous x
   });
}

