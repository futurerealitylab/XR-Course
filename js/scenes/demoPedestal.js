const inch = .0254,
      B = 11.75 * inch,
      E =  1.75 * inch,
      H = 43.00 * inch,
      S =  5.00 * inch,
      T =  0.75 * inch;

export const init = async model => {

   let pedestal = model.add().opacity(.001);
   pedestal.add('cube').move(0,E/2,0).scale(B/2,E/2,B/2);
   pedestal.add('cube').move(0,E+(H-E-T)/2,0).scale(S/2,(H-E-T)/2,S/2);
   pedestal.add('cube').move(0,H-T/2,0).scale(B/2,T/2,B/2);

   let ball = model.add('sphere').color('red');

   model.animate(() => {
      ball.identity().turnY(model.time).move(.35,.75,0).scale(.1);
   });
}

