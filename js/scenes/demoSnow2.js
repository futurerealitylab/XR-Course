export const init = async model => {
   let N = 5000, data = [];
   for (let n = 0 ; n < N ; n++)
      data.push({ s: .013, p: [ 6*Math.random()-3, 4*Math.random(), 6*Math.random()-3 ] });
   model.txtrSrc(1, '../media/textures/snowflake.png');
   let particles = model.add('particles').info(N).txtr(1);
   model.animate(() => {
      for (let n = 0 ; n < N ; n++) {
         data[n].p[0] += .009 * Math.sin(.5 * n);
         data[n].p[2] += .009 * Math.cos(.5 * n);
         data[n].p[1] -= .005 + .004 * Math.sin(.4 * n);
         if (Math.abs(data[n].p[0]) > 3) data[n].p[0] *= -1;
         if (Math.abs(data[n].p[2]) > 3) data[n].p[2] *= -1;
         if (data[n].p[1] < 0) data[n].p[1] = 4;
      }
      particles.setParticles(data);
   });
}

