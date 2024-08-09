import { g2 } from "../util/g2.js";
import { matchCurves } from "../render/core/matchCurves.js";

/*****************************************************************

   This demo shows various examples of 2D canvases in VR.

*****************************************************************/

export const init = async model => {

   // ANIMATED DRAWING OF A WIGGLY LINE

   let obj1 = model.add('cube').texture(() => {
      g2.setColor('black');
      g2.textHeight(.1);
      g2.fillText('This is a texture\non a 2D canvas.', .5, .9, 'center');

      g2.setColor('red');
      g2.lineWidth(.05);
      let path = [];
      for (let i = 0 ; i < 100 ; i++)
         path.push([.5 + .1 * Math.sin(.08 * i - 2 * model.time), .66 - .005 * i]);
      g2.drawPath(path);
   });

   // DRAWING PAD WITH COLOR SLIDER AND SHAPE RECOGNITION

   let obj2 = model.add('cube').texture(() => {
      g2.setColor('white');
      g2.fillRect(.1,0,.8,1);
      g2.setColor('black');
      g2.fillText('Drawing Pad', .5, .9, 'center');

      if (! g2.drawWidgets(obj2))
         if (g2.mouseState() == 'press') {
	    if (obj2.ST) {
	       obj2.paths = [];
	       obj2.ST = null;
	    }
            obj2.paths.push([]);
         }
         else {
            let uvz = g2.getUVZ(obj2);
	    if (uvz && uvz[0]>.1 && uvz[0]<.9)
               if (g2.mouseState() == 'drag') {
	          if (obj2.paths.length == 0)
	             obj2.paths.push([]);
                  obj2.paths[obj2.paths.length-1].push(uvz);
               }
               else if (g2.mouseState() == 'release')
                  if (obj2.paths.length > 0 && obj2.paths[obj2.paths.length-1].length < 10) {
                     obj2.paths.pop();
		     if (obj2.paths.length > 0) {
                        obj2.ST = matchCurves.recognize(obj2.paths);
                        obj2.timer = 0;
                     }
                  }
         }

      let r = .5 + .5 * Math.cos(    Math.PI * obj2.color),
          g = .5 - .5 * Math.cos(2 * Math.PI * obj2.color),
          b = .5 - .5 * Math.cos(    Math.PI * obj2.color);
      g2.setColor([r*r*r, .7*g, b*b*b]);
      g2.lineWidth(.02);

      if (obj2.ST) {
         obj2.timer = Math.min(1, obj2.timer + 1.4 * model.deltaTime);
	 let S = t => t * t * (3 - t - t);
         let curves = matchCurves.mix(obj2.ST[0], obj2.ST[1], S(obj2.timer));
         for (let n = 0 ; n < curves.length ; n++)
            g2.drawPath(curves[n]);
      }
      else
        for (let n = 0 ; n < obj2.paths.length ; n++)
           g2.drawPath(obj2.paths[n]);
   });
   obj2.paths = [];
   obj2.color = .5;
   obj2.ST = null;
   obj2.timer = 0;

   g2.addWidget(obj2, 'button', .765, .068, '#ff8080', 'clear', () => { obj2.paths = []; obj2.ST = null; });
   g2.addWidget(obj2, 'slider', .375, .068, '#80ffff', 'color', value => obj2.color = value);

   // ANIMATED BAR CHART

   let obj3 = model.add('cube').texture(() => {
      g2.setColor('black');
      g2.textHeight(.1);
      g2.fillText('This 2D texture uses\na library function to\nrender a bar chart.', .5, .9, 'center');

      g2.setColor('blue');
      let values = [];
      for (let n = 0 ; n < 4 ; n++)
         values.push(.5 + .4 * Math.sin(n + 3 * model.time));
      g2.barChart(.25,.1,.5,.5, values, ['frodo','merry','pippin','samwise'],
                                        ['red','green','blue','magenta']);
   });

   // CLOCK

   let obj4 = model.add('cube').texture(() => g2.clock(0,0,1,1));

   // TRACKPAD AND TEXT BOX

   let obj5 = model.add('cube').texture(() => {
      g2.setColor('white');
      g2.fillRect(0,0,1,1);
      g2.setColor('black');
      g2.textHeight(.1);
      g2.fillText('' + (100*obj5.value[0]>>0), .5, .28, 'center');
      g2.fillText('' + (100*obj5.value[1]>>0), .17, .6, 'center');
      g2.fillText('Widget tester', .5, .93, 'center');
      g2.drawWidgets(obj5);
   });
   obj5.value = [.5,.5];
   g2.addWidget(obj5, 'trackpad', .5, .6, '#ff8080', 'my widget', value => obj5.value = value);
   g2.addWidget(obj5, 'textbox' , .5, .1, '#ffffff', 'hello', value => {});

   model.move(0,1.5,0).scale(.3).animate(() => {
      obj1.identity().move(2,0,0).turnY(-Math.sin(model.time)).scale(.7,.7,.0001);
      obj2.identity().move(0,-.2,0).scale(.7,.7,.0001);
      obj3.identity().move(-2,-.2,0).turnY( Math.sin(model.time)).scale(.7,.7,.0001);
      obj4.identity().move(0,1.3,0).scale(.5,.5,.0001);
      obj5.identity().move(-2,1.2,0).scale(.5,.5,.0001);
   });
}
