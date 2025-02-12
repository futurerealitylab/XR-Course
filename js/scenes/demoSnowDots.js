export const init = async model => {
   let N = 50000, data = [];
   for (let n = 0 ; n < N ; n++)
      data.push([ 6*Math.random()-3, 4*Math.random(), 6*Math.random()-3 ]);
   model.txtrSrc(2, '../media/textures/snowflake.png');
   let snow = model.add('dots'+N).txtr(2);
   model.animate(() => {
      for (let n = 0 ; n < N ; n++) {
         data[n][0] += model.deltaTime * .27 * Math.sin(.5 * n);
         data[n][2] += model.deltaTime * .27 * Math.cos(.5 * n);
         data[n][1] -= model.deltaTime * (.15 + .12 * Math.sin(.4 * n));
         if (Math.abs(data[n][0]) > 3) data[n][0] *= -1;
         if (Math.abs(data[n][2]) > 3) data[n][2] *= -1;
         if (data[n][1] < 0) data[n][1] = 4;
      }
      snow.renderDots(data, .012);
   });
}

