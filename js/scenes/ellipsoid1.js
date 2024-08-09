import * as cg from "../render/core/cg.js";

window.ellipsoid = {A:1, B:.5, C:.3};

export const init = async model => {

   let s = 0.2;
   let y = 1.2;

   let pulls = model.add();
   for (let i = 0 ; i < 6 ; i++)
      pulls.add('sphere');
   let ball = model.add('sphere').opacity(.8).color(0,.5,1);
   let info = model.add().move(0,y+s+.1,0).scale(.2);

   let compute = p => {}

   inputEvents.onPress = hand => compute(inputEvents.pos(hand));
   inputEvents.onDrag  = hand => compute(inputEvents.pos(hand));

   let fixedWidth = t => {
      let s = '' + (100 * t + .5*Math.sign(t) >> 0) / 100;
      if (s.indexOf('.') == -1)
         s = s + '.';
      while (s.charAt(s.length-3) != '.')
           s = s + '0';
      if (s.substring(0,1) != '-')
         s = ' ' + s;
      return s;
   }

   model.animate(() => {

      model.identity().turnY(.2);

      ellipsoid = server.synchronize('ellipsoid');

      ball.identity().move(0,y,0).scale(s).scale(ellipsoid.A,
                                                 ellipsoid.B,
                                                 ellipsoid.C);

      for (let i = 0 ; i < 6 ; i++) {
         let pull = pulls.child(i);
	 let sign = i < 3 ? -1 : 1;
	 pull.identity().move(0,y,0).scale(s)
	     .move(i%3==0 ? ellipsoid.A * sign : 0,
	           i%3==1 ? ellipsoid.B * sign : 0,
	           i%3==2 ? ellipsoid.C * sign : 0)
             .scale(.05);
      }

      let text = '(x /' + fixedWidth(ellipsoid.A) + ')² + '
               + '(y /' + fixedWidth(ellipsoid.B) + ')² + '
               + '(z /' + fixedWidth(ellipsoid.C) + ')² = 1' ;
      info.text(text, .035);
   });
}

