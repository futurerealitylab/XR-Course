export const init = async model => {
   let myObject = model.add('cube');
   model.animate(() => {
      let p = shared(() => {
         let s = f => Math.sin(f*model.time)/2;
         return [ s(1), s(2)+1.5, s(3) ];
      }) ?? [0,1.5,0];
      myObject.identity().move(p).scale(.1);
   });
}
