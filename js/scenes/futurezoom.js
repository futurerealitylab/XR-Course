import * as cg from "../render/core/cg.js";
import { Structure } from "../render/core/structure.js";

if (window.wtestCode === undefined)
   window.wtestCode = `
  let c = Math.cos(time),
      s = Math.sin(time);
  ball.identity()
      .move(-.5 * s, 1.6, .1 * c)   
      .scale(.07);
`;

export const init = async model => {
   let isText = false, isBall = false, ballStartTime;

   header.innerHTML = '';    // HIDE HEADER AND SCENE SELECTOR MENU ON 2D PAGE.
   clay.vrWidgets.remove(3); // HIDE "<OPEN>" OBJECT IN 3D SCENE.

   let hd = 0.6; // DISTANCE IN METERS FROM CAMERA TO MY HEAD

   model.txtrSrc(9, '../media/textures/wall.png');

   webcam._animate = true;
   model.txtrSrc(10, webcam);

   let fg = model.add('square').txtr(10).bumptxtr(9).move(0,1.6,1-hd).scale(1.6*0.6,1.2*0.6,1).flag('uFG');
   let bg = model.add('square').txtr(10)            .move(0,1.6,1-3.).scale(1.6*3.0,1.2*3.0,1).flag('uBG');

   let ball = model.add('sphere').color(1,0,0);

   let S = new Structure();
   S.textHeight(.015);
   let textID = S.text(wtestCode, [0,1.47,.75]);
   S.build(model);
   S.getObject().opacity(.6).flag('uS');
   S.edit(textID, key => {
      if (S.isModifierKey('Control'))
         switch (key) {
         case 'b':
            isBall = ! isBall;
	    if (isBall)
	       ballStartTime = model.time;
	    break;
         case 't':
            isText = ! isText;
	    break;
         }
   });

   model.customShader(`
     uniform int uFG, uBG, uS;
     -------------------------------------------------------------------
     if (uFG == 1) {
        float U = vUV.x;
        float V = max(min(vUV.y * 1.17 - .001, .999), .10);
        vec3 a = texture(uSampler[9],vec2(U,V)).rgb;
        color = texture(uSampler[10],vec2(-1,1)*uv).rgb;
	vec3 d = a - color;
	if (dot(d,d) < .12)
	   discard;
     }
     if (uBG == 1)
        color = texture(uSampler[10],vec2(-1,1)*uv).rgb;
     if (uS == 1) {
        vec3 rgb = texture(uSampler[15],uv).rgb;
	opacity = rgb.r < .5 ? 1. : .4;
        color = vec3(1);
     }
     color = color * color;
   `);
   model.animate(() => {
      let time = model.time - ballStartTime;
      let c = Math.cos(time), s = Math.sin(time);
      ball.identity().move(.5 * s, 1.6, 1-hd - .1 * c).scale(.07);
      if (! isBall)
         ball.scale(0);
      S.update();
      if (! isText)
         S.getObject().scale(0);
   });
}

