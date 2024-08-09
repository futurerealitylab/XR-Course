/******************************************************************

   This demo shows you how to procedurally texture
   different objects in your scene.

   To associate an object with shader code, you
   declare a flag for that shader code in your
   fragment shader, and set that flag to true
   for any object that uses it.

   In the example below, there are three cubes.
   The first is untextured, the second has a noise
   texture, and the third has a stripe texture.

   Note that all the shader code is declared
   in the same customShader, and the flags are
   used to turn any given texture on or off for
   various objects in the scene.

******************************************************************/

export const init = async model => {
   let box0 = model.add('cube'); // Untextured box
   let box1 = model.add('cube'); // Noise textured box
   let box2 = model.add('cube'); // Stripe textured box

   model.animate(() => {
      box1.flag('uNoiseTexture');
      box2.flag('uStripeTexture');

      model.customShader(`
         uniform int uNoiseTexture;	// Put any declarations or functions
         uniform int uStripeTexture;    // before the dashed line.
         --------------------------
         if (uNoiseTexture == 1)
            color *= .5 + noise(3. * vAPos);
         if (uStripeTexture == 1)
            color *= .5 + .5 * sin(10. * vAPos.x);
      `);

      box0.identity().move(-.4,1.6,0).turnY(model.time).turnX(model.time).scale(.1);
      box1.identity().move( .0,1.6,0).turnY(model.time).turnX(model.time).scale(.1);
      box2.identity().move( .4,1.6,0).turnY(model.time).turnX(model.time).scale(.1);
   });
}

