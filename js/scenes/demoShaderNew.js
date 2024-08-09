export const init = async model => {
    let box0 = model.add('sphere'); 
    let box1 = model.add('donut'); 

    model.animate(() => {
       box0.flag('uBox0');
       box1.flag('uBox1');

       //Example: send data to custom shader
       model.setUniform('3fv', 'demo_color', [.8,.5,.9]);

       model.customShader(`
          uniform int uBox0, uBox1;
          --------------------------
          if (uBox0 == 1){
            apos.xyz += noise(apos.xyz + uTime * .5) * aNor * .5;
            pos.xyz = obj2Clip(apos.xyz);
          }

          *********************

          // Have to specify precision here because vertex shaders support
          // highp as default and we have to match precision.
          uniform highp int uBox0, uBox1;
          uniform vec3 demo_color;
          --------------------------
          if (uBox0 == 1)
             color *= (.5 + noise(1.5 * vAPos))* demo_color;
          if (uBox1 == 1){
             color *= vec3(vUV.x,vUV.y,.6);
          }
          
       `);
 
       box0.identity().move(-.12,1.6,0).turnY(model.time).turnX(model.time).scale(.1);
       box1.identity().move(.12,1.6,0).turnY(.2).turnX(.2).scale(.08);
    });
 }
 
 