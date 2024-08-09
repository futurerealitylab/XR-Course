const inch = .0254, L = 60*inch, D = 24*inch, H = 28.5*inch;

export const init = async model => {

   let table = model.add('cube').opacity(.01).move(0,H/2,-D/2).scale(L/2,H/2,D/2);
   let object = model.add('cube').move(0,1,-2*D).scale(.1,1,.1);

   model.animate(() => {
   });
}

