const inch = .0254, foot = 12 * inch;

export const init = async model => {

   model.add('cube').move(0,1.6,-5).scale(10,10,.01).color(10,10,10).dull();

   let h = 8 * foot, u = 10/3 * foot;

   //let room = model.add().opacity(.7);
   let room = model.add().color(0,0,0).dull();

   let lr = (x0,x1,z,t) => room.add('cube').move((x0+x1)/2,h/2,z).scale((x1-x0)/2,h/2,t);
   let bf = (x,z0,z1,t) => room.add('cube').move(x,h/2,(z0+z1)/2).scale(t,h/2,(z1-z0)/2);

   lr(-3  *u,  3  *u, -3/2*u, .03);
   lr(-1.5*u,  1.5*u,  3/2*u, .03);
   bf(-3  *u, -3/2*u,  3/2*u, .03);
   bf(-1.5*u, -0.1*u,  3/2*u, .03);
   bf(     0, -3/2*u,  0.3*u, .03);
   bf( 1.5*u, -0.3*u,  3/2*u, .03);
   bf( 3  *u, -3/2*u,  3/2*u, .03);

// room.move(2,-3.5,-5).turnX(Math.PI/2).move(0,0,-4).scale(1,.01,1);

   model.animate(() => {
   });
}

