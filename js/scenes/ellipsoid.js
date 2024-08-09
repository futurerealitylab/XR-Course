import * as cg from "../render/core/cg.js";
window.params = [1,.5,.3];
const s = 0.3, y = 1.5, textHeight = 0.035;
const template = '(x /%{5})² + (y /%{5})² + (z /%{5})² = 1';

let formattedString = (template, values, state) => {
   let t = template.split('%{');
   let s = t[0];
   for (let i = 1 ; i < t.length ; i++) {
      let b = t[i].indexOf('}');
      let nb = t[i].substring(0, b).split(',');
      let sp = cg.fixedWidth(values[i-1], nb[0], nb[1]);

      let n = s.length;
      if ((state.index == n+3 || state.index == n+4) && Math.abs(state.delta) > 1) {
	 values[i-1] += Math.sign(state.delta) * (state.index == n+3 ? .1 : .01);
	 state.delta = 0;
      }

      s += sp + t[i].substring(b+1);
   }
   return s;
}

export const init = async model => {
   let state = { index: -1, delta: 0 }, text = '', p;
   let axes = model.add();
   for (let i = 0 ; i < 3 ; i++)
      axes.add('cube').move(0,y,0).scale(s).scale(i==0?1.2:.003,i==1?1.2:.003,i==2?1.2:.003);
   let handles = model.add();
   for (let i = 0 ; i < 6 ; i++)
      handles.add('cube').text('-X-Y-Z+X+Y+Z'.substring(2*i,2*i+2), .7).opacity(.9);
   let ball = model.add('sphere').opacity(.8).color(0,.5,1);
   let info = model.add().move(0,y+.2*s,0).scale(s);

   let infoScrim = model.add().move(0,y+.2*s,0);
   for (let n = 0 ; n < 4 ; n++)
      for (let x = -.172 ; x < .2 ; x += .178)
         infoScrim.add('square').turnY(n*Math.PI/2).move(x,0,s+.001).scale(.015,.015,.001).opacity(.6);

   let getPointOnText = hand => {
      let p = inputEvents.pos(hand);
      p = cg.mTransform(cg.mInverse(info.getMatrix()), p);
      let x = p[0] / textHeight, y = p[1] / textHeight, z = p[2];

      if (p[2] < 0 && Math.abs(p[2]) > Math.abs(p[0]))
         return [-p[0] / textHeight, p[1] / textHeight,-p[2] ];

      if (p[0] > 0 && Math.abs(p[0]) > Math.abs(p[2]))
         return [-p[2] / textHeight, p[1] / textHeight, p[0] ];

      if (p[0] < 0 && Math.abs(p[0]) > Math.abs(p[2]))
         return [ p[2] / textHeight, p[1] / textHeight,-p[0] ];

      return [ p[0] / textHeight, p[1] / textHeight, p[2] ];
   }

   let getPointOnBall = hand => {
      let p = inputEvents.pos(hand);
      return cg.mTransform(cg.mInverse(ball.getMatrix()), p);
   }

   let isHandNearText = {left: false, right: false};

   let isHandNearBallEnd = (p,i,j,k) => Math.abs(Math.abs(p[i])-1) < .05 / params[i]
                                             &&  Math.abs(p[j])    < .05 / params[j]
                                             &&  Math.abs(p[k])    < .05 / params[k] ;

   let handleNearHand = {left: -1, right: -1};

   let pointToIndex = p => 0.84 * p[0] + text.length/2 >> 0;

   inputEvents.onMove = hand => {
      let p = getPointOnText(hand);
      let index = pointToIndex(p);
      isHandNearText[hand] = p[1] > -1 && p[1] < 1
                          && p[2] > .95 && p[2] < 1.05
			  && index >= 0 && index < text.length;

      handleNearHand[hand] = -1;
      for (let i = 0 ; i < 6 ; i++)
         if (cg.distance(inputEvents.pos(hand), handles.child(i).getMatrix().slice(12,15)) < .05)
	    handleNearHand[hand] = i;
   }

   let activeHandle = -1;

   inputEvents.onPress = hand => {
      state.index = -1;
      if (isHandNearText[hand]) {
         p = getPointOnText(hand);
	 state.index = pointToIndex(p);
      }

      activeHandle = handleNearHand[hand];
   }

   inputEvents.onDrag = hand => {
      if (state.index >= 0) {
         let q = getPointOnText(hand);
         state.delta += q[1] - p[1];
         p = q;
      }

      if (activeHandle >= 0) {
         let p = inputEvents.pos(hand);
	 p = cg.scale([p[0],p[1]-y,p[2]], 1/s);
	 params[activeHandle%3] = Math.max(.1, Math.min(1, Math.abs(p[activeHandle%3])));
      }
   }

   inputEvents.onRelease = hand => {
      state.index = -1;
      activeHandle = -1;
   }

   model.animate(() => {
      clay.controllerBallSize = isHandNearText.left || isHandNearText.right ? .005 : .02;
      params = server.synchronize('params');
      ball.identity().move(0,y,0).scale(s).scale(params);
      for (let i = 0 ; i < 6 ; i++) {
         let t = (i<3?-1:1) * (1 + .05/params[i%3]);
	 handles.child(i).identity().move(0,y,0).scale(s)
	                 .move(i%3==0 ? t * params[0] : 0,
                               i%3==1 ? t * params[1] : 0,
                               i%3==2 ? t * params[2] : 0).scale(.04)
                         .color(i == activeHandle ? [0,1,2] :
			        handleNearHand.left==i || handleNearHand.right==i ? [0,.5,1] : [0,.1,.2]);
      }
      text = formattedString(template, params, state);

      let anyChanges = false;
      for (let i = 0 ; i < params.length ; i++)
         if (params[i] != paramsPrev[i] || params[i] < .1 || params[i] > 1) {
	    anyChanges = true;
            params[i] = Math.max(.1, Math.min(1, params[i]));
            paramsPrev[i] = params[i];
         }
      if (anyChanges)
         server.broadcastGlobal('params');

      info.text(text, textHeight);
   });

   let paramsPrev = params.slice();
}

export const deinit =  () => {
   clay.controllerBallSize = 0.02;
}

