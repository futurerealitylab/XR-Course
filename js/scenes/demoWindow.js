import * as cg from "../render/core/cg.js";
// import { loadSound, playLoopingSoundAtPositionAdvance, 
//          stopLoopingSound, updateAdvanceSoundPosition,
//          updateSourceOrientation, updateSourceWidth,
//          updateSourceDirectivityPattern, updateSourceGain} from "../util/positional-audio.js";

// Audio Stuff


/*
let chartSoundBuffer = null;

function preloadSounds() {
    Promise.all([
        loadSound('../../media/sound/SFXs/demoChart/SFX_Chart_Hologram_Mono_LP_01.wav', buffer => chartSoundBuffer = buffer)
    ])
    .then(() => {
        console.log('All sounds loaded successfully');
    })
    .catch(error => {
        console.error('An error occurred while loading sounds:', error);
    });
}

// load SFXs
preloadSounds();
*/

export const init = async model => {
   let obj = model.add().move(0,1.6,0).scale(2).color(.1,.1,.1).dull();
   model.txtrSrc(1, '../media/textures/moon_diffuse.jpg');
   obj.add('sphere').move(0,0,-.5).turnX(-Math.PI/2).scale(.3).color('white')
                    .txtr(1);
   obj.add('cube').move(-.4,0,-1).scale(.001,.4,1);
   obj.add('cube').move( .4,0,-1).scale(.001,.4,1);
   obj.add('cube').move(0,-.4,-1).scale(.4,.001,1);
   obj.add('cube').move(0, .4,-1).scale(.4,.001,1);
   obj.add('cube').move(0,0,-1).scale(.4,.4,.01);

   let th = .05;
   let frame = model.add().color('bronze');
   frame.add('cube').move(  0,1.2,-th).scale(.4+th,th,2*th);
   frame.add('cube').move(  0,2.0,-th).scale(.4+th,th,2*th);
   frame.add('cube').move(-.4,1.6,-th).scale(   th,.4,2*th);
   frame.add('cube').move( .4,1.6,-th).scale(   th,.4,2*th);

   model.customShader(`
   vec3 A = vec3( .4,2.0,0.);
   vec3 B = vec3(-.4,2.0,0.);
   vec3 C = vec3(-.4,1.2,0.);
   vec3 D = vec3( .4,1.2,0.);
   uniform mat4 uWorld;
   uniform int uIsClipping;
   void myClip(vec3 a, vec3 b) {
      a = (uProj * uView * uWorld * vec4(a, 1.)).xyz;
      b = (uProj * uView * uWorld * vec4(b, 1.)).xyz;
      vec3 c = (uProj * vec4(0.,0.,0.,1.)).xyz;
      if (dot(vPos, cross(a-b, b-c)) < 0.)
         discard;
   }
   -------------------------------
   if (uIsClipping == 1) {
      myClip(A, B);
      myClip(B, C);
      myClip(C, D);
      myClip(D, A);
   }
   `);
   obj.flag('uIsClipping');

   // play sound at given position
   // let objPos = obj.getGlobalMatrix();
   // playLoopingSoundAtPositionAdvance(chartSoundBuffer, [objPos[12], objPos[13], objPos[14]]);
   // still need to sync to global calibration 
   // updateSourceOrientation(-1,0,0,0,1,0);
   // updateSourceWidth(45);
   // updateSourceDirectivityPattern(0.5,1);
   // updateSourceGain(0.7);
   model.animate(() => {
      model.setUniform('Matrix4fv', 'uWorld', false, worldCoords);
      let eye = cg.mTransform(clay.inverseRootMatrix, model.inverseViewMatrix(0).slice(12,15));   
      let t = Math.abs(eye[0]) > .4 ? .001 : .1;
      obj.opacity(Math.max(.001, Math.min(1, eye[2]/t + 1)));
      // let objPos = obj.getGlobalMatrix();
      // updateAdvanceSoundPosition([objPos[12], objPos[13], objPos[14]]);
   });
}

