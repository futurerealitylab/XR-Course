export const init = async model => {

   let N = 10000;

   let inch = 0.0254, yc = 127*inch;
   let pointData = [], oData=[];
   for (let n = 0 ; n < N ; n++) {
      let x = 1, y = yc+10*inch, z = 1;
         x = (Math.random()-.5) * 20.;
         y = (Math.random()-.5) * 16.;
         z = (Math.random()-.5) * 20.;

      oData.push([x,y,z]);      
      pointData.push([x,y,z]);
   }

   let N31 = ([x,y,z], s)=>{
      let a = Math.sin(x*249824.11*s+y*19122.11)+z*99.1121;
      return a - Math.floor(a);
   }

   model.txtrSrc(3, '../media/textures/snowflake.png');
   let obj = model.add('dots' + N).txtr(3);

   let time = 0;
   model.animate(() => {
      time+=0.016;
      for (let n = 0 ; n < N ; n++) {
         pointData[n][0]+=Math.sin(time+N31(oData[n], 231.3)*50)*.01;
         pointData[n][2]+=Math.cos(time+N31(oData[n], 77.77)*90)*.01;
         pointData[n][1]-=.01 * N31(oData[n], 0.866);
         if (pointData[n][1]<=-6.)
            pointData[n][1] = 8.;
      }

      obj.renderDots(pointData, .07).identity().move(0,1.6,0).scale(.2);
   });
}

