export const init = async model => {
   let myObject = model.add('cube');
   model.animate(() => {
      let s = f => Math.sin(f * model.time) / 2;
      let p = shared(() => [ s(1), s(2)+1.5, s(3) ]);
      myObject.identity().move(p ?? [0,1.5,0]).scale(.1);
   });
}
