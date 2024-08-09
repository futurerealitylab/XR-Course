import * as cg from "./cg.js";
import { g2 } from "../../util/g2.js";

export let uiBox = (type, model, labelFunction, selectFunction) => {
   let root = model.add();
   root.add('cubeXZ').texture(labelFunction);
   root.add('cube').move(0, .98,0).scale(1,.01,1);
   root.add('cube').move(0,-.98,0).scale(1,.01,1);
   let wasLP = false, wasRP = false;
   if (type == 'slider') {
      let min = 0, max = 1, travel = 0.3, hand = null, y0, value = 0.5;
      root.max = t => { max = t; return this; }
      root.min = t => { min = t; return this; }
      root.set = t => { value = t; return this; }
      root.travel = t => { travel = t; return this; }
      root.update = () => {
         let L = inputEvents.pos('left' );
         let R = inputEvents.pos('right');
         let LI = cg.isPointInBox(L, root.getMatrix());
         let RI = cg.isPointInBox(R, root.getMatrix());
         let LP = inputEvents.isPressed('left');
         let RP = inputEvents.isPressed('right');
         root.color(LI && LP || RI && RP ? 'red' : LI || RI ? 'pink' : 'white');
         if (LI && ! wasLP && LP || RI && ! wasRP && RP) {
            hand = LI ? 'left' : 'right';
            y0 = hand == 'left' ? L[1] : R[1];
         }
         if (hand) {
            let y1 = hand == 'left' ? L[1] : R[1];
	    value = Math.max(min, Math.min(max, value + (max-min) * (y1-y0) / travel));
            selectFunction(value);
	    y0 = y1;
	    if (hand == 'left' && ! LP || hand == 'right' && ! RP)
	       hand = null;
         }
         wasLP = LP;
         wasRP = RP;
      }
   }
   if (type == 'button') {
      root.update = () => {
         let LI = cg.isPointInBox(inputEvents.pos('left' ), root.getMatrix());
         let RI = cg.isPointInBox(inputEvents.pos('right'), root.getMatrix());
         let LP = inputEvents.isPressed('left');
         let RP = inputEvents.isPressed('right');
         root.color(LI && LP || RI && RP ? 'red' : LI || RI ? 'pink' : 'white');
         if (LI && wasLP && ! LP || RI && wasRP && ! RP)
            selectFunction();
         wasLP = LP;
      }
   }
   return root;
}

