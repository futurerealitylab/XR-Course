export const init = async model => {
   let obj = model.add('sphere');

   model.animate(() => {
      server.track();
      console.log(window.trackInfo);
      //obj.identity().move(0,0,0).turnX(-Math.PI/2).scale(1.5);
   });
}