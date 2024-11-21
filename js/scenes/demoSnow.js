import * as cg from "../render/core/cg.js";
import { loadStereoSound, playStereoAudio } from "../util/stereo-audio.js";


// Audio Stuff

let snowSoundBuffer = null;

function preloadSounds() {
    Promise.all([
        loadStereoSound('../../media/sound/SFXs/demoSnow/Amb_Snow_Stereo_LP_01.wav', buffer => snowSoundBuffer = buffer)
    ])
    .then(() => {
        //console.log('Snow sound loaded successfully');
    })
    .catch(error => {
        //console.error('An error occurred while loading snow sounds:', error);
    });
}

// load SFXs
preloadSounds();


export const init = async model => {

   playStereoAudio(snowSoundBuffer);
   //console.log('Test sound model');


   let N = 10000;

   model.customShader(`
      float rand(vec2 co){
         return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
      }
      uniform int uTriToHex;
      -------------------------------
      if (uTriToHex==1) {
         float u = vUV.x-.5, v = vUV.y-.5, w = -u-v-.5;
         float t = rand(vAPos.xy);
	 if (u*u + v*v + w*w + t > .25)
	    discard;
      }
   `);
   model.flag('uTriToHex');
   let inch = 0.0254, yc = 127*inch;
   let pointData = [], oData=[];
   for (let n = 0 ; n < N ; n++) {
      let x = 1, y = yc+10*inch, z = 1;
         x = (Math.random()-.5) * 20.;
         y = (Math.random()-.5) * 16.;
         z = (Math.random()-.5) * 20.;

      oData.push([x,y,z]);      
      pointData.push([x,y,z]);
   }

   let N31 = ([x,y,z], s)=>{
      let a = Math.sin(x*249824.11*s+y*19122.11)+z*99.1121;
      return a - Math.floor(a);
   }

   let vertexData = [];
   for (let n = 0 ; n < N ; n++)
      for (let i = 0 ; i < 3 ; i++)
         vertexData.push([ 0,0,0, 0,0,0, (i==1?1:0), (i==2?1:0) ]);

   clay.defineMesh('dots', clay.trianglesMesh(vertexData));

   let obj = model.add('dots').color(1,1,1);

   let time = 0;



   model.animate(() => {

      //console.log('Test sound animate');


      time+=0.016;
      for (let n = 0 ; n < N ; n++) {
         pointData[n][0]+=Math.sin(time+N31(oData[n], 231.3)*50)*.01;
         pointData[n][2]+=Math.cos(time+N31(oData[n], 77.77)*90)*.01;
         pointData[n][1]-=.01 * N31(oData[n], 0.866);

         if(pointData[n][1]<=-6.)
         pointData[n][1] = 8.;
      }
      let vm = cg.mMultiply(clay.inverseRootMatrix, clay.root().inverseViewMatrix(0));
      let X = vm.slice(0,3);
      let Y = vm.slice(4,7);
      let Z = vm.slice(8,11);

      let D = [[0,0,0], [0,0,0], [0,0,0]];
      for (let i = 0 ; i < 3 ; i++) {
         let c = .07 * Math.cos(2 * Math.PI * i / 3);
         let s = .07 * Math.sin(2 * Math.PI * i / 3);
         for (let j = 0 ; j < 3 ; j++)
            D[i][j] = c * X[j] + s * Y[j];
      }

      let mesh = clay.getMesh('dots');
      for (let n = 0 ; n < 3*N ; n++)
         for (let j = 0 ; j < 3 ; j++) {
            mesh[16*n   + j] = pointData[n/3>>0][j] + D[n%3][j];
            mesh[16*n+3 + j] = Z[j];
         }

      obj.identity().move(0,1.6,0).scale(.2);
   });
}

