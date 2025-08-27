import * as cg from "../render/core/cg.js";
import { Structure } from "../render/core/structure.js";

// ONLY REDEFINE THE TEXT IF IT HAS NOT ALREADY BEEN DEFINED.
// THIS ENSURES THAT THE TEXT WON'T VANISH ON WINDOW RELOAD.

if (window.testCode === undefined)
   window.testCode = `
  let c = Math.cos(time),
      s = Math.sin(time);
  ball.move(.5 * s, 0, .1 * c)
      .scale(.07);
`;

export const init = async model => {
   let isText = false, isBall = false, ballStartTime, prevText = testCode;

   // HIDE WEB PAGE HEADER & SCENE SELECTOR MENU, AND THE "<OPEN>" OBJECT IN THE 3D SCENE.

   header.innerHTML = '';
   clay.vrWidgets.remove(3);

   // THIS IS THE APPROXIMATE DISTANCE, IN METERS, OF MY HEAD TO MY COMPUTER SCREEN.

   let hd = 0.6;

   // LOAD AN IMAGE OF THE WALL BEHIND ME AS A TEXTURE SOURCE.

   model.txtrSrc(9, '../media/textures/wall.png');

   // USE MY COMPUTER'S WEBCAM AS AN ANIMATED TEXTURE SOURCE.

   webcam._animate = true;
   model.txtrSrc(10, webcam);

   let fg = model.add('square').txtr(10).bumptxtr(9).move(0,1.6,1-hd).scale(1.6*0.6,1.2*0.6,1).flag('uFG');
   let bg = model.add('square').txtr(10)            .move(0,1.6,1-3.).scale(1.6*3.0,1.2*3.0,1).flag('uBG');

   let ball = model.add('sphere').color(1,0,0);

   // BUILD A STRUCTURE TO DISPLAY A FIELD OF EDITABLE TEXT.

   let S = new Structure();
   S.textHeight(.015);
   let textID = S.text(testCode, [0,1.47,.75]);
   S.build(model);
   S.getObject().flag('uText');

   // RESPOND TO CONTROL KEYS BY SELECTIVELY SHOWING OR HIDING OBJECTS.

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

   // CUSTOM MODIFICATIONS TO THE FRAGMENT SHADER:

   model.customShader(`
     uniform int uFG, uBG, uText;
     -------------------------------------------------------------------

     // WHEREVER MY VIDEO MATCHES THE WALL COLOR, DON'T RENDER MY VIDEO,

     if (uFG == 1) {
        float U = vUV.x;
        float V = max(min(vUV.y * 1.17 - .001, .999), .10);
        vec3 a = texture(uSampler[9],vec2(U,V)).rgb;
        color = texture(uSampler[10],vec2(-1,1)*uv).rgb;
	vec3 d = a - color;
	if (dot(d,d) < .12)
	   discard;
     }

     // THEREBY SELECTIVELY REVEALING THE 3D SCENE BEHIND ME BUT IN FRONT OF THE WALL.

     if (uBG == 1)
        color = texture(uSampler[10],vec2(-1,1)*uv).rgb;

     // SELECTIVELY MODIFY TEXT COLOR AND OPACITY TO MAKE THE TEXT EASIER TO READ.

     if (uText == 1) {
        vec3 rgb = texture(uSampler[15],uv).rgb;
	opacity = rgb.r < .5 ? 1. : .4;
        color = vec3(1);
     }

     // WE ALSO NEED TO CORRECT GAMMA, SINCE THE TEXTURE SOURCE IS VIDEO.

     color = color * color;
   `);

   model.animate(() => {
      let time = model.time - ballStartTime + Math.PI;
      ball.identity().move(0,1.6,1-hd);

      // TRY TO EVALUATE THE TEXT AS CODE. IF THERE IS A PARSING ERROR,
      // THEN REVERT TO THE PREVIOUS WORKING VERSION OF THE CODE.

      try {
         eval(S.getText(textID));
         prevText = S.getText(textID); // THIS LINE IS REACHED ONLY IF NO PARSING ERROR.
      } catch(error) {
         eval(prevText);
      }

      // SELECTIVELY DISPLAY THINGS, BASED ON THE USER HITTING CONTROL KEYS.

      if (! isBall)
         ball.scale(0);
      S.update();
      if (! isText)
         S.getObject().scale(0);
   });
}

