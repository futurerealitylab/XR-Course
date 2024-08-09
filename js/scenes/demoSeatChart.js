const inch = .0254, L = 60*inch, D = 24*inch, e = .01;

export const init = async model => {
   model.dull();
   let floor = model.add('cube').move(0,0,-.01).scale(139*inch,100*inch,.001).color(.4,.4,.4);
   let table = [];
   for (let n = 0 ; n < 8 ; n++) {
      table[n] = model.add();
      table[n].add('cube').scale(L/2,D/2,.001).scale(.98).color(1,.55,.25);
      for (let i = 0 ; i < 2 ; i++) {
         let x = L/4 * (i==0 ? -1 : 1);
         table[n].add('cube' ).move(x,-D- 4*inch,0).scale(10*inch,7*inch,.001).color(0,0,0);
         table[n].add('tubeZ').move(x,-D-11*inch,0).scale(10*inch,4*inch,.001).color(0,0,0);
      }
   }
   model.animate(() => {
      model.identity().move(1,1.6,0).scale(.35);
      let a = L/2, b = D/2-L+e, c = D/2+L+e, d = Math.PI/2;
      table[0].identity().move(-a,  b, 0);
      table[1].identity().move( a,  b, 0);
      table[2].identity().move(-a, -b, 0).turnZ(2*d);
      table[3].identity().move( a, -b, 0).turnZ(2*d);
      table[6].identity().move( c, -a, 0).turnZ(  d);
      table[7].identity().move( c,  a, 0).turnZ(  d);
      table[4].identity().move(-c, -a, 0).turnZ( -d);
      table[5].identity().move(-c,  a, 0).turnZ( -d);
   });
}

