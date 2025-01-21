export const init = async model => {
   let ball = model.add('sphere');
   let L = model.add('cube').move(-5,0,0).scale(.01,5,1);
   let R = model.add('cube').move( 5,0,0).scale(.01,5,1);
   let T = model.add('cube').move(0, 5,0).scale(5,.01,1);
   let B = model.add('cube').move(0,-5,0).scale(5,.01,1);
   let x = 0;
   let dx = .1;
   let y = 0;
   let dy = .1;
   let gravity = -.003;
   model.animate(() => {
      model.identity().move(0,1.7,0).scale(.1);
      ball.identity().move(x,y,0).color('red');
      x += dx;
      y += dy;
      dy += gravity;
      if (x > 4 || x < -4)
        dx = -dx;
      if (y < -4)
        dy = -dy * .999;
   });
}

