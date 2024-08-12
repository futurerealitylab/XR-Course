export const init = async model => {
   let ball = model.add('sphere');
   let x = 0;
   let dx = .1;
   let y = 0;
   let dy = .1;
   let gravity = -.003;
   model.animate(() => {
      model.identity().move(0,1.7,0);
      ball.identity().move(.1*x,.1*y,0).scale(.1).color('red');
      x += dx;
      y += dy;
      dy += gravity;
      if (x > 4 || x < -4)
        dx = -dx;
      if (y < -4)
        dy = -dy * .999;
   });
}

