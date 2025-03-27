import { Diagram } from "../render/core/diagram.js";

export const init = async model => {
   let diagram = new Diagram(model, [0,1.6,0], .3, draw => {
      draw.save();
         draw.move(0,.05,0);
         draw.scale(.06);
         draw.text({ color: '#ff2020', text: 'Animated\ndiagram\n' });
      draw.restore();

      draw.save();
         draw.scale(.4);
         draw.cube({ color: 'white', lineWidth: .003 });
      draw.restore();

      draw.save();
         draw.scale(.8);
         draw.globe({ color: 'blue', step: .04 });
      draw.restore();

      draw.save();
         let path = [];
	 let A = t => 20*t-4*model.time;
	 let P = (r,t) => {
	    let x = .6*t-.3, y = .3+r*Math.sin(A(t)), z = r*Math.cos(A(t));
	    return [x, y + .05 *  Math.sin(12*x + model.time), z];
         }
	 for (let t=0 ; t<=1 ; t+=1/60) path.push(P(.10,t));
	 for (let t=1 ; t>=0 ; t-=1/60) path.push(P(.04,t));
         draw.fill({ color: '#108080', path: path });
      draw.restore();
   });

   model.animate(() => {
      diagram.update();
   });
}
