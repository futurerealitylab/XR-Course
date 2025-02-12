import { G2 } from "../util/g2.js";
import { matchCurves } from "../render/core/matchCurves.js";

export const init = async model => {

   let g2A = new G2();
   model.txtrSrc(3, g2A.getCanvas());
   let objA = model.add('square').txtr(3);

   let g2B = new G2();
   model.txtrSrc(4, g2B.getCanvas());
   let objB = model.add('square').txtr(4);

   let g2C = new G2();
   model.txtrSrc(5, g2C.getCanvas());
   let objC = model.add('square').txtr(5);

   let g2D = new G2();
   model.txtrSrc(6, g2D.getCanvas());
   let objD = model.add('square').txtr(6);

   let g2E = new G2();
   model.txtrSrc(7, g2E.getCanvas());
   let objE = model.add('square').txtr(7);

   model.animate(() => {
      g2A.update();
      objA.identity().move(-.4,1.7,0).scale(.15);
      g2B.update();
      objB.identity().move(0,1.7,0).scale(.15);
      g2C.update();
      objC.identity().move(-.4,1.3,0).scale(.15);
      g2D.update();
      objD.identity().move(0,1.3,0).scale(.15);
      g2E.update();
      objE.identity().move(.4,1.7,0).scale(.15);
   });

   // ANIMATED DRAWING OF A WIGGLY LINE

   g2A.render = function() {
      this.setColor([.5,.5,1,.5]);
      this.fillRect(-1,-1,2,2);

      this.setColor('yellow');
      this.textHeight(.05);
      this.text('This is an animated texture\non a transparent 2D canvas.', 0, .9, 'center');

      this.setColor('red');
      this.lineWidth(.02);
      let path = [];
      for (let i = 0 ; i < 100 ; i++)
         path.push([.2 * Math.sin(.08 * i - 2 * model.time), .4 - .01 * i]);
      this.drawPath(path);
   }

   // DRAWING PAD WITH COLOR SLIDER AND SHAPE RECOGNITION

   g2B.render = function() {
      this.setColor('white');
      this.fillRect(-1,-1,2,2);
      this.setColor('black');
      this.textHeight(.1);
      this.text('Drawing Pad', 0, .9, 'center');

      if (! this.isActiveWidget())
         if (this.mouseState() == 'press') {
       if (objB.ST) {
          objB.paths = [];
          objB.ST = null;
       }
            objB.paths.push([]);
         }
         else {
            let uvz = this.getUVZ(objB);
       if (uvz)
               if (this.mouseState() == 'drag') {
             if (objB.paths.length == 0)
                objB.paths.push([]);
                  objB.paths[objB.paths.length-1].push(uvz);
               }
               else if (this.mouseState() == 'release')
                  if (objB.paths.length > 0 && objB.paths[objB.paths.length-1].length < 10) {
                     objB.paths.pop();
           if (objB.paths.length > 0) {
                        objB.ST = matchCurves.recognize(objB.paths);
                        objB.timer = 0;
                     }
                  }
         }

      let r = .5 + .5 * Math.cos(    Math.PI * objB.color),
          g = .5 - .5 * Math.cos(2 * Math.PI * objB.color),
          b = .5 - .5 * Math.cos(    Math.PI * objB.color);
      this.setColor([r*r*r, .7*g, b*b*b]);
      this.lineWidth(.02);

      if (objB.ST) {
         objB.timer = Math.min(1, objB.timer + 1.4 * model.deltaTime);
    let S = t => t * t * (3 - t - t);
         let curves = matchCurves.mix(objB.ST[0], objB.ST[1], S(objB.timer));
         for (let n = 0 ; n < curves.length ; n++)
            this.drawPath(curves[n]);
      }
      else
        for (let n = 0 ; n < objB.paths.length ; n++)
           this.drawPath(objB.paths[n]);
   }

   objB.paths = [];
   objB.color = .5;
   objB.ST = null;
   objB.timer = 0;

   g2B.addWidget(objB, 'button',  .7, -.8, '#ff8080', 'clear', () => { objB.paths = []; objB.ST = null; });
   g2B.addWidget(objB, 'slider', -.6, -.8, '#80ffff', 'color', value => objB.color = value);

   // ANIMATED BAR CHART

   g2C.render = function() {
      this.setColor('white');
      this.textHeight(.07);
      this.text('This 2D texture uses\na library function to\nrender a bar chart.', 0, .9, 'center');

      this.setColor('blue');
      let values = [];
      for (let n = 0 ; n < 4 ; n++)
         values.push(.5 + .4 * Math.sin(n + 3 * model.time));
      this.barChart(-.25,-.25,.5,.5, values, ['frodo','merry','pippin','samwise'],
                                           ['red','green','blue','magenta']);
   }

   // CLOCK

   g2D.render = function() {
      this.clock();
   }

   // TRACKPAD AND TEXT BOX

   g2E.render = function() {
      this.setColor('white');
      this.fillRect(-1,-1,2,2);
      this.setColor('black');
      this.textHeight(.1);
      this.text('' + (100*g2E.value[0]>>0), 0, -.35, 'center');
      this.text('' + (100*g2E.value[1]>>0), -.40, 0, 'center');
      this.text('Widget tester', 0, .9, 'center');
   }
   g2E.value = [.5,.5];
   g2E.addWidget(objE, 'trackpad', 0,   0, '#ff8080', 'trackpad', value => g2E.value = value);
   g2E.addWidget(objE, 'textbox' , 0, -.7, '#ffffff', 'hello', value => {});
/*
   model.move(0,1.5,0).scale(.3).animate(() => {
      obj2.identity().move(0,-.2,0).scale(.7,.7,.0001);
      obj3.identity().move(-2,-.2,0).turnY( Math.sin(model.time)).scale(.7,.7,.0001);
      obj4.identity().move(0,1.3,0).scale(.5,.5,.0001);
      obj5.identity().move(-2,1.2,0).scale(.5,.5,.0001);
   });
*/
}
