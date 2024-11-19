"use strict";
import { scenes } from "/js/handle_scenes.js";
import * as cg from "./cg.js";
import { buttonState, controllerMatrix } from "./controllerInput.js";
import { HandsWidget } from "./handsWidget.js";
import { PeopleBillboards } from "./peopleBillboards.js";
import { InputEvents } from "./inputEvents.js";
import { createInput, Input } from "./inputAPI.js";
import { EditText } from "./editText.js";
import { CodeEditor } from "./codeEditor.js";
import * as keyboardInput from "../../util/input_keyboard.js";
import { g2 } from "../../util/g2.js";
import { videoHandTracker } from "./videoHandTracker.js";
import * as glUtil from "./gl_util.js"
import * as clayExtensions from "./clay_extensions.js";

import * as wasm from "/js/wasm.js";

import { selfDefinedAvatar } from "./myAvatar.js";

import * as sync from "/js/util/sync.js";
import * as input from "./inputEvents.js";
import * as room_mng from "/js/util/room_manager.js";
import * as audio from "../../util/spatial-audio.js"

let copiedObj = {};
let copiedObjID = [];
let otherObjID = [];
let copiedAvatar = {};
let copiedAvatarID = [];
let otherAvatarID = [];
window.timestamp=0;

// NOTE(KTR): buffers for passing values without creating new arrays
const __retBuf   = [0, 0, 0];
const __retBuf2  = [0, 0, 0];
const __retBuf16 = [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];
const deferredDraws = [];

// NOTE(KTR): placeholder Mesh structure wrapper around the internal data
export function MeshInfo() {
   this.data              = null;
   this.vbo               = null;  
   this.byteCount         = 0;
   this.bufferByteOffset  = 0;

   this.primitiveTopology = Clay.TRIANGLE_STRIP;
}

let debug = false;

export function Clay(gl, canvas) {
   this.debug = state => debug = state;

   let clearTexture = new ImageData(textureCanvas.width, textureCanvas.height);

   let textureConfig  = new Map();

   let clayPgm = function () {
      this.program = null;
      this.vao = null;
      this.vbo = null;
      this.initVBO = (gl) => {
         this.vbo = gl.createBuffer();
      };
      this.initVAO = (gl) => {
         this.vao = gl.createVertexArray();
      };
   }
   this.controllerOrigin = hand => cg.mTransform(controllerMatrix[hand], [hand=='left'?.01:-.01,-.04,-.08]);
   this.gl = gl;
   this.clayPgm = new clayPgm();
   this.formMesh = name => formMesh[name];
   let pgm = null;
   let displacementTextureType = 0;
   let formMesh = {};
   let setFormMesh = (name, mesh) => {
      formMesh[name] = mesh;
      mesh.name = name;
   }
   let textureFunction = null;
   let time;
   let uvToForm;
   let justPressed = false;
   let enableModeling = false;
   this.renderingIsActive = true;
   
   let convertToMesh = arg => {
      if (! Array.isArray(arg[0]))
         return arg;
      let mesh = [];
      return mesh;
   }
   
   this.defineMesh = (name, value) => formMesh[name] = convertToMesh(value);

//////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////// MATH FUNCTIONS ///////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////

   let add = (a, b) => [ a[0] + b[0], a[1] + b[1], a[2] + b[2] ];
   let cross = (a,b) => [ a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0] ];

   let dot = (a,b) => a[0] * b[0] + a[1] * b[1] + ( a.length < 3 ? 0 : a[2] * b[2] +
      ( a.length < 4 ? 0 : a[3] * b[3] ));
   let floor = Math.floor;
   let mixf = (a,b,t,u) => a * (u===undefined ? 1-t : t) + b * (u===undefined ? t : u);
   let mix = (a,b,t,u) => [ mixf(a[0],b[0],t,u), mixf(a[1],b[1],t,u), mixf(a[2],b[2],t,u) ];
   let noise = (new function() {
   let p = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
   for (let i = 0 ; i < 256 ; i++) p.push(p[i]);
   let fade = t => t * t * t * (t * (t * 6 - 15) + 10);
   let lerp = (t,a,b) => a + t * (b - a);
   let grad = (hash, x,y,z) => {
      let h = hash & 15, u = h < 8 || h == 12 || h == 13 ? x : y,
                         v = h < 4 || h == 12 || h == 13 ? y : z;
      return ((h & 1) == 0 ? u : -u) + ((h & 2) == 0 ? v : -v);
   }
   this.noise = (x,y,z) => {
         let X = floor(x) & 255, u = fade(x -= floor(x)),
             Y = floor(y) & 255, v = fade(y -= floor(y)),
             Z = floor(z) & 255, w = fade(z -= floor(z)),
             A = p[X    ] + Y, AA = p[A] + Z, AB = p[A + 1] + Z,
             B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
      return lerp(w, lerp(v, lerp(u, grad(p[AA    ], x, y    , z    ), grad(p[BA    ], x - 1, y    , z    )),
                             lerp(u, grad(p[AB    ], x, y - 1, z    ), grad(p[BB    ], x - 1, y - 1, z    ))),
                     lerp(v, lerp(u, grad(p[AA + 1], x, y    , z - 1), grad(p[BA + 1], x - 1, y    , z - 1)),
                             lerp(u, grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1))));
   }
   }).noise;
   let norm = v => Math.sqrt(dot(v,v));
   let normalize = v => scale(v, 1 / norm(v));
   let round = t => floor(t*1000) / 1000;
   let sCurve = t => Math.max(0, Math.min(1, t * t * (3 - 2 * t)));
   let scale = (v, s) => { let w = []; for (let i=0 ; i<v.length ; i++) w.push(s*v[i]); return w; }
   let subtract = (a, b) => [ a[0] - b[0], a[1] - b[1], a[2] - b[2] ];
   let uniqueID = () => 1000 * floor(Math.random() * 1000000) + (Date.now() % 1000);


//////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////// MATRICES //////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////


let matrix_identity = () => [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];

let matrix_translate = (x,y,z) => {
   if (y === undefined) {
      z = x[2];
      y = x[1];
      x = x[0];
   }
   let m = matrix_identity();
   m[12] = x;
   m[13] = y;
   m[14] = z;
   return m;
}

let matrix_rotateX = theta => {
   let m = matrix_identity();
   m[ 5] =  Math.cos(theta);
   m[ 6] =  Math.sin(theta);
   m[ 9] = -Math.sin(theta);
   m[10] =  Math.cos(theta);
   return m;
}

let matrix_rotateY = theta => {
   let m = matrix_identity();
   m[10] =  Math.cos(theta);
   m[ 8] =  Math.sin(theta);
   m[ 2] = -Math.sin(theta);
   m[ 0] =  Math.cos(theta);
   return m;
}

let matrix_rotateZ = theta => {
   let m = matrix_identity();
   m[ 0] =  Math.cos(theta);
   m[ 1] =  Math.sin(theta);
   m[ 4] = -Math.sin(theta);
   m[ 5] =  Math.cos(theta);
   return m;
}

let matrix_scale = (x,y,z) => {
   if (y === undefined)
      if (Array.isArray(x)) {
         z = x[2];
         y = x[1];
         x = x[0];
      }
      else
         y = z = x;
   let m = matrix_identity();
   m[ 0] = x;
   m[ 5] = y;
   m[10] = z;
   return m;
}

let matrix_multiply = (a,b) => {
   let m = [];
   for (let col = 0 ; col < 4 ; col++)
   for (let row = 0 ; row < 4 ; row++) {
      let value = 0;
      for (let i = 0 ; i < 4 ; i++)
         value += a[4*i + row] * b[4*col + i];
      m.push(value);
   }
   return m;
}

let matrix_transform = (m,p) => {
   let x = p[0], y = p[1], z = p[2], w = p[3] === undefined ? 1 : p[3];
   let q = [ m[0]*x + m[4]*y + m[ 8]*z + m[12]*w,
             m[1]*x + m[5]*y + m[ 9]*z + m[13]*w,
             m[2]*x + m[6]*y + m[10]*z + m[14]*w,
             m[3]*x + m[7]*y + m[11]*z + m[15]*w ];
   return p[3] === undefined ? [ q[0]/q[3],q[1]/q[3],q[2]/q[3] ] : q;
}

let matrix_inverse = (src) => {
  let dst=[], det = 0, cofactor = (c, r) => {
     let s = (i, j) => src[c+i & 3 | (r+j & 3) << 2];

     const s1_1 = s(1,1);
     const s1_2 = s(1,2);
     const s1_3 = s(1,3);
     const s2_2 = s(2,2);
     const s2_3 = s(2,3);
     const s3_2 = s(3,2);
     const s3_3 = s(3,3);

     return (c+r & 1 ? -1 : 1) * ( (s1_1 * (s2_2 * s3_3 - s3_2 * s2_3))
                                 - (s(2,1) * (s1_2 * s3_3 - s3_2 * s1_3))
                                 + (s(3,1) * (s1_2 * s2_3 - s2_2 * s1_3)) );
  }
  for (let n = 0 ; n < 16 ; n++) dst.push(cofactor(n >> 2, n & 3));
  for (let n = 0 ; n <  4 ; n++) det += src[n] * dst[n << 2];
  for (let n = 0 ; n < 16 ; n++) dst[n] /= det;
  return dst;
}


let matrix_aimX = X => {
   X = normalize(X);
   let Y0 = cross([0,0,1], X), t0 = dot(Y0,Y0), Z0 = cross(X, Y0),
       Y1 = cross([1,1,0], X), t1 = dot(Y1,Y1), Z1 = cross(X, Y1),
       t = t1 / (4 * t0 + t1),
       Y = normalize(mix(Y0, Y1, t)),
       Z = normalize(mix(Z0, Z1, t));
   return [ X[0],X[1],X[2],0, Y[0],Y[1],Y[2],0, Z[0],Z[1],Z[2],0, 0,0,0,1 ];
}

let matrix_aimY = Y => {
   Y = normalize(Y);
   let Z0 = cross([1,0,0], Y), t0 = dot(Z0,Z0), X0 = cross(Y, Z0),
       Z1 = cross([0,0,1], Y), t1 = dot(Z1,Z1), X1 = cross(Y, Z1),
       t = t1 / (4 * t0 + t1),
       Z = normalize(mix(Z0, Z1, t)),
       X = normalize(mix(X0, X1, t));
   return [ X[0],X[1],X[2],0, Y[0],Y[1],Y[2],0, Z[0],Z[1],Z[2],0, 0,0,0,1 ];
}

let matrix_aimZ = Z => {
   Z = normalize(Z);
   let X0 = cross([0,1,0], Z), t0 = dot(X0,X0), Y0 = cross(Z, X0),
       X1 = cross([1,0,0], Z), t1 = dot(X1,X1), Y1 = cross(Z, X1),
       t = t1 / (4 * t0 + t1),
       X = normalize(mix(X0, X1, t)),
       Y = normalize(mix(Y0, Y1, t));
   return [ X[0],X[1],X[2],0, Y[0],Y[1],Y[2],0, Z[0],Z[1],Z[2],0, 0,0,0,1 ];
}

let matrix_perspective = fl => [ 1,0,0,0, 0,1,0,0, 0,0,-1,-1/fl, 0,0,-1,0 ];

let matrix_project = (x,y,z) => [ 1,0,0,x, 0,1,0,y, 0,0,1,z, 0,0,0,1 ];

let matrix_transpose = m => [ m[0],m[4],m[ 8],m[12],
                              m[1],m[5],m[ 9],m[13],
                              m[2],m[6],m[10],m[14],
                              m[3],m[7],m[11],m[15] ];

//---------- MATRIX OBJECT CLASS ------------

let Matrix = function() {
   let top = 0, m = [ matrix_identity() ];
   this.aimX      = X       => m[top] = matrix_multiply(m[top], matrix_aimX(X));
   this.aimY      = Y       => m[top] = matrix_multiply(m[top], matrix_aimY(Y));
   this.aimZ      = Z       => m[top] = matrix_multiply(m[top], matrix_aimZ(Z));
   this.identity  = ()      => m[top] = matrix_identity();
   this.translate = (x,y,z) => m[top] = matrix_multiply(m[top], matrix_translate(x,y,z));
   this.rotateX   = theta   => m[top] = matrix_multiply(m[top], matrix_rotateX(theta));
   this.rotateY   = theta   => m[top] = matrix_multiply(m[top], matrix_rotateY(theta));
   this.rotateZ   = theta   => m[top] = matrix_multiply(m[top], matrix_rotateZ(theta));
   this.scale     = (x,y,z) => m[top] = matrix_multiply(m[top], matrix_scale(x,y,z));
   this.project   = (x,y,z) => m[top] = matrix_multiply(m[top], matrix_project(x,y,z));
   this.getValue  = ()      => m[top];
   this.setValue  = value   => m[top] = value.slice();
   this.save      = ()      => { m[top+1] = m[top].slice(); top++; }
   this.restore   = ()      => --top;
}

let M = new Matrix();


//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////// WEBGL SUPPORT ///////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////
const TEXTURE_LOAD_STATE_UNFINISHED = 1;
let textures = {};

//const DEFAULT_FONT = 'media/textures/kens-font.png';
const DEFAULT_FONT = 'media/textures/fixed-width-font.png';

let isTexture = file => textures[file] && textures[file] != TEXTURE_LOAD_STATE_UNFINISHED && ! textures[file + '_error'];
this.textureUnload = (file) => {
   if (isTexture(file)) {
      gl.deleteTexture(textures[file]);
      delete textures[file];
   }
}


this.addEventListenersToCanvas = function(canvas) {
   let r = canvas.getBoundingClientRect();
   let toX = x => (2 * x - r.left - r.right) / canvas.height,
       toY = y => 1 - 2 * (y - r.top) / canvas.height;

   if (! canvas.onDrag      ) canvas.onDrag       = (x, y) => { };
   if (! canvas.onMove      ) canvas.onMove       = (x, y) => { };
   if (! canvas.onPress     ) canvas.onPress      = (x, y) => { };
   if (! canvas.onRelease   ) canvas.onRelease    = (x, y) => { };
   if (! canvas.onKeyPress  ) canvas.onKeyPress   = key => { };
   if (! canvas.onKeyRelease) canvas.onKeyRelease = key => { };

   canvas.addEventListener('mousemove', function(e) {
      this._response = this._isDown ? this.onDrag : this.onMove;
      this._response(toX(e.clientX), toY(e.clientY));
   });

   canvas.addEventListener('mousedown', function(e) {
      this.onPress(toX(e.clientX), toY(e.clientY));
      this._isDown = true ;
   });

   canvas.addEventListener('mouseup'  , function(e) {
      this.onRelease(toX(e.clientX), toY(e.clientY));
      this._isDown = false;
   });

   window.addEventListener('keydown', function(e) {
      switch (e.keyCode) {
      case   8: // DELETE
      case  32: // SPACE
      case  33: // PAGE UP
      case  34: // PAGE DOWN
      case  37: // LEFT ARROW
      case  38: // UP ARROW
      case  39: // RIGHT ARROW
      case  40: // DOWN ARROW
      case 191: // /
      case 222: // '
         e.preventDefault();
      }
      canvas.onKeyPress(e.keyCode, e);
   }, true);

   window.addEventListener('keyup', function(e) {
      canvas.onKeyRelease(e.keyCode, e);
   }, true);
}

function setUniform(type, name, a, b, c, d, e, f) {
   (gl['uniform' + type])(pgm.uniform[name], a, b, c, d, e, f);
}

let materials = {}, defaultColor;

let isNewBackground = 30;

this.imageOnLoad = (textureSrc, image) => {
   try {
      if (textureSrc != DEFAULT_FONT) {
         textures[textureSrc] = {key: textureSrc, resource : gl.createTexture() , width: image.width, height: image.height};
         gl.bindTexture   (gl.TEXTURE_2D, textures[textureSrc].resource);
         gl.texImage2D    (gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
         const config = textureConfig.get(textureSrc);
         if (config) {
            if (config.nearestFilterPreset) {
               gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
               gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            } else { // config.mipmappedLinearPreset
               gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
               gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
               gl.generateMipmap(gl.TEXTURE_2D);
            }
            textureConfig.delete(textureSrc);
         } else {
            gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
         }
      } else {
         // FOR NOW, TEXTURE ATLASES SHOULD USE
         // NEAREST SAMPLING AND NO MIPMAPPING FOR SIMPLICITY
         // TO AVOID NEED FOR ADDITION OF PADDING OR CLAMPING IN THE FRAGMENT SHADER
         textures[textureSrc] = {key : textureSrc, resource : gl.createTexture() , width: image.width, height: image.height};
         gl.bindTexture   (gl.TEXTURE_2D, textures[textureSrc].resource);
         gl.texImage2D    (gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
         gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
         gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      }
      return textures[textureSrc];
   } catch (e) { 
      textures[textureSrc + '_error'] = true; 
      if (textures.hasOwnProperty(textureSrc)) {
         delete textures[textureSrc];
      }
      return null;
   }
}
this.imageLoad = (image, textureSrc) => {
   const outer = this;
   return new Promise((resolve, reject) => {
      image.onload = function(event) {
         if (outer.imageOnLoad(textureSrc, image)) {
            resolve(textures[textureSrc]);
         } else {
            reject(null);
         }
      }
      image.src = textureSrc;
   });
};

// NOTE: track the previous mesh - do not reupload if already uploaded
let prevMesh = null;
// same for textures
let prevTextureResource  = null;
let prevTextureBindPoint = -1;

let drawMesh = (mesh, materialId, textureSrc, bumpTextureSrc, dull, flags, customShader, opacity, view) => {
   if (!this.renderingIsActive)
      return;

   let saveProgram = this.clayPgm.program;
   if (customShader)
      window.customShader = customShader;

   let m = M.getValue();
   setUniform('Matrix4fv', 'uIRM', false, clay.inverseRootMatrix);
   setUniform('Matrix4fv', 'uModel', false, m);
   setUniform('Matrix4fv', 'uInvModel', false, matrix_inverse_w_buffer16(m, __retBuf16));

   setUniform('1f', 'uOpacity', opacity ? opacity : 1);

   let material = materials[materialId];
   let a = material.ambient, d = material.diffuse, s = material.specular, t = material.texture;
   if (t === undefined) t = [0,0,0,0];
   setUniform('Matrix4fv', 'uPhong', false, [a[0],a[1],a[2],0, d[0],d[1],d[2],0, s[0],s[1],s[2],s[3], t[0],t[1],t[2],t[3]]);

   if (textureSrc) {
     // LOAD THE TEXTURE IF IT HAS NOT BEEN LOADED.
     if (!textures.hasOwnProperty(textureSrc)) {
       if (typeof textureSrc === 'function') {
         textures[textureSrc] = {
	    resource : [], 
            resourceIdx : 0, width: textureCanvas.width, height: textureCanvas.height
	 };

         const textureRecord = textures[textureSrc];
         for (let i = 0; i < 3; i += 1) {
            textureRecord.resource.push(gl.createTexture());   
         }

         for (let i = 0; i < textureRecord.resource.length; i += 1) {
            gl.bindTexture   (gl.TEXTURE_2D, textureRecord.resource[i]);
            gl.texImage2D    (gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureCanvas);
            //gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            //gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
         }
       }
       else if (textureSrc == 'camera') {

         // VIDEO TEXTURE FROM THE CAMERA CAN START IMMEDIATELY

         textures[textureSrc] = {resource : [gl.createTexture(), gl.createTexture(), gl.createTexture()], resourceIdx : 0,
            width: videoFromCamera.width, height: videoFromCamera.height};
         const textureRecord = textures[textureSrc];
         for (let i = 0; i < textureRecord.resource.length; i += 1) {
            gl.bindTexture   (gl.TEXTURE_2D, textureRecord.resource[i]);
            gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
         }
       }
       else if (textureSrc == 'anidraw') {

         // TEXTURE FROM ANIDRAW

         textures.anidraw = {resource : [gl.createTexture()
            //, gl.createTexture(), gl.createTexture()
            ], resourceIdx : 0, 
            width: anidrawCanvas.width, height: anidrawCanvas.height};
         const textureRecord = textures[textureSrc];
         for (let i = 0; i < textureRecord.resource.length; i += 1) {
            gl.bindTexture   (gl.TEXTURE_2D, textureRecord.resource[i]);
            gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
         }
       }
       else {
         // MARK AS LOADING IN-PROGRESS TO AVOID LOADING REPEATEDLY
         textures[textureSrc] = TEXTURE_LOAD_STATE_UNFINISHED; 
         let image = new Image();
         this.imageLoad(image, textureSrc).catch((err) => {console.error(err);} );
       }
     }
     else if (textures[textureSrc] != TEXTURE_LOAD_STATE_UNFINISHED) {
       if (typeof textureSrc === 'function') {
         if (prevTextureBindPoint != gl.TEXTURE0) {
            prevTextureBindPoint = gl.TEXTURE0;
            gl.activeTexture(gl.TEXTURE0);
         }
         const textureRecord = textures[textureSrc];
         const texResource = textureRecord.resource[textureRecord.resourceIdx];
         if (texResource != prevTextureResource) {
            prevTextureResource = texResource;
            gl.bindTexture(gl.TEXTURE_2D, texResource);
         }
         //textureRecord.resourceIdx = (textureRecord.resourceIdx + 1) % textureRecord.resource.length;
         textureCanvasContext2D.putImageData(clearTexture, 0, 0);
         textureSrc();
         gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureCanvas);
       }
       // VIDEO TEXTURE FROM THE CAMERA AND ANIDRAW NEED TO BE REFRESHED REPEATEDLY
       else if (textureSrc == 'camera') {
         if (window.videoFromCameraIsReady) {
            if (prevTextureBindPoint != gl.TEXTURE0) {
               prevTextureBindPoint = gl.TEXTURE0;
               gl.activeTexture(gl.TEXTURE0);
            }
            const textureRecord = textures[textureSrc];
            const texResource = textureRecord.resource[textureRecord.resourceIdx]
            if (texResource != prevTextureResource) {
               prevTextureResource = texResource;
               gl.bindTexture(gl.TEXTURE_2D, texResource);
            }
            if (frameCount % 4 == 0) {
               textureRecord.resourceIdx = (textureRecord.resourceIdx + 1) % 3;
               gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoFromCamera);
            }
         }
       }
       else if (textureSrc == 'anidraw') {
          if (prevTextureBindPoint != gl.TEXTURE2) {
             prevTextureBindPoint = gl.TEXTURE2;
             gl.activeTexture(gl.TEXTURE2);
          }
          const textureRecord = textures.anidraw;
          const texResource = textureRecord.resource[textureRecord.resourceIdx];
          if (prevTextureResource != texResource) {
             prevTextureResource = texResource;
             gl.bindTexture(gl.TEXTURE_2D, texResource);
          }
          if (anidraw.needsDisplayUpdate) {
             textureRecord.resourceIdx = (textureRecord.resourceIdx + 1) % textureRecord.resource.length;
             gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, anidrawCanvas);
          }
       } else {
          if (prevTextureBindPoint != gl.TEXTURE0) {
             prevTextureBindPoint = gl.TEXTURE0;
             gl.activeTexture(gl.TEXTURE0);
          }
          const texResource = textures[textureSrc].resource;
          if (prevTextureResource != texResource) {
             prevTextureResource = texResource;
             gl.bindTexture(gl.TEXTURE_2D, texResource);
          }
       }
     }
   }

   if (bumpTextureSrc) {
     if (!textures.hasOwnProperty(bumpTextureSrc)) {
        textures[bumpTextureSrc] = TEXTURE_LOAD_STATE_UNFINISHED; 
        let image = new Image();
        this.imageLoad(image, bumpTextureSrc).catch((err) => {console.error(err);} );
     }
     else {
        if (prevTextureBindPoint != gl.TEXTURE1) {
           prevTextureBindPoint = gl.TEXTURE1;
           gl.activeTexture(gl.TEXTURE1);
        }
        const texResource = textures[bumpTextureSrc].resource;
        if (prevTextureResource != texResource) {
           prevTextureResource = texResource;
           gl.bindTexture(gl.TEXTURE_2D, texResource);
           gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
           gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
        }
     }
   }

   // CANCEL DRAWING IF THE MESH DOES NOT EXIST

   if (!mesh || mesh.length == 0)
      return;

   if (mesh.isParticles)
      if (mesh.particlesInline)
         this.renderParticlesMeshInline(this, mesh, views);
      else
         renderParticlesMesh(mesh);

   setUniform('1iv', 'uSampler', [0,1,2,3,4,5,6,7]);  // SPECIFY TEXTURE INDICES.
   setUniform('1i', 'uTexture' , isTexture(textureSrc) ? 1 : 0); // ARE WE RENDERING A TEXTURE?
   setUniform('1i', 'uBumpTexture', isTexture(bumpTextureSrc) ? 1 : 0); // ARE WE RENDERING A TEXTURE?
   setUniform('1i', 'uVideo'   , textureSrc == 'camera'); // IS THIS A VIDEO TEXTURE FROM THE CAMERA?
   setUniform('1i', 'uAnidraw' , textureSrc == 'anidraw'); // IS THIS THE ANIDRAW TEXTURE?
   setUniform('1i', 'uMirrored', isMirrored); // IS THE VIDEO TEXTURE MIRRORED?
   setUniform('1f', 'uDull'    , dull ? 1 : 0); // SHOULD WE SUPPRESS ALL SPECULAR HIGHLIGHTS?
   setUniform('1i', 'uCustom'  , window.customShader ? 1 : 0);

   if (flags)
      for (let flag in flags)
         setUniform('1i', flag, 1);

   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   if (this.views.length == 1) {
      setUniform('Matrix4fv', 'uProj', false, this.views[0].projectionMatrix);
      setUniform('Matrix4fv', 'uView', false, this.views[0].viewMatrix);
      
      if (mesh != prevMesh)
         gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.DYNAMIC_DRAW);

      gl.drawArrays(mesh.isTriangles ? gl.TRIANGLES : gl.TRIANGLE_STRIP, 0, mesh.length / VERTEX_SIZE);

   } else {
      const drawPrimitiveType = mesh.isTriangles ? gl.TRIANGLES : gl.TRIANGLE_STRIP;
      const vertexCount = mesh.length / VERTEX_SIZE;
      
      if (mesh != prevMesh)
         gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.DYNAMIC_DRAW);

      for (let i = 0; i < this.views.length; ++i) {
         if (i == 0 && view == 1 || i == 1 && view == 0)
	    continue;
         let v = this.views[i];
         let vp = v.viewport;
         gl.viewport(vp.x, vp.y, vp.width, vp.height);
         setUniform('Matrix4fv', 'uProj', false, v.projectionMatrix);
         setUniform('Matrix4fv', 'uView', false, v.viewMatrix);
	 let m = cg.mMultiply(clay.inverseRootMatrix, cg.mInverse(v.viewMatrix));
	 setUniform('3fv', 'uEye', m.slice(12,15));
	 setUniform('1i', 'uViewIndex', i);
         gl.drawArrays(drawPrimitiveType, 0, vertexCount);
      }
   }

   if (flags)
      for (let flag in flags)
         setUniform('1i', flag, 0);

   if (customShader) {
      window.customShader = '';
      window.clay.clayPgm.program = saveProgram;
      gl.useProgram(saveProgram);
   }

   // save what the just-drawn mesh was
   prevMesh = mesh;
}


//////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////// TRIANGLE MESHES ///////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////


const VERTEX_POS  =  0;
const VERTEX_ROT  =  3;
const VERTEX_UV   =  6;
const VERTEX_RGB  =  8;
const VERTEX_WTS  =  9;
const VERTEX_NULL = 15;
const VERTEX_SIZE = 16;
Clay.DEFAULT_VERTEX_SIZE = VERTEX_SIZE;

let packAB = (a,b) => {
   a = Math.max(0, Math.min(.9999, .5 * a + .5));
   b = Math.max(0, Math.min(.9999, .5 * b + .5));
   return Math.floor(40000 * a) + b;
}

let unpackAB = ab => [ 2 * (ab >> 0) / 40000 - 1, 2 * (ab % 1.0) - 1 ];

let packRGB = rgb => {
   let C = i => Math.floor(256 * Math.max(0, Math.min(.9999, rgb[i]))) / 256;
   return C(0) + 256 * C(1) + 256 * 256 * C(2);
}
this.packRGB = packRGB;

let unpackRGB = c => {
   c = c * 256 >> 0;
   let r = c       & 255;
   let g = c >>  8 & 255;
   let b = c >> 16 & 255;
   return [ r / 255, g / 255, b / 255 ];
}

// CREATE A MESH FROM A PARAMETRIC FUNCTION

let vertexArray = (pos, nor, tan, uv, rgb, wts) => {
   if (! tan) tan = orthogonalVector(nor);
   if (! uv ) uv  = [0,0];
   if (! rgb) rgb = [1,1,1];
   if (! wts) wts = [1,0,0,0,0,0];
   return [
      pos[0],pos[1],pos[2],
      packAB(nor[0],tan[0]),
      packAB(nor[1],tan[1]),
      packAB(nor[2],tan[2]),
      uv[0],uv[1],
      packRGB(rgb),
      wts[0],wts[1],wts[2],
      wts[3],wts[4],wts[5],
      0,
   ];
}
this.vertexArray = vertexArray;

let orthogonalVector = v => {
   let x = v[0], y = v[1], z = v[2];
   let c = x > Math.max(y, z) ? [ 0, 0, 1] :
           x < Math.min(y, z) ? [ 0, 0,-1] :
           y > Math.max(z, x) ? [ 1, 0, 0] :
           y < Math.min(z, x) ? [-1, 0, 0] :
           z > Math.max(x, y) ? [ 0, 1, 0] :
                                [ 0,-1, 0] ;
   return normalize(cross(c, v));
}

let createMesh = (nu, nv, f, data) => {
   let tmp = [];
   for (let j = nv ; j > 0 ; j--) {
      let v = j/nv;
      for (let i = 0 ; i <= nu ; i++) {
         let u = i/nu;
         tmp.push(f(u, v     , data));
         tmp.push(f(u, v-1/nv, data));
      }
      if (j > 1) {
         tmp.push(f(1, v-1/nv, data));
         tmp.push(f(0, v-1/nv, data));
      }
   }
   let mesh = new Float32Array(tmp.flat(1));
   mesh.nu = nu;
   mesh.nv = nv;
   return mesh;
}

let setVertices = (mesh, f) => {
   let nu = mesh.nu, nv = mesh.nv, i = 0;
   let setVertex = (u, v) => {
      let P = f(u, v);
      let N = normalAtUV(u,v, P, f);
      let rgb = P.length > 3 ? P.slice(3,6) : null;
      let V = vertexArray(P, N, null, [u,v], rgb);
      for (let k = 0 ; k < 16 ; k++)
         mesh[i++] = V[k];
   }
   for (let j = nv ; j > 0 ; j--) {
      let v = j/nv;
      for (let i = 0 ; i <= nu ; i++) {
         let u = i/nu;
         setVertex(u, v);
         setVertex(u, v-1/nv);
      }
      if (j > 1) {
         setVertex(1, v-1/nv);
         setVertex(0, v-1/nv);
      }
   }
}

// GLUE TWO MESHES TOGETHER INTO A SINGLE MESH

let glueVertices = (a, b) => {
   let c = [];
   for (let i = 0 ; i < a.length ; i++)
      c.push(a[i]);                           // a
   for (let i = 0 ; i < VERTEX_SIZE ; i++)
      c.push(a[a.length - VERTEX_SIZE + i]);  // + last vertex of a
   for (let i = 0 ; i < VERTEX_SIZE ; i++)
      c.push(b[i]);                           // + first vertex of b
   for (let i = 0 ; i < b.length ; i++)
      c.push(b[i]);                           // + b
   return c;
}

let glueMeshes = (a, b) => new Float32Array(glueVertices(a, b));

// CREATE A TRIANGLES MESH

this.trianglesMesh = vertexData => {
   let vertices = [];
   for (let n = 0 ; n < vertexData.length ; n++) {
      let v = vertexData[n];
      vertices.push(vertexArray(v.slice(0, 3),
                                v.slice(3, 6),
                                null,
                                v.length >=  8 ? v.slice(6,  8) : null,
                                v.length >= 11 ? v.slice(8, 11) : null));
   }
   let mesh = new Float32Array(vertices.flat());
   mesh.isTriangles = true;
   return mesh;
}

let convertTrianglestripToTriangles = src => {
   let dst = [];
   let even = 0;
   for (let n = 0 ; n < src.length - 32 ; n += 16) {
      let a = n, b = a + (even ? 16 : 32), c = a + (even ? 32 : 16);
      for (let k = 0 ; k < 16 ; k++) dst.push(src[a + k]);
      for (let k = 0 ; k < 16 ; k++) dst.push(src[b + k]);
      for (let k = 0 ; k < 16 ; k++) dst.push(src[c + k]);
      even = 1 - even;
   }
   let mesh = new Float32Array(dst);
   mesh.isTriangles = true;
   return mesh;
}

// COMBINE TOGETHER MULTIPLE MESHES

this.combineMeshes = meshData => {
   let isAnyTrianglesMesh = false;
   for (let n = 0 ; n < meshData.length ; n++)
      if (formMesh[meshData[n][0]].isTriangles)
         isAnyTrianglesMesh = true;

   let vertices = [];
   for (let n = 0 ; n < meshData.length ; n++) {
      let mesh = formMesh[meshData[n][0]];
      if (isAnyTrianglesMesh && ! mesh.isTriangles)
         mesh = convertTrianglestripToTriangles(mesh);
      let matrix = meshData[n][1];
      let color = meshData[n][2];

      let matrixIT = cg.mTranspose(cg.mInverse(matrix));

      for (let i = 0 ; i < mesh.length ; i += 16) {
         let pos = mesh.slice(i    , i + 3);
         let nt  = mesh.slice(i + 3, i + 6);
         let uv  = mesh.slice(i + 6, i + 8);
         let c   = mesh.slice(i + 8, i + 9);
         let wts = mesh.slice(i + 9, i + 15);

         pos = cg.mTransform(matrix, pos);

         let NT = [unpackAB(nt[0]), unpackAB(nt[1]), unpackAB(nt[2])];
         let nor = cg.normalize(cg.mTransform(matrixIT, [ NT[0][0],NT[1][0],NT[2][0],0 ]));
         let tan = cg.normalize(cg.mTransform(matrixIT, [ NT[0][1],NT[1][1],NT[2][1],0 ]));

         let rgb = unpackRGB(c[0]); 
         rgb = [ color[0] * rgb[0], color[1] * rgb[1], color[2] * rgb[2] ];

         vertices.push(vertexArray(pos, nor, tan, uv, rgb, wts));
         if (! isAnyTrianglesMesh && i == mesh.length - 16 || n > 0 && i == 0)
            vertices.push(vertexArray(pos, nor, tan, uv, rgb, wts));
      }
   }
   let mesh = new Float32Array(vertices.flat());
   if (isAnyTrianglesMesh)
      mesh.isTriangles = true;
   return mesh;
}

let createTextMesh = text => {
   let italic = text.substring(0,3) == '<i>';
   if (italic)
      text = text.substring(3, text.length);
   let dx = text.length / 2;
   let uv = (i,du,dv) => {
      let c = text.charCodeAt(i) - 32;
      let col = c % 12;
      let row = c / 12 >> 0;
      let u = (col + du + italic*(dv/2-1/4)) / 12,
          v = (row + dv) / 8;
      return [u, v];
   };
   let V = [];
   for (let i = 0 ; i < text.length ; i++)
   for (let j = 0 ; j < 2 ; j++) {
      V.push(vertexArray([i+j-dx, 1,0],[0,0,1],[1,0,0],uv(i,j,0)));
      V.push(vertexArray([i+j-dx,-1,0],[0,0,1],[1,0,0],uv(i,j,1)));
   }
   return new Float32Array(V.flat());
}

let createParticlesMesh = n => {
   let mesh = new Float32Array(6 * 16 * n);
   mesh.isTriangles = true;
   mesh.isParticles = true;
   return mesh;
}

let renderParticlesMesh = mesh => {
   let data = mesh.particleData;
   let orient = mesh.orient;

   if (! data)
      return;

   let N = mesh.length / (6 * 16);
   let vm = cg.mMultiply(clay.inverseRootMatrix, this.pose.transform.matrix);
   let X = vm.slice(0,3);
   let Y = vm.slice(4,7);
   let Z = vm.slice(8,11);

   if (orient == 'yaw') {
      Z = cg.normalize([Z[0],0,Z[2]]);
      Y = [0,1,0];
      X = cg.normalize(cg.cross(Y,Z));
   }

   let order = [];
   for (let i = 0 ; i < N ; i++)
      order.push(i);
   order.sort((a,b) => cg.dot(Z,data[a].p) - cg.dot(Z,data[b].p));

/*
   Need to add an option for p to be 2 points.
   The particle will go from p[0] to p[1], and its normal will point toward the viewer.
*/

   let setVertex = (j, p, n, s, c, t, u, v, uRaw, vRaw) => {
      let nx = X, ny = Y, nz = Z;
      let pos, d = [1,0,0];
      if (Array.isArray(p[0])) {
         let c = cg.mix(p[0],p[1],.5,.5);
	 d = cg.mix(p[0],p[1],-1, 1);
	 ny = cg.normalize(cg.cross(nz,d));
	 pos = [ c[0] + u * d[0] + v * s * ny[0],
	         c[1] + u * d[1] + v * s * ny[1],
	         c[2] + u * d[2] + v * s * ny[2] ];
      }
      else {
         if (n) {
	    if (n[0]==0 && n[2]==0) {
               nz = cg.normalize(n);
               nx = cg.normalize(cg.cross(d,nz));
               ny = cg.normalize(cg.cross(nz,nx));
	    }
	    else {
               nz = cg.normalize(n);
               nx = cg.normalize(cg.cross([0,1,0],nz));
               ny = cg.normalize(cg.cross(nz,nx));
	    }
         }
         pos = [ p[0] + u * s * nx[0] + v * s * ny[0],
                 p[1] + u * s * nx[1] + v * s * ny[1],
                 p[2] + u * s * nx[2] + v * s * ny[2] ];
      }
      let V = vertexArray(pos, nz, null, [uRaw, vRaw], c);
      for (let k = 0 ; k < 16 ; k++)
         mesh[16 * j + k] = V[k];
   }
   for (let i = 0 ; i < N ; i++) {
      let d = data[order[i]];
      let p = d.p;
      let n = d.n;
      let r = d.r ? d.r : 0;
      let s = d.s ? d.s : .01;
      let c = d.c;
      let t = d.t ? d.t : [0,0,1,1];
      setVertex(6 * i    , p, n, s, c, t, -.5, -.5, t[0], t[3]); // NOTE: passing in raw UVs as well
      setVertex(6 * i + 1, p, n, s, c, t,  .5, -.5, t[2], t[3]);
      setVertex(6 * i + 2, p, n, s, c, t, -.5,  .5, t[0], t[1]);
      setVertex(6 * i + 3, p, n, s, c, t, -.5,  .5, t[0], t[1]);
      setVertex(6 * i + 4, p, n, s, c, t,  .5, -.5, t[2], t[3]);
      setVertex(6 * i + 5, p, n, s, c, t,  .5,  .5, t[2], t[1]);
   }
}

let createSquareMesh = (i,j,k, z) => {
   let A = []; A[i] = z; A[j] = -1; A[k] =  1;
   let B = []; B[i] = z; B[j] = -1; B[k] = -1;
   let C = []; C[i] = z; C[j] =  1; C[k] =  1;
   let D = []; D[i] = z; D[j] =  1; D[k] = -1;
   let N = []; N[i] = z < 0 ? -1 : 1; N[j] = 0; N[k] = 0;

   let V = [];
   let s = i==2 == z>0;
   V.push(vertexArray( A, N, [1,0,0], [s?0:0, s?0:1] ));
   V.push(vertexArray( B, N, [1,0,0], [s?0:1, s?1:1] ));
   V.push(vertexArray( C, N, [1,0,0], [s?1:0, s?0:0] ));
   V.push(vertexArray( D, N, [1,0,0], [s?1:1, s?1:0] ));

   return new Float32Array(V.flat());
}

let cubeMesh = glueMeshes(
               glueMeshes(glueMeshes(createSquareMesh(0,2,1,-1),createSquareMesh(0,1,2,1)),
                          glueMeshes(createSquareMesh(1,0,2,-1),createSquareMesh(1,2,0,1))),
                          glueMeshes(createSquareMesh(2,1,0,-1),createSquareMesh(2,0,1,1)) );

let cubeXZMesh = glueMeshes(glueMeshes(createSquareMesh(0,2,1,-1),createSquareMesh(0,1,2,1)),
                            glueMeshes(createSquareMesh(2,1,0,-1),createSquareMesh(2,0,1,1)));

let r = Math.sqrt(1/3);
let octahedronMesh = this.trianglesMesh([
   [ 1, 0, 0, r, r, r],[0, 1, 0, r, r, r],[ 0, 0, 1, r, r, r],
   [-1, 0, 0,-r, r, r],[0, 0, 1,-r, r, r],[ 0, 1, 0,-r, r, r],
   [ 1, 0, 0, r,-r, r],[0, 0, 1, r,-r, r],[ 0,-1, 0, r,-r, r],
   [-1, 0, 0,-r,-r, r],[0,-1, 0,-r,-r, r],[ 0, 0, 1,-r,-r, r],
   [ 1, 0, 0, r, r,-r],[0, 0,-1, r, r,-r],[ 0, 1, 0, r, r,-r],
   [-1, 0, 0,-r, r,-r],[0, 1, 0,-r, r,-r],[ 0, 0,-1,-r, r,-r],
   [ 1, 0, 0, r,-r,-r],[0,-1, 0, r,-r,-r],[ 0, 0,-1, r,-r,-r],
   [-1, 0, 0,-r,-r,-r],[0, 0,-1,-r,-r,-r],[ 0,-1, 0,-r,-r,-r],
]);
let uvToCone = (u,v,du) => {
   if (du == undefined) du = 0;
   let theta = 2 * Math.PI * (u+du);
   let x = Math.cos(theta);
   let y = Math.sin(theta);
   let z = 2 * v - 1;
   let ru = Math.sqrt(2/3);
   let rv = Math.sqrt(1/3);
   return vertexArray([x*(1-v),y*(1-v),z], [x*ru,y*ru,rv], [x,y,0], [u,v]);
}
let normalAtUV = (u,v,P,func) => {
   let U = func(u+.001,v);
   let V = func(u,v+.001);
   return normalize(cross([U[0]-P[0],U[1]-P[1],U[2]-P[2]],
                          [V[0]-P[0],V[1]-P[1],V[2]-P[2]]));
}

let uvToSphere = (u,v) => {
   let theta = 2 * Math.PI * u;
   let phi   = Math.PI * (v - .5);
   let x = Math.cos(theta) * Math.cos(phi);
   let y = Math.sin(theta) * Math.cos(phi);
   let z = Math.sin(phi);

   return vertexArray([x,y,z], [x,y,z], [x,y,0], [u,v]);
}

let uvToTorus = (u,v,r) => {
   let theta = 2 * Math.PI * u;
   let phi   = 2 * Math.PI * v;

   let x = Math.cos(theta) * (1 + r * Math.cos(phi));
   let y = Math.sin(theta) * (1 + r * Math.cos(phi));
   let z = r * Math.sin(phi);

   let nx = Math.cos(theta) * Math.cos(phi);
   let ny = Math.sin(theta) * Math.cos(phi);
   let nz = Math.sin(phi);

   return vertexArray([x,y,z], [nx,ny,nz], [x,y,0], [u,v]);
}

let uvToTube = (u,v) => {
   let theta = 2 * Math.PI * u;
   let x = Math.cos(theta);
   let y = Math.sin(theta);
   let z = 2 * v - 1;

   return vertexArray([x,y,z], [x,y,0], [x,y,0], [u,v]);
}

let uvToDisk = (u,v,dz) => {
   let du = 0;
   if (dz === undefined) dz = 0;
   else if (Array.isArray(dz)) { du = dz[1]; dz = dz[0]; }
   let theta = 2 * Math.PI * (u + du);
   if (dz == -1) theta = -theta;
   let x = Math.sin(theta) * v;
   let y = Math.cos(theta) * v;
   let z = dz;

   return vertexArray([x,y,z], [0,0,dz ? Math.sign(dz) : 1]);
}

this.createGrid = (nu,nv) =>
   createMesh(nu,nv, (u,v) => vertexArray([2*u-1,2*v-1,0], [0,0,1], [1,0,0], [u,v]));

let permuteCoords = mesh => {
   let V = [];
   for (let n = 0 ; n < mesh.length ; n += 16)
      V.push(mesh[n+2], mesh[n  ], mesh[n+1],
             mesh[n+5], mesh[n+3], mesh[n+4],
             mesh[n+6], mesh[n+7], mesh[n+8],
             0,0,0, 0,0,0, 0);
   return new Float32Array(V);
}

let buildTubeZMesh     = n => createMesh(n, 2, uvToTube);
let buildCylinderZMesh = n => glueMeshes(glueMeshes(buildTubeZMesh(n),
                                                    createMesh(n, 2, uvToDisk, -1)),
                                                    createMesh(n, 2, uvToDisk,  1));

let torusZMesh    = createMesh(32, 16, uvToTorus, .37);
let torusXMesh    = permuteCoords(torusZMesh);
let torusYMesh    = permuteCoords(torusXMesh);
let sphereMesh    = createMesh(32, 16, uvToSphere);
let tubeMesh      = buildTubeZMesh(32);
let diskzMesh     = createMesh(32,  2, uvToDisk);
let diskxMesh     = permuteCoords(diskzMesh);
let diskyMesh     = permuteCoords(diskxMesh);
let coneZMesh      = glueMeshes(createMesh(32, 2, uvToCone),
                                createMesh(32, 2, uvToDisk, -1));
let coneXMesh     = permuteCoords(coneZMesh);
let coneYMesh     = permuteCoords(coneXMesh);

let cylinderZMesh = buildCylinderZMesh(32);
let cylinderXMesh = permuteCoords(cylinderZMesh);
let cylinderYMesh = permuteCoords(cylinderXMesh);
let pyramidZMesh  = glueMeshes(createMesh(4, 2, uvToCone, 1/8),
                               createMesh(4, 2, uvToDisk, [-1, 1/8]));
let pyramidXMesh  = permuteCoords(pyramidZMesh);
let pyramidYMesh  = permuteCoords(pyramidXMesh);

this.wire = (nu,nv,id) => {
   nv = cg.def(nv, 6);
   let type = 'wire,' + nu + ',' + nv + ',' + id;
   clay.defineMesh(type, clay.createGrid(nu, nv));
   return type;
}

this.animateWire = (wire, r, f) => {
   let nu = parseInt(wire._form.substring(5,wire.length));

   let z = cg.subtract(f(.01), f(0)),
       xx = z[0]*z[0], yy = z[1]*z[1], zz = z[2]*z[2],
       x = cg.normalize(cg.cross(z, [ yy+zz, zz+xx, xx+yy ])),
       y = cg.normalize(cg.cross(z, x));

   let X = [], Y = [];
   for (let i = 0 ; i <= nu ; i++) {
      X.push(x);
      Y.push(y);
      let u = i / nu;
      z = cg.subtract(f(u + .01), f(u));
      x = cg.normalize(cg.cross(y, z));
      y = cg.normalize(cg.cross(z, x));
   }

   wire.setVertices((u,v) => cg.add(cg.add(f(u), cg.scale(X[nu*u >> 0], r * Math.sin(2 * Math.PI * v))),
                                                 cg.scale(Y[nu*u >> 0], r * Math.cos(2 * Math.PI * v))));
}

//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////// IMPLICIT SURFACES ///////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////

let colors = [
   [1,1,1],     // white
   [1,0,0],     // red
   [1,.2,0],    // orange
   [1,.9,0],    // yellow
   [0,.8,0],    // green
   [0,.8,.6],   // cyan
   [.2,.3,1],   // blue
   [.3,,0,1],   // indigo
   [1,0,1],     // violet
   [.3,.1,.05], // brown
   [0,0,0],     // black
];

this.color = i => colors[i];

let metal = (r,g,b) => {
   return { ambient:[r/32,g/32,b/32],diffuse:[r/24,g/24,b/24],specular:[3*r,3*g,3*b,50] };
}

let initMaterials = () => {
materials = [];
materials.black     = { ambient: [.0 ,.0 ,.0 ], diffuse: [.0 ,.0 ,.0 ], specular: [.9,.9,.9,20] };
materials.blue      = { ambient: [.04,.06,.2 ], diffuse: [.16,.24,.8 ], specular: [.9,.9,.9,20] };
materials.bronze    = metal(.76,.35,.025);
materials.copper    = metal(.72,.25,.05);
materials.cyan      = { ambient: [.0 ,.16,.12], diffuse: [.0 ,.64,.48], specular: [.9,.9,.9,20] };
materials.gold      = metal(.8,.46,0);
materials.green     = { ambient: [.0 ,.18,.0 ], diffuse: [.0 ,.64,.0 ], specular: [.9,.9,.9,20] };
materials.indigo    = { ambient: [.06,.0 ,.2 ], diffuse: [.24,.0 ,.8 ], specular: [.9,.9,.9,20] };
materials.orange    = { ambient: [.2 ,.04,.0 ], diffuse: [.8 ,.16,.0 ], specular: [.9,.9,.9,20] };
materials.pink      = { ambient: [.2 ,.1 ,.1 ], diffuse: [.8 ,.4 ,.4 ], specular: [.9,.9,.9,20] };
materials.red       = { ambient: [.2 ,.0 ,.0 ], diffuse: [.8 ,.0 ,.0 ], specular: [.9,.9,.9,20] };
materials.silver    = metal(.7,.7,.7);
materials.trueBlack = { ambient: [0,0,0]      , diffuse: [0,0,0]      , specular: [.9,.9,.9, 1] };
materials.violet    = { ambient: [.2 ,.0 ,.2 ], diffuse: [.8 ,.0 ,.8 ], specular: [.9,.9,.9,20] };
materials.white     = { ambient: [.2 ,.2 ,.2 ], diffuse: [.8 ,.8 ,.8 ], specular: [.9,.9,.9,20] };
materials.yellow    = { ambient: [.2 ,.18,.0 ], diffuse: [.8 ,.72,.0 ], specular: [.9,.9,.9,20] };

this.defineMaterial = (id, ambient, diffuse, specular) =>
   materials[id] = { ambient: ambient, diffuse: diffuse, specular: specular };

// BUILD THE PALETTE OF COLORS

   
   for (let n = 0 ; n < 10 ; n++) {
      let r = colors[n][0], g = colors[n][1], b = colors[n][2];   
      for (let l = 0 ; l < 2 ; l++) {
         if (l) {
            r = .5 + .5 * r;
            g = .5 + .5 * g;
            b = .5 + .5 * b;
         }
         materials['color' + n + (l ? 'l' : '')] = {
            ambient : [.2*r,.2*g,.2*b],
            diffuse : [Math.max(.01,.8*r),
                       Math.max(.01,.8*g),
                       Math.max(.01,.8*b)],
            specular: [.1,.1,.1,2]
         };
      };
   }

   defaultColor = 'color0';
}

initMaterials();

const SPHERE    = 0,
      CYLINDERX = 1,
      CYLINDERY = 2,
      CYLINDERZ = 3,
      CUBE      = 4,
      DONUT     = 5;

function Blobs() {
   let time = 0, textureState = 0, textureSrc = '', data, blurFactor = 0.5, bounds;
   this.isTexture = true;

   // CONVERT AN IMPLICIT FUNCTION TO A TRIANGLE MESH
   
   this.implicitSurfaceTriangleMesh = (n, isFaceted, _textureState, _textureSrc) => {
      let V = {}, lo, hi, P = [], T = [], vertexID = {}, i, j, k, S = [0,1,3,7];

      let getV    = (i,j,k)       => V[i + ',' + j + ',' + k];
      let setV    = (i,j,k,value) => V[i + ',' + j + ',' + k] = value;
      let deleteV = (i,j,k)       => delete V[i + ',' + j + ',' + k];

      time = Date.now() / 1000;
      textureState = _textureState;
      textureSrc = _textureSrc;

      // COMPUTE THE BOUNDS AROUND ALL BLOBS
   
      this.innerBounds = computeBounds(0,2,4);
      this.outerBounds = computeBounds(1,3,5);

      // ADD A VERTEX AND RETURN A UNIQUE ID FOR THAT VERTEX

      function E(a, b) {
         if (a > b) { let tmp = a; a = b; b = tmp; }
         let ai = a & 1, aj = a>>1 & 1, ak = a>>2 & 1;
         let bi = b & 1, bj = b>>1 & 1, bk = b>>2 & 1;
         let hash = (i + (ai&bi)) + ',' + (j + (aj&bj)) + ',' + (k + (ak&bk)) + ',' + (b-a);

         if (vertexID[hash] === undefined) {  // ADD TO VERTEX ARRAY THE FIRST
            vertexID[hash] = P.length / 3;    // TIME THE VERTEX IS ENCOUNTERED
            let va = getV(i+ai,j+aj,k+ak);
            let vb = getV(i+bi,j+bj,k+bk);
            let t = -va / (vb - va);
            let c = (i,a,b) => (i + a + t * (b-a)) / n * 2 - 1;
            P.push( c(i,ai,bi), c(j,aj,bj), c(k,ak,bk) );
         }
         return vertexID[hash];
      }

      let tri = (a, b, c, d) => T.push(E(a,b), E(a,c), E(a,d)); // ADD 1 TRIANGLE

      let quad = (a, b, c, d) => {                              // ADD 2 TRIANGLES
         let bc = E(b,c), ad = E(a,d);
         T.push(bc, E(a,c), ad,  ad, bc, E(b,d));
      }

      // THE SIX POSSIBLE INTERMEDIATE PATHS THROUGH A TETRAHEDRON

      let di1 = [1,0,0,1,0,0], dj1 = [0,1,0,0,1,0], dk1 = [0,0,1,0,0,1],
          di2 = [1,0,1,1,1,0], dj2 = [1,1,0,0,1,1], dk2 = [0,1,1,1,0,1];

      // THERE ARE 16 CASES TO CONSIDER

      let cases = [ [0         ], [1, 0,1,2,3], [1, 1,2,0,3], [2, 0,1,2,3],
                    [1, 2,3,0,1], [2, 0,2,3,1], [2, 1,2,0,3], [1, 3,1,2,0],
                    [1, 3,0,2,1], [2, 0,3,1,2], [2, 1,3,2,0], [1, 2,1,0,3],
                    [2, 2,3,0,1], [1, 1,3,0,2], [1, 0,3,2,1], [0         ] ];

      // COMPUTE THE ACTIVE VOLUME

      lo = [ 1000, 1000, 1000];
      hi = [-1000,-1000,-1000];
      for (let b = 0 ; b < this.outerBounds.length ; b++)
         for (let i = 0 ; i < 3 ; i++) {
            lo[i] = Math.min(lo[i], this.outerBounds[b][i][0]);
            hi[i] = Math.max(hi[i], this.outerBounds[b][i][1]);
         }
      let t2i = t => Math.floor(n * (t + 1) / 2);
      let i2t = i => 2 * i / n - 1;
      for (let i = 0 ; i < 3 ; i++) {
         lo[i] = t2i(lo[i]);
         hi[i] = t2i(hi[i]);
      }

      // CYCLE THROUGH CUBES IN THE VOLUME TO GENERATE SURFACE
      // FOR EACH CUBE, CYCLE THROUGH ITS SIX TETRAHEDRA
      // FOR EACH TETRAHEDRON, OUTPUT EITHER 0, 1 OR 2 TRIANGLES

      for (k = lo[2] ; k < hi[2] ; k++) {

         for (j = lo[1] ; j <= hi[1] ; j++)
         for (i = lo[0] ; i <= hi[0] ; i++) {
            k == lo[0] ? setV(i,j,k, this.eval(i2t(i), i2t(j), i2t(k)))
                       : deleteV(i,j,k-1);
            setV(i,j,k+1, this.eval(i2t(i), i2t(j), i2t(k+1)));
         }

         for (j = lo[1] ; j < hi[1] ; j++)
         for (i = lo[0] ; i < hi[0] ; i++) {
            let s0 = (getV(i  ,j,k)>0) + (getV(i  ,j+1,k)>0) + (getV(i  ,j,k+1)>0) + (getV(i  ,j+1,k+1)>0);
            let s1 = (getV(i+1,j,k)>0) + (getV(i+1,j+1,k)>0) + (getV(i+1,j,k+1)>0) + (getV(i+1,j+1,k+1)>0);
            if (s0 + s1 & 7) {
               let C03 = (getV(i,j,k) > 0) << 0 | (getV(i+1,j+1,k+1) > 0) << 3;
               for (let p = 0 ; p < 6 ; p++) {
                  let C = cases [ C03 | (getV(i+di1[p],j+dj1[p],k+dk1[p]) > 0) << 1
                                      | (getV(i+di2[p],j+dj2[p],k+dk2[p]) > 0) << 2 ];
                  if (C[0]) {                                // number of triangles in simplex.
                     S[1] = di1[p] | dj1[p]<<1 | dk1[p]<<2;  // assign 2nd corner of simplex.
                     S[2] = di2[p] | dj2[p]<<1 | dk2[p]<<2;  // assign 3rd corner of simplex.
                     (C[0]==1 ? tri : quad)(S[C[1]], S[C[2]], S[C[3]], S[C[4]]);
                  }
               }
            }
         }
      }

      // SMOOTH THE MESH

      let Q = Array(P.length).fill(0),
          A = Array(P.length).fill(0);
      for (let n = 0 ; n < T.length ; n += 3) {
         let I = [ 3 * T[n], 3 * T[n+1], 3 * T[n+2] ];
         for (let i = 0 ; i < 3 ; i++) {
            for (let j = 0 ; j < 3 ; j++)
               Q[I[j] + i] += P[I[(j+1) % 3] + i] + P[I[(j+2) % 3] + i];
            A[I[i]] += 2;
         }
      }
      for (let n = 0 ; n < Q.length ; n += 3)
         for (let i = 0 ; i < 3 ; i++)
            P[n + i] = Q[n + i] /= A[n];
   
      // COMPUTE SURFACE NORMALS
   
      let N = new Array(P.length);
      for (let i = 0 ; i < P.length ; i += 3) {
         let normal = computeNormal(P[i],P[i+1],P[i+2]);
         for (let j = 0 ; j < 3 ; j++)
            N[i+j] = normal[j];
      }
   
      // CONSTRUCT AND RETURN THE TRIANGLE MESH
   
      let vertices = [];
      for (let i = 0; i < T.length; i += 3) {
         let a = 3 * T[i    ],
         b = 3 * T[i + 1],
         c = 3 * T[i + 2];
   
         let normalDirection = [ N[a  ] + N[b  ] + N[c  ],
         N[a+1] + N[b+1] + N[c+1],
         N[a+2] + N[b+2] + N[c+2] ];
         if (isFaceted) {
            let normal = normalize(normalDirection);
            for (let j = 0 ; j < 3 ; j++)
               N[a+j] = N[b+j] = N[c+j] = normal[j];
         }

         let addVertex = a => {
            let p  = P.slice(a, a+3),
                  n  = N.slice(a, a+3), 
                  uv = n[2] > 0 ? [ .5 + .5*p[0], .5 - .5*p[1] ] :
                                  [ n[0]<.5 ? 0 : 1, n[1]>.5 ? 1 : 0 ];
            let v = vertexArray(p, n, [1,0,0], uv, [1,1,1], [1,0,0,0,0,0]);
            for (let j = 0 ; j < VERTEX_SIZE ; j++)
               vertices.push(v[j]);
            computeWeights(vertices, vertices.length - VERTEX_SIZE + VERTEX_WTS, P[a],P[a+1],P[a+2]);
         }
         
         // FLIP ANY TRIANGLES THAT NEED TO BE FLIPPED

         let A = P.slice(a, a+3), B = P.slice(b, b+3), C = P.slice(c, c+3);
         let outward = cross(subtract(B, A), subtract(C, B));
         if (dot(outward, normalDirection) < 0) { let tmp = a; a = c; c = tmp; }

         addVertex(a);
         addVertex(b);
         addVertex(c);
      }
      return new Float32Array(vertices);
   }

   let valueTexture = (t, x,y,z) => {
      if (textureState == 0 && textureFunction != null)
         return textureFunction(t,x,y,z);

      switch (textureState) {
      case 1:
         t += 2 * noise(14*x,14*y,14*z) - .5;
         break;
      case 2:
         t += .5 * (noise(7*x,7*y,7*z + time) - .3);
         break;
      case 3:
         let u = Math.max(0, noise(20*x,20*y,20*z));
         t -= 16 * u * u;
         break;
      case 4:
         for (let s = 4 ; s < 128 ; s *= 2)
            t += 8 * (noise(7*s*x,7*s*y,7*s*z) - .3) / s;
         break;
      case 5:
         t += Math.abs(Math.sin(30*x)*Math.sin(30*y)*Math.sin(30*z))/4 - .25;
         break;
      }
      return t;
   }


   /*

   An form is created by using an implicit texture to perturb a primitive form,
   such as a unit sphere or a unit cube. We can use it either to build an explicit
   triangle mesh or to create a blendable shape as an implicit function.

   The implicit function has a value of 1.0 at the shape's surface, dropping
   down to a value of 0.0 at the boundary of the function's volume of influence.

   In practice, the implicit function first applies an inverse matrix transform
   to the point, so that we can translate/rotate/scale the shape as needed.

   -----------------------------------------------------------------------------*/

   let displacementTexture = p =>
      displacementTextureType == 1 ? noise(6*p[0],6*p[1],6*p[2]) / 5
      : displacementTextureType == 2 ? Math.sin(21*p[0]) * Math.sin(21*p[1]) * Math.sin(21*p[2]) / 10
      : 0;

      let projectPointToForm = (form, p, rounded, info) => {
         if (form == 'donut') {
            let R = info ? info : .37;
            let rxy = Math.sqrt(p[0] * p[0] + p[1] * p[1]),
                dx = (1-R) * p[0] / rxy, dy = (1-R) * p[1] / rxy,
                r = norm([p[0] - dx, p[1] - dy, p[2]]);
            return { p: [ R/r * (p[0] - dx) + dx,
                          R/r * (p[1] - dy) + dy,
                          R/r *  p[2] ],
                     n: [ p[0]-dx, p[1]-dy, p[2] ] };
      }
      let xx = p[0]*p[0], yy = p[1]*p[1], zz = p[2]*p[2];
      let lerp = (a,b,t) => a + t * (b - a);

      let max = (a,b,c) => rounded ? Math.pow(a*a*a*a + b*b*b*b + c*c*c*c, 1/4) : Math.max(a,b,c);
      let r = Math.sqrt( form == 'sphere'  ? xx + yy + zz
                       : form == 'tubeX'   ? max(xx, yy + zz, 0)
                       : form == 'tubeY'   ? max(yy, zz + xx, 0)
                       : form == 'tubeZ'   ? max(zz, xx + yy, 0)
                       :                     max(xx, yy, zz) );
      return { p: scale(p, 1/r), n: p };
   }

   let sdf = (form, m, p, rounded, info) => {
      p = matrix_transform(m, p);
      let pn = projectPointToForm(form, p, rounded, info);
      return norm(subtract(pn.p, p)) * Math.sign(dot(p,pn.n) - dot(pn.p,pn.n));
   }

   let implicitFunction = (form, m, blur, sgn, p, rounded, info) => {
      let t = 1 - (sdf(form, m, p, rounded, info) - displacementTexture(p)) / blur;
      if (this.isTexture)
         t = valueTexture(t, p[0],p[1],p[2]);
      return t <= 0 ? 0 : (t > 1 ? 2 - 1/t/t : t*t) * sgn;
   }

   uvToForm = (u,v,data) => {
      let uvToP = (u,v) => {
         if (data.form == 'donut') {
            let R = data.info ? data.info : .37;
            let theta = 2 * Math.PI * u,
                phi = 2 * Math.PI * v;
            return [ Math.cos(theta) * (1-R + Math.cos(phi) * R),
                     Math.sin(theta) * (1-R + Math.cos(phi) * R),
                                              Math.sin(phi) * R ];
         }
         else {
            let theta = 2 * Math.PI * u,
                phi = Math.PI * (v - .5),
                p = [ Math.cos(theta) * Math.cos(phi),
                      Math.sin(theta) * Math.cos(phi),
                                        Math.sin(phi) ];
            let pn = projectPointToForm(data.form, p, data.rounded, data.info);
            return pn.p;
         }
      }
      let P = uvToP(u,v);
      return vertexArray(P,normalAtUV(u,v,P,uvToP),[P[0],P[1],0],[u,v]);
   }
   const formName = ('sphere,tubeX,tubeY,tubeZ,cube,donut').split(',');

   for (let i = 0 ; i < formName.length ; i++) {
      let form = formName[i];
      setFormMesh(form             , createMesh(64, 32, uvToForm, {form: form, rounded: false}));
      setFormMesh(form + ',rounded', createMesh(64, 32, uvToForm, {form: form, rounded: true}));
   }
   setFormMesh('tubeX' , cylinderXMesh);
   setFormMesh('tubeY' , cylinderYMesh);
   setFormMesh('tubeZ' , cylinderZMesh);
   setFormMesh('coneX' , coneXMesh);
   setFormMesh('coneY' , coneYMesh);
   setFormMesh('coneZ' , coneZMesh);
   setFormMesh('cube'  , cubeMesh);
   setFormMesh('cubeXZ', cubeXZMesh);

   let cylinderZ8Mesh = buildCylinderZMesh(8);
   let cylinderX8Mesh = permuteCoords(cylinderZ8Mesh);
   let cylinderY8Mesh = permuteCoords(cylinderX8Mesh);

   setFormMesh('tubeX8', cylinderX8Mesh);
   setFormMesh('tubeY8', cylinderY8Mesh);
   setFormMesh('tubeZ8', cylinderZ8Mesh);

   setFormMesh('tubeX', cylinderXMesh);
   setFormMesh('tubeY', cylinderYMesh);
   setFormMesh('tubeZ', cylinderZMesh);

   setFormMesh('octahedron', octahedronMesh);

   setFormMesh('pyramidX' , pyramidXMesh);
   setFormMesh('pyramidY' , pyramidYMesh);
   setFormMesh('pyramidZ' , pyramidZMesh);

   setFormMesh('square'  , createSquareMesh(2,0,1, 0));
   setFormMesh('sphere12', createMesh(12, 6, uvToSphere));
   setFormMesh('sphere6' , createMesh( 6, 3, uvToSphere));
   setFormMesh('sphere3' , createMesh( 3, 2, uvToSphere));
   setFormMesh('tube12'  , createMesh(12, 2, uvToTube));
   setFormMesh('tube6'   , createMesh( 6, 2, uvToTube));

   setFormMesh('ringZ', createMesh(32, 16, uvToTorus, .01));
   setFormMesh('ringX', permuteCoords(formMesh.ringZ));
   setFormMesh('ringY', permuteCoords(formMesh.ringX));

   setFormMesh('torusX', torusXMesh);
   setFormMesh('torusY', torusYMesh);
   setFormMesh('torusZ', torusZMesh);

   let blob = (data, x,y,z) => implicitFunction(data.form,
      data.m,
      data.blur,
      data.sign,
      [x,y,z],
      data.rounded,
      data.info);

   this.clear = () => data = [];

   this.addBlob = (form, rounded, info, M, d) => {
      let m = matrix_inverse(M);

      if (d === undefined)
         d = 0.5;

      blurFactor = d;

      let ad = Math.abs(d),
            A1 = [m[0],m[4],m[ 8],m[12]],
            B1 = [m[1],m[5],m[ 9],m[13]],
            C1 = [m[2],m[6],m[10],m[14]],

            da = 1 + ad * norm([A1[0],A1[1],A1[2]]),
            db = 1 + ad * norm([B1[0],B1[1],B1[2]]),
            dc = 1 + ad * norm([C1[0],C1[1],C1[2]]),

            A0 = [A1[0]/da,A1[1]/da,A1[2]/da,A1[3]/da],
            B0 = [B1[0]/db,B1[1]/db,B1[2]/db,B1[3]/db],
            C0 = [C1[0]/dc,C1[1]/dc,C1[2]/dc,C1[3]/dc];

            data.push({
               form   : form,
               rounded: rounded,
               info   : info,
               ABC    : [A1,A0,B1,B0,C1,C0],
               blur   : Math.abs(d),
               sign   : d == 0 ? 0 : Math.sign(d),
               M      : M.slice(),
               m      : m,
            });
   }

   this.eval = (x,y,z) => {
      let value = -1;
      for (let b = 0 ; b < data.length ; b++)
         value += blob(data[b], x,y,z);
      return value;
   }

   let computeWeights = (dst, i, x,y,z) => {

      // CREATE AN INDEXED ARRAY OF NON-ZERO WEIGHTS

      let index = [], value = [], sum = 0;
      let textureStateSave = textureState;
      textureState = 0;
      for (let b = 0 ; b < data.length ; b++) {
         let v = Math.abs(blob(data[b], x,y,z));
         if (v > 0) {
            index.push(b);
            value.push(v);
            sum += v;
            if (index.length == 6)
               break;
         }
      }
      textureState = textureStateSave;

      // PACK INDEX AND WEIGHT INTO INT+FRACTION PORTIONS OF THE SAME NUMBER

      for (let j = 0 ; j < value.length ; j++)
         dst[i + j] = index[j] + Math.max(0, Math.min(.999, value[j] / sum));

      for (let j = value.length ; j < 6 ; j++)
         dst[i + j] = -1;
   }

   // COMPUTE SURFACE NORMAL

   let computeNormal = (x,y,z) => {
      let e = .001, f0 = this.eval(x  ,y  ,z  ),
                     fx = this.eval(x+e,y  ,z  ),
                     fy = this.eval(x  ,y+e,z  ),
                     fz = this.eval(x  ,y  ,z+e);
      return normalize([f0-fx,f0-fy,f0-fz]);
   }

   // USE computeBounds() TO MAKE THE COMPUTATION MORE EFFICIENT.

   let computeBounds = (i0,i1,i2) => {
      let computeQuadricEquation = A => {
         let a = A[0], b = A[1], c = A[2], d = A[3];
         return [ a*a, 2*a*b, 2*a*c, 2*a*d,
                           b*b, 2*b*c, 2*b*d,
                                 c*c, 2*c*d,
                                       d*d ];
      }
      let solveQuadraticEquation = (A,B,C) => {
         let d = Math.sqrt(Math.max(0, B*B - 4*A*C));
         return [ (-B - d) / (2*A), (-B + d) / (2*A) ];
      }
      let bounds = [];
      let zBounds = (P, k,l,m, Q, a,b,c,d,e,f,g,h,i,j) => {
         a=Q[a],b=Q[b],c=Q[c],d=Q[d],e=Q[e],
         f=Q[f],g=Q[g],h=Q[h],i=Q[i],j=Q[j];
         let W = normalize(cross([2*a,b,c],[b,2*e,f])),
               vx = P[k], vy = P[l], vz = P[m],
               wx = W[0], wy = W[1], wz = W[2],
               A =   a*wx*wx + b*wx*wy + c*wz*wx + e*wy*wy +   f*wy*wz + h*wz*wz,
               B = 2*a*wx*vx + b*wx*vy + b*wy*vx + c*wz*vx +   c*wx*vz + d*wx +
                   2*e*wy*vy + f*wy*vz + f*wz*vy + g*wy    + 2*h*wz*vz + i*wz,
               C =   a*vx*vx + b*vx*vy + c*vz*vx + d*vx    +   e*vy*vy +
                     f*vy*vz + g*vy    + h*vz*vz + i*vz    +   j,
               t = solveQuadraticEquation(A,B,C),
               z0 = vz + t[0] * wz,
               z1 = vz + t[1] * wz;
         return [ Math.min(z0, z1), Math.max(z0, z1) ];
      }
      for (let b = 0 ; b < data.length ; b++) {
         let P  = data[b].M.slice(12,15),
               QA = computeQuadricEquation(data[b].ABC[i0]),
               QB = computeQuadricEquation(data[b].ABC[i1]),
               QC = computeQuadricEquation(data[b].ABC[i2]),
               Q  = [];
         for (let i = 0 ; i < QA.length ; i++)
            Q.push(QA[i] + QB[i] + QC[i]);
         Q[9] -= 1;
         bounds.push([zBounds(P, 1,2,0, Q, 4,5,1,6,7,2,8,0,3,9),
                      zBounds(P, 2,0,1, Q, 7,2,5,8,0,1,3,4,6,9),
                      zBounds(P, 0,1,2, Q, 0,1,2,3,4,5,6,7,8,9)]);
      }
      return bounds;
   }
}

function ImplicitSurface() {
   let blobMaterialName, blobIsSelected,
       blobInverseMatrices, blobMatrices, blobs = new Blobs(), divs, blur, mesh, precision = 1,
       textureState = 0, isFaceted = false, textureSrc = '';

   this.setDivs       = value => { if (value != divs) mesh = null; divs = Math.floor(value * precision); }
   this.setBlur       = value => { if (value != blur) mesh = null; blur = value; }
   this.setFaceted    = value => { if (value != isFaceted) mesh = null; isFaceted = value; }
   this.setNoise      = value => { if (value != textureState) mesh = null; textureState = value; }
   this.setTextureSrc = value => textureSrc = value;
   this.setIsTexture  = value => blobs.isTexture = value;
   this.setPrecision  = value => precision = value;
   this.mesh          = () => mesh;
   this.meshInfo      = () => { return { mesh: mesh, divs: divs }; }
   this.divs          = () => divs;
   this.remesh        = () => mesh = null;
   this.bounds        = t => blobs.innerBounds;

   this.blobs = blobs;

   this.beginBlobs = () => {
      blobs.clear();
      blobMaterialName = [];
      blobIsSelected = [];
      blobMatrices = [];
   }

   // ADD A SINGLE BLOB

   this.addBlob = (form, rounded, info, matrix, materialName, blur, sign, isSelectedShape) => {
      blobMaterialName.push(materialName);
      blobMatrices.push(matrix);
      blobIsSelected.push(isSelectedShape);
      blobs.addBlob(form, rounded, info, matrix, sign * blur);
   }

   // FINAL PREPARATION FOR BLOBBY RENDERING FOR THIS ANIMATION FRAME

   this.endBlobs = () => {
      if (blobMatrices.length == 0) {
         return;
      }

      if (! mesh) {
         mesh = blobs.implicitSurfaceTriangleMesh(divs, isFaceted, textureState, textureSrc);
         mesh.isTriangles = true;

         blobInverseMatrices = [];
         for (let b = 0 ; b < blobMatrices.length ; b++)
            blobInverseMatrices.push(matrix_inverse(blobMatrices[b]));
      }
   
      let rsfData = [], rsiData = [], translateData = [];
      let diffuseData = [], specularData = [];

      for (let b = 0 ; b < blobMatrices.length ; b++) {
         let m = materials[blobMaterialName[b]], a = m.ambient, d = m.diffuse, s = m.specular, t = m.texture;

         if (blobIsSelected[b]) {
            a = [ d[0] + .25, d[1] + .25, d[2] + .25 ];
            d = [0,0,0];
         }
         diffuseData = diffuseData.concat([a[0]+d[0], a[1]+d[1], a[2]+d[2], d[0] / (a[0] + d[0])]);
         specularData = specularData.concat(s);

         if (blobInverseMatrices[b]) {
            let matrixFwd = matrix_multiply(blobMatrices[b], blobInverseMatrices[b]);
            let matrixInv = matrix_inverse(matrixFwd);

            for (let col = 0 ; col < 3 ; col++)
            for (let row = 0 ; row < 3 ; row++) {
               rsfData.push(matrixFwd[4 * col + row]);
               rsiData.push(matrixInv[4 * col + row]);
            }
            for (let row = 0 ; row < 3 ; row++)
               translateData.push(matrixFwd[4 * 3 + row]);
         }
      }

      setUniform('Matrix3fv', 'uRSF', false, rsfData);
      setUniform('Matrix3fv', 'uRSI', false, rsiData);
      setUniform('3fv', 'uTranslate', translateData);
      setUniform('4fv', 'uDiffuse', diffuseData);
      setUniform('4fv', 'uSpecular', specularData);
      setUniform('1f', 'uBlobby', 1);
      drawMesh(mesh, 'white', textureSrc);
      setUniform('1f', 'uBlobby', 0);
   }
}

//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// TEXTURE CODE EDITOR EVENTS //////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////


let isAlt = false, isControl = false, isMeta = false, isShift = false,
    wasAlt = false, wasControl = false, wasMeta = false, wasShift = false;

let onKeyDown = event => {
   switch (event.key) {
   case 'Alt':     isAlt     = true; break;
   case 'Control': isControl = true; break;
   case 'Meta':    isMeta    = true; break;
   case 'Shift':   isShift   = true; break;
   }
}

let onKeyUp = event => {
   if(window.interactMode == 1){
   let insertChar = ch => {
      let i = codeText.selectionStart;
      codeText.value = codeText.value.substring(0, i) + ch + codeText.value.substring(i, codeText.value.length);
      codeText.selectionStart = codeText.selectionEnd = i+1;
   }
   let deleteChar = () => {
      if (codeText.value.length > 0) {
         let i = codeText.selectionStart;
         codeText.value = codeText.value.substring(0, i-1) + codeText.value.substring(i, codeText.value.length);
         codeText.selectionStart = codeText.selectionEnd = i-1;
      }
   }
   let deleteRange = () => {
      let i = codeText.selectionStart;
      let j = codeText.selectionEnd;
      codeText.value = codeText.value.substring(0, i) + codeText.value.substring(j, codeText.value.length);
      codeText.selectionStart = codeText.selectionEnd = i;
   }
   let deleteAll = () => {
      codeText.value = '';
      codeText.selectionStart = codeText.selectionEnd = 0;
   }
   switch (event.key) {
   case 'Alt':     isAlt     = false; wasAlt     = true; return;
   case 'Control': isControl = false; wasControl = true; return;
   case 'Meta':    isMeta    = false; wasMeta    = true; return;
   case 'Shift':   isShift   = false; wasShift   = true; return;
   }

   if (wasMeta) {
      let key = event.key.toUpperCase().charCodeAt(0);
      switch (event.key) {
      case 'ArrowLeft' : key = 37; break;
      case 'ArrowUp'   : key = 38; break;
      case 'ArrowRight': key = 39; break;
      case 'ArrowDown' : key = 40; break;
      default          : deleteChar(); break;
      }
      modeler.onKeyUp(key);
      wasAlt = wasControl = wasMeta = wasShift = false;
      return;
   }

   if (enableModeling) {
      switch (event.key) {
         case 'Escape':
            modeler.setShowingCode(false);
            break;
         case '`':
            deleteChar();
            modeler.parseCode(codeText.value);
            break;
         case ' ':
         case "'":
         case '"':
         case '/':
            insertChar(event.key);
            break;
         case '?':
            modeler.toggleRubber();
            break;
         case 'Enter':
            if (isShift) {
               deleteChar();
               modeler.rotatey(1);
            }
            break;
         case 'Backspace':
            if (isShift)
               deleteAll();
            else if (codeText.selectionStart < codeText.selectionEnd)
               deleteRange();
            else
               deleteChar();
            break;
         case 'ArrowLeft':
            if (isShift) {
               modeler.prevTexture();
               codeText.value = modeler.getTexture();
               modeler.parseCode(codeText.value);
            }
            else {
               let i = codeText.selectionStart;
               codeText.selectionStart = codeText.selectionEnd = Math.max(0, i-1);
            }
            break;
         case 'ArrowRight':
            if (isShift) {
               modeler.nextTexture();
               codeText.value = modeler.getTexture();
               modeler.parseCode(codeText.value);
            }
            else {
               let i = codeText.selectionStart;
               codeText.selectionStart = codeText.selectionEnd = Math.min(codeText.value.length, i+1);
            }
            break;
         case 'ArrowUp':
            {
               let i = Math.min(codeText.value.length - 1, codeText.selectionStart);
               let i0 = i;
               while (i0 >= 0 && codeText.value.charAt(i0) != '\n')
                  i0--;
               let di = i - i0;
               if (i0 > 0) {
                  i = i0 - 1;
                  while (i >= 0 && codeText.value.charAt(i) != '\n')
                     i--;
                  i = Math.min(i + di, i0 - 1);
               }
               else
                  i = 0;
               codeText.selectionStart = codeText.selectionEnd = i;
            }
            break;
         case 'ArrowDown':
            {
               let i = codeText.selectionStart;
               let i0 = i;
               while (i0 >= 0 && codeText.value.charAt(i0) != '\n')
                  i0--;
               let di = i - i0;
               let i1 = i;
               while (i1 < codeText.value.length && codeText.value.charAt(i1) != '\n')
                  i1++;
               i = Math.min(codeText.value.length, i1 + di);
               codeText.selectionStart = codeText.selectionEnd = i;
            }
            break;
         }
   }

   wasAlt = wasControl = wasMeta = wasShift = false;

   }
}

//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////// THE MODELER /////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////

let S = [], vm, vmi, computeQuadric, activeSet, implicitSurface,
    rotatex, rotatey, rotatexState, rotateyState, modelMatrix, isTable = false, isRoom = false;
let frameCount = 0;
let fl = 5;                                                          // CAMERA FOCAL LENGTH
{
   let activeCount = -1;
   let blinkTime = 0;
   let blur = 0.2;
   let cursor = [0,0,0];
   let flash = false;
   let isAlt = false;
   let isAnimatedTexture = false;
   let isFewerDivs = false;
   let isMirroring = false;
   let isCentering = false;
   let isClick = false;
   let isControl = false;
   let isCreating = false;
   let isExperiment = false, wasExperiment = false;
   let isFaceted = false;
   let isLengthening = false;
   let isLightColor = false;
   let isModeler = true;
   let isNewTextureCode = false;
   let isPressed = false;
   let isRotatedView = false;
   let isRotating = false;
   let isRubber = false, toRubber = false;
   let isScaling = false;
   let isShift = false;
   let isTexture = true;
   let isTranslating = false;
   let isUniformScaling = false;
   let isShowingBounds = false;
   let isShowingCode = false;
   let isShowingJoints = false;
   let isTextureSrc = false;
   let isWalking = false, walkFactor = 0;
   let isWiggling = false, wiggleFactor = 0;
   let keyPressed = -1, keyChar;
   let scene = [], modelIndex = 0;
   let mn = -1, mnPrev = -1;
   let name = '';
   let textureState = 0;
   let startTime = Date.now(), prevTime = startTime, fps = 10;    // TO TRACK FRAME RATE
   let xPrev, yPrev, xyTravel;
   let viewMatrix = matrix_identity();
   let viewMatrixInverse = matrix_inverse(viewMatrix);

   implicitSurface = new ImplicitSurface();
   vm  = matrix_identity();
   vmi = matrix_identity();

   // HANDLE SETTING WHETHER THE MODEL IS ACTIVELY CHANGING

   activeSet = isActive => activeCount = isActive ? 8 : -1;

   let activeState = () => activeCount >= 0;
   let activeTimer = () => activeCount--;

   // HANDLE LOADING AND SAVING

   let scene_to_load = null;

   let loadFunction = arg => scene_to_load = arg;

   let saveFunction = () => {
      scene[modelIndex] = {
         name        : name,
         S           : S,
         isRubber    : isRubber,
         isWalking   : isWalking,
         isWiggling  : isWiggling,
         textureState: textureState,
         texture     : textures[0],
      };
      return scene;
   }

   // DRAW ROUTINE THAT ALLOWS CUSTOM COLORS, TEXTURES AND TRANSFORMATIONS

   let draw = (mesh,color,move,turn,size,texture,bumpTexture,dull,flags,customShader,opacity,view) => {

      // IF NEEDED, CREATE A NEW MATERIAL FOR THIS COLOR.

      if (! materials[color]) {
         let r, g, b, sr = .9, sg = .9, sb = .9, sp = 20;
         if (typeof color === 'string') {
            let rgb = color.split(',');
            r = parseInt(rgb[0]) / 255;
            g = parseInt(rgb[1]) / 255;
            b = parseInt(rgb[2]) / 255;
         }
         else {
            r = color[0];
            g = color[1];
            b = color[2];
	    if (color.length > 3) {
	       sr = color[3];
	       sg = color[4];
	       sb = color[5];
	       sp = color[6];
            }
         }
         materials[color] = { ambient : [.2*r ,.2*g ,.2*b    ],
                              diffuse : [.8*r ,.8*g ,.8*b    ],
                              specular: [  sr ,  sg ,  sp, sp] };
      }

      // TRANSFORM BEFORE DRAWING IF ANY TRANSLATE, ROTATE OR SCALE ARGS.

      if (move || turn || size)
         M.save();

      if (move)
         M.translate(move);
      if (turn) {
         M.rotateX(turn[0]);
         M.rotateY(turn[1]);
         M.rotateZ(turn[2]);
      }
      if (size)
         M.scale(size);

      if (! isNaN(M.getValue()[0]))
         drawMesh(mesh, color, texture, bumpTexture, dull, flags, customShader, opacity, view);

      if (move || turn || size)
         M.restore();
   }

   this.rotatex = i => rotatexState += i;
   this.rotatey = i => rotateyState += i;
   this.toggleRubber = () => isRubber = ! isRubber;

   this.setShowingCode = state => {
      isShowingCode = state;
      // html.codeWindow.style.zIndex = isShowingCode ? 1 : -1;

      // // WHEN NOT EDITING TEXT, SHOW A DUMMY VERSION OF THE TEXT THAT DOES NOT RECEIVE ANY EVENTS.

      // html.inactiveCodeWindow.style.zIndex = isShowingCode ? -1 : 1;
      // html.inactiveCode.innerHTML = isShowingCode || ! isTexture ? '' : '<pre>' + codeText.value + '</pre>';
   }

   this.prevTexture = () => textureIndex = (textureIndex + textures.length - 1) % textures.length;
   this.nextTexture = () => textureIndex = (textureIndex + 1) % textures.length;
   this.getTexture  = () => textures[textureIndex];

   this.parseCode = code => {
      if (code.trim().length == 0) {
         textures[textureIndex] = '';
         textureFunction = null;
      }
      else {
         textures[textureIndex] = code;
         textureFunction = eval(`
            (density,x,y,z) => {
               let cos   = Math.cos;
               let max   = Math.max;
               let min   = Math.min;
               let noise = window.noise;
               let sin   = Math.sin;
               let time  = window.time;
               ` + textures[textureIndex] + `;
               return density;
            }
         `);
         activeSet(true);
      }
      // projectManager.save(saveFunction());
      isNewTextureCode = true;
   }

   // ANIMATE AND RENDER ONE FRAME
   this.updatePgm = () => {
      pgm = window.clay.clayPgm.program;
   }

   this.setAnidrawSlant = slant => anidrawSlant = slant;

   this.renderSyncObj = (remoteObjRoot) => {
        let teamIDs = Object.keys(window.teamObj);
           otherObjID = [];
           copiedObjID =  Object.keys(copiedObj);
   
           for (const i in teamIDs) {
               let data = window.teamObj[teamIDs[i]];
               for(const j in data) {
                   if(!copiedObjID.includes(data[j]["id"].toString())) {
                       copiedObj[data[j]["id"].toString()] = remoteObjRoot.add(data[j]["form"]).color(...data[j]["color"]).setMatrix(data[j]["matrix"]);
                   } else {
                       copiedObj[data[j]["id"].toString()].color(...data[j]["color"]).setMatrix(data[j]["matrix"]);
                   }
                   otherObjID.push(data[j]["id"].toString());
               }
           }
   
           for(const k in copiedObjID) {
               if(!otherObjID.includes(copiedObjID[k])) {
                  remoteObjRoot.remove(copiedObj[copiedObjID[k]]);
                   delete copiedObj[copiedObjID[k]];
               }
           }
    }

    this.renderSyncAvatar = (remoteAvatarRoot) => {
      let teamIDs = Object.keys(window.teamAvatar);
         otherAvatarID = [];
         copiedAvatarID =  Object.keys(copiedAvatar);

         for (const i in teamIDs) {
            let data = window.teamAvatar[teamIDs[i]];
            var lcMat = [];
            var rcMat = [];
            if(data["VR"]) {
               if(data["controllerMatrix"]["left"][0]) {
                  for(let j = 0; j < 16; j ++) {
                     lcMat.push(data["controllerMatrix"]["left"][j]);
                   }
               }
               if(data["controllerMatrix"]["right"][0]) {
                  for(let j = 0; j < 16; j ++) {
                     lcMat.push(data["controllerMatrix"]["right"][j]);
                   }
               }
            } else {
               lcMat = cg.mIdentity();
               rcMat = cg.mIdentity();
            }
               if(!copiedAvatarID.includes(teamIDs[i].toString())) {
                  copiedAvatar[teamIDs[i].toString()] = remoteAvatarRoot.add();
               var head = copiedAvatar[teamIDs[i].toString()].add().setMatrix(data["headset"]);
               var leftHand = copiedAvatar[teamIDs[i].toString()].add().scale(0);
               var rightHand = copiedAvatar[teamIDs[i].toString()].add().scale(0);
               let myAvatar = selfDefinedAvatar(head, leftHand, rightHand);
               if(!myAvatar["head"]) {
                  head.add("cube").scale(0.1).color(0,0,0);
                  head.add("cube").move(0.05,0.02,-0.1).scale(0.01,0.02,0.01).color(1,1,1);
                  head.add("cube").move(-0.05,0.02,-0.1).scale(0.01,0.02,0.01).color(1,1,1);
               }
               if(data["VR"]) {
                  leftHand.setMatrix(lcMat);
                  if(!myAvatar["leftHand"]) leftHand.add("cube").scale(0.05).color(0,0,0);
                  rightHand.setMatrix(rcMat);
                  if(!myAvatar["rightHand"]) rightHand.add("cube").scale(0.05).color(0,0,0);
               }
            } else {
               copiedAvatar[teamIDs[i].toString()].child(0).setMatrix(data["headset"]);
               if(copiedAvatar[teamIDs[i].toString()].nChildren() > 1) {
                  // console.log("controller mat", data["controllerMatrix"]["left"])
                  copiedAvatar[teamIDs[i].toString()].child(1).setMatrix(lcMat);
                  copiedAvatar[teamIDs[i].toString()].child(2).setMatrix(rcMat);
               }
            }
               otherAvatarID.push(teamIDs[i].toString());
         }
 
         for(const k in copiedAvatarID) {
             if(!otherAvatarID.includes(copiedAvatarID[k])) {
               remoteAvatarRoot.remove(copiedAvatar[copiedAvatarID[k]]);
               delete copiedAvatar[copiedAvatarID[k]];
             }
         }
   }

   let controllerLightColor = { left: [1,1,1], right: [1,1,1] };

   this.setControllerLightColor = (hand, color) => controllerLightColor[hand] = color;

   this.controllerBallSize = 0.02;

   this.animate = view => {
      window.timestamp++;
      window.needUpdateInput = true;
      //server.updateTimestamp();
      window.mySharedObj = [];
      this.updatePgm();
      this.model = model;
      this.views = views;
      codeEditorObj.scale(0);
      const posePosition = this.pose.transform.position;
      setUniform('3f', 'uViewPosition', posePosition.x, posePosition.y, posePosition.z);
      server.track();
      let info = cg.unpack(trackInfo, -2, 2);
      let q = [parseFloat(info[7]), parseFloat(info[8]), parseFloat(info[9]), parseFloat(info[10]), parseFloat(info[11]), parseFloat(info[12]), parseFloat(info[13])];
      let quaternion = {x:-q[3],y:-q[4],z:q[5],w:[6]};
      window.M_trio = cg.mFromQuaternion(quaternion);
      window.M_trio[12] = q[0];
      window.M_trio[13] = q[1];
      window.M_trio[14] = q[2];

      for (let hand in this.controllerWidgets)
         if (window.handtracking)
	    this.controllerWidgets[hand].scale(0);
         else
	    this.controllerWidgets[hand].setMatrix(cg.mInverse(root.getMatrix()))
	                                .move(this.controllerOrigin(hand))
	                                .scale(this.controllerBallSize)
                                        .color(buttonState[hand][0].pressed
					       ? scale(controllerLightColor[hand], 20) : [.48,.36,.27]);

      if (window.clay) scenes();
      // if (html.bgWindow)
      //    html.bgWindow.style.left = flash ? -screen.width : 0;

      // HANDLE LOADING A NEW SCENE

      if (isModeler) {
         if (window.vr && ! window.suppress_vrWidgets)
            this.vrWidgets.identity();
         else
            this.vrWidgets.scale(0);

         if (window.animate)
            window.animate();

         if (! window.isVideo) {
            videoScreen1.scale(0);
            videoScreen2.scale(0);
         }
         else {
            let s = 3.8;
            let videoScreen = model._isHUD ? videoScreen1 : videoScreen2;
            videoScreen.setMatrix(cg.mInverse(views[0].viewMatrix))
                       //.move(0,0,-.3*s).turnY(Math.PI).scale(.3197*s,.2284*s,.001).scale(.181);
                       .move(0,0,-.3*s).scale(.3197*s,.2284*s,.001).scale(.181);
         }

         if (window.interactMode != 2) {
            anidrawScreen.scale(0);
         }
         else {
            let s = 3.8;
            anidrawScreen.setMatrix(cg.mInverse(views[0].viewMatrix))
                         .move(0,0,-.3*s)
                         .move(0,-.08*anidrawSlant,0).turnX(-1.2*anidrawSlant)
                         //.turnY(Math.PI).scale(.3197*s,.2284*s,.001).scale(.181);
                         .scale(.3197*s,.2284*s,.001).scale(.181);
         }

         setUniform('1i', 'uWhitescreen', window.isWhitescreen);       
	 clay.peopleBillboards.update();
	 root.evalTextures();
         root.render(vm);
	 if (window.onlyScene) {
	    if (! window.ONLY_SCENE_LOADED)
	       chooseFlag(onlyScene);
	    window.ONLY_SCENE_LOADED = true;
	 }
         model.setControls();
      }

      else {
         if (scene_to_load) {
            scene = scene_to_load;
            scene_to_load = null;

            modelIndex = 0;
            let model = scene[modelIndex];
            name         = model.name;
            S            = model.S;
            isRubber     = false;
            toRubber     = model.isRubber;
            isWalking    = model.isWalking;
            isWiggling   = model.isWiggling;
            textureState = model.textureState;
            if (model.texture) {
               textures[0] = model.texture;
               codeText.value = textures[0];
               this.setShowingCode(isShowingCode);
               this.parseCode(textures[0]);
            }
            activeSet(true);
         }

         // IF ANY ANIMATED TEXTURE, OPTIMIZE RENDERING FOR THAT

         isAnimatedTexture = textures[textureIndex].includes('time');
         if (isAnimatedTexture)
            activeSet(true);
      }

      if (frameCount == 0) {
         setUniform('1f', 'uAspectRatio', canvas.width / canvas.height);
      }

      frameCount++;

      // SET ALL UNIFORM VARIABLES ON THE GPU
   
      time = (Date.now() - startTime) / 1000;
      setUniform('1f', 'uTime', time);                                  // SET GPU TIME
      let deltaTime = time - prevTime;
      fps = .1 * fps + .9 / deltaTime;
      prevTime = time;

      window.deltaTime = deltaTime;

      setUniform('1f', 'uOpacity', 1);

      // SET GPU LIGHTS
      setUniform('1i', 'uDLightCount', dLightCount);
      setUniform('1i', 'uPLightCount', pLightCount);
      if (dLightCount > 0) {
         setUniform('3fv', 'uLDir', dLightDirections);            
         setUniform('3fv', 'uLCol', dLightColors);
      }
      if (pLightCount > 0) {
         setUniform('3fv', 'uLPoint', pLightPositions);            
         setUniform('3fv', 'uLPointCol', pLightColors);
      }

      // HANDLE EXPERIMENTS

      if (isExperiment) {
         let rMinSave = rMin;
         rMin = .02;
         let x = -.9, y = 0, z = 0;
         for (let i = 0 ; i < 100 ; i++) {
            let theta = Math.sin(i/4);
            let dx = .03 * Math.cos(theta);
            let dy = .03 * Math.sin(theta);
            createBegin(x,y);
            createDrag(x+dx,y+dy);
            x += dx * .8;
            y += dy * .8;
         }
         rMin = rMinSave;
      }
      isExperiment = false;

      M.save();

      viewMatrix = M.getValue();
      viewMatrixInverse = matrix_inverse(viewMatrix);

      // DRAW THE ROOM

      if (isRoom) {
         if (! formMesh.roomBackground) {
            let inch = 0.0254, foot = 12*inch, h = 10 * foot, w = 30 * foot, t = 2 * inch;
            let M = (x,y,z, sx,sy,sz) => cg.mMultiply(cg.mTranslate(x,y,z), cg.mScale(sx,sy,sz));
	    this.defineMesh('roomBackground', this.combineMeshes([
	       ['cube', M(   0,  0,   0, w/2,t/2,w/2), [.8,1,.8]],
	       ['cube', M(   0,  h,   0, w/2,t/2,w/2), [.8,1,.8]],
	       ['cube', M( w/2,h/2,   0, t/2,h/2,w/2), [1,.8,.8]],
	       ['cube', M(-w/2,h/2,   0, t/2,h/2,w/2), [1,.8,.8]],
	       ['cube', M(   0,h/2, w/2, w/2,h/2,t/2), [.8,.8,1]],
	       ['cube', M(   0,h/2,-w/2, w/2,h/2,t/2), [.8,.8,1]],
	    ]));
         }
	 draw(formMesh.roomBackground, 'white');
      }

      // DRAW THE TABLE

      if (isTable) {
         let inches = 0.0254,
             radius     = (70 + 11/16) * inches / 2,
             height     = 29 * inches,
             thickness  = 0.75 * inches,
             legRadius  = 4 * inches / 2,
             baseRadius = 24 * inches / 2;

         draw(cylinderYMesh, '40,16,8', [0,height-thickness,0], null, [radius    ,thickness,radius    ]);
         draw(cylinderYMesh, '40,16,8', [0,height/2        ,0], null, [legRadius ,height/2 ,legRadius ]);
         draw(cylinderYMesh, '40,16,8', [0,thickness       ,0], null, [baseRadius,thickness,baseRadius]);
      }

      // DRAW REMOTE OBJ
      this.renderSyncObj(remoteObjRoot);

      // DRAW REMOTE USER
      this.renderSyncAvatar(remoteAvatarRoot);

      // SHOW CENTERING INDICATOR

      if (! isRubber && isCentering)
         if (isMirroring) {
            draw(cubeMesh, 'black', [-.01,0,0], null, [.002,2,.002]);
            draw(cubeMesh, 'black', [ .01,0,0], null, [.002,2,.002]);
         }
         else
            draw(cubeMesh, 'black', null, null, [.0025,2,.0025]);

      // SET IMPLICIT SURFACE PROPERTIES
   
      implicitSurface.setBlur(blur);
      implicitSurface.setDivs(isFewerDivs ? 15 : activeState() ? 30 : 60);
      implicitSurface.setFaceted(isFaceted);
      implicitSurface.setNoise(textureState);
      implicitSurface.setIsTexture(isTexture);
      implicitSurface.setTextureSrc(isTextureSrc ? 'media/textures/wood.png' : '');

      // ADVANCE THE "ACTIVE REMESHING" TIMER

      activeTimer();

      // SAVE MATRICES BEFORE DOING ANY JOINT ROTATION

      for (let n = 0 ; n < S.length ; n++)
         S[n].M_save = S[n].M.slice();

      // HANDLE WIGGLING ANIMATION

      wiggleFactor = Math.max(0, Math.min(1, wiggleFactor + (isWiggling ? .03 : -.03)));
      if (S.length > 0 && wiggleFactor > 0) {
         let w = .08 * wiggleFactor;
         let wiggleRot = n =>
            matrix_multiply(
            matrix_multiply(matrix_rotateX(w * Math.sin(8 * time + S[n].id *  5)),
                            matrix_rotateY(w * Math.sin(8 * time + S[n].id * 10))),
                            matrix_rotateZ(w * Math.sin(8 * time + S[n].id * 15)));
         rotateAboutPoint(0, wiggleRot(0), S[0].M.slice(12,15));
         for (let n = 0 ; n < S.length ; n++)
            if (S[n].jointPosition) {
               S[n].jointRotation = wiggleRot(n);
               rotateAboutJoint(n);
            }
      }

      // HANDLE BLINKING EYES

      let blink = time > blinkTime - .1;
      if (time > blinkTime)
         blinkTime = time + 1 + 5 * Math.random();

      for (let n = 0 ; n < S.length ; n++)
         if ( S[n].name == 'right_eye' ||
              S[n].name == 'left_eye' ) {
            S[n].jointRotation = blink ? matrix_scale(.01,.01,.01) : matrix_identity();
            rotateAboutJoint(n);
         }
 
      // HANDLE PROCEDURAL WALKING ANIMATION

      walkFactor = Math.max(0, Math.min(1, walkFactor + (isWalking ? .06 : -.06)));
      if (S.length > 0 && walkFactor > 0) {

         let bird = ! hasPart('left_upper_leg') || hasPart('right_lower_arm') && ! hasPart('right_hand');
         let w = sCurve(walkFactor) * .7;
         let tR = bird ? 8 * time : 4 * time;
         let tL = tR + Math.PI;

         let walkRot = n => {
            let mm = matrix_multiply, rx = matrix_rotateX, ry = matrix_rotateY, rz = matrix_rotateZ;
            let cos = Math.cos, sin = Math.sin;
            let m = matrix_identity();
            switch (S[n].name) {

            case 'belly': m = mm(matrix_translate(0, w * (bird ? .05 : -.05) * sin(2 * tR), 0), rz(w * .1 * cos(tR))); break;
            case 'chest': m = mm(rz(w * -.13 * cos(tR)), rx(w * -.05 * cos(2 * tR))); break;
            case 'head' : m = mm(rx(w *  .03 * cos(2 * tR)), rz(w *  .1  * cos(tR))); break;

            case 'right_upper_arm': m = mm(ry(bird ? 0 : w *  (cos(tR)-.5)/2), rz(bird ? w* (cos(2*tR)+1)/4 :  w)); break;
            case 'left_upper_arm' : m = mm(ry(bird ? 0 : w * -(cos(tL)-.5)/2), rz(bird ? w*-(cos(2*tL)+1)/4 : -w)); break;

            case 'right_lower_arm': m = mm(rx(bird ? 0 : w * (-sin(tR)-1)/2), rz(bird ?  sin(2*tR)/8 :  w)); break;
            case 'left_lower_arm' : m = mm(rx(bird ? 0 : w * (-sin(tL)-1)/2), rz(bird ? -sin(2*tL)/8 : -w)); break;

            case 'right_hand'     : m = rx(w * -sin(tR)/4); break;
            case 'left_hand'      : m = rx(w * -cos(tR)/4); break;

            case 'right_upper_leg': m = mm(rz(w* .05 * (sin(tR)-.5)), rx(w*(bird ? -cos(tR)+1.5 : 1.5*cos(tR)-.5)/2)); break;
            case 'left_upper_leg' : m = mm(rz(w*-.05 * (sin(tL)+.5)), rx(w*(bird ? -cos(tL)+1.5 : 1.5*cos(tL)-.5)/2)); break;

            case 'right_lower_leg': m = rx(w * (bird ? sin(tR) - 1 : (sin(tR) + 1)*1.5)); break;
            case 'left_lower_leg' : m = rx(w * (bird ? sin(tL) - 1 : (sin(tL) + 1)*1.5)); break;

            case 'right_foot'     : m = rx(w * (bird ? cos(tR)/2 - sin(tR)/2 : -cos(tR)/2)); break;
            case 'left_foot'      : m = rx(w * (bird ? cos(tL)/2 - sin(tL)/2 : -cos(tL)/2)); break;
            }
            return m;
         }
         rotateAboutPoint(0, walkRot(0), S[0].M.slice(12,15));
         for (let n = 0 ; n < S.length ; n++)
            if (S[n].jointPosition) {
               S[n].jointRotation = walkRot(n);
               rotateAboutJoint(n);
            }
      }

      // DRAW THE MODEL
   
      implicitSurface.beginBlobs();

      // SHOW JOINTS IF IN JOINT SHOWING MODE

      if (isShowingJoints) {

         let linkCount = 0;

         let drawJoint = n => {         // DRAW A JOINT
               let s = S[n];
               M.save();
                  M.setValue(matrix_multiply(vm, s.M));
                  if (s.jointPosition)
                     M.translate(s.jointPosition);
                  let sc = i => .02 / norm(M.getValue().slice(4*i,4*i+3));
                  M.scale(sc(0), sc(1), sc(2));
                  draw(sphereMesh, [1,1,1]);
               M.restore();
         }

         let drawLink = (p1, p2, r) => {       // DRAW A LINK BETWEEEN TWO JOINTS
            M.save();
               M.setValue(vm);
               M.translate(mix(p1, p2, 0.5));
               let dp = [p2[0]-p1[0],p2[1]-p1[1],p2[2]-p1[2]];
               M.aimZ(dp);
               M.scale(r,r,norm(dp) / 2);
               draw(tubeMesh, 'white');
            M.restore();
            linkCount++;
         }

         // CONNECT FIRST BLOB TO ITS CHILDREN

         drawJoint(0);
         let p0 = matrix_transform(S[0].M, [0,0,0]);
         for (let i = 0 ; i < S.length ; i++)
            if (S[i].parentID == S[0].id)
               drawLink(p0, matrix_transform(S[i].M, S[i].jointPosition), .005);

         // SHOW ALL JOINTS AND PARENT/CHILD CONNECTIONS

         for (let n = 1 ; n < S.length ; n++) {
            let s = S[n];
            if (s.jointPosition) { 
               drawJoint(n);
               if (parent(s) && parent(s).jointPosition)
                  drawLink(matrix_transform(parent(s).M, parent(s).jointPosition),
                           matrix_transform(s.M, s.jointPosition), .01);
            }
         }
      }

      // SPECIFY THE BLOBS FOR THE MODEL
   
      for (let n = 0 ; n < S.length ; n++) {
         M.save();

            let materialId = S[n].color;
            let m = materials[materialId];
	    if (isRubber)
               m.specular = [0,0,0,20];

            // IF IN BLOBBY MODE, ADD TO ARRAY OF BLOBS

            if (S[n].isBlobby && S[n].form != 'label')
               implicitSurface.addBlob(
                  S[n].form,
                  S[n].rounded,
                  S[n].info,
                  S[n].M,
                  materialId,
                  S[n].blur,
                  S[n].isBlobby ? S[n].sign : 0,
                  n==mn);

            // IF NOT IN BLOBBY MODE, DRAW THE SHAPE

            else {
               let m = materials[materialId];
               if (n == mn)
                  m.texture = [.5,0,0,0];
               M.save();
               M.setValue(matrix_multiply(vm, S[n].M));
               let name = S[n].form + (S[n].rounded ? ',rounded' : '');
               if (S[n].info) {
                  name += ',' + S[n].info;
                  if (! formMesh[name])
                     setFormMesh(name,
                        S[n].form == 'label'     ? createTextMesh(S[n].info)
                      : S[n].form == 'particles' ? createParticlesMesh(S[n].info)
                                                 : createMesh(64, 32, uvToForm,
                                                   {
                                                     form   : S[n].form,
                                                     rounded: S[n].rounded,
                                                     info   : S[n].info
                                                   }));
               }
               draw(formMesh[name], materialId, null, null, null, S[n].texture, S[n].bumpTexture, S[n].dull, S[n].flags, S[n].customShader, S[n].opacity, S[n].view);
               M.restore();
               if (m && m.texture)
                  delete m.texture;
            }

         M.restore();
      }

      // IF SHOWING JOINTS, MAKE BLOB MODEL MOTTLED AND TRANSPARENT

      setUniform('1f', 'uNoisy'  , isRubber ? 1 : 0);
      setUniform('1f', 'uOpacity', isShowingJoints ? .3 : 1);
      M.save();
         M.setValue(vm);
         implicitSurface.endBlobs();
      M.restore();
      setUniform('1f', 'uNoisy'  , 0);
      setUniform('1f', 'uOpacity', 1);

      // SHOW VISUAL HINT OF ANY NEGATIVE SHAPES

      if (! isRubber) {
         setUniform('1f', 'uOpacity', .25);
         for (let n = 0 ; n < S.length ; n++)
            if (S[n].sign == -1) {
               M.save();
                  M.setValue(matrix_multiply(vm, S[n].M));
                  let m = materials[S[n].color],
                  form = S[n].form;
                  if (n == mn)
                     m.texture = [.5,0,0,0];
                  let name = form + (S[n].rounded ? ',rounded' : '');
                  draw(formMesh[name], S[n].color);
                  if (m.texture)
                     delete m.texture;
               M.restore();
            }
         setUniform('1f', 'uOpacity', 1);
      }

      // OPTIONALLY SHOW BOUNDING BOXES AROUND BLOBS

      if (! isRubber && isShowingBounds) {
         let drawBoundsCube = (b, matrix, t) => {
            let x0 = b[0][0], x1 = b[0][1];
            let y0 = b[1][0], y1 = b[1][1];
            let z0 = b[2][0], z1 = b[2][1];
            M.save();
               M.setValue(matrix);
               M.translate((x0+x1)/2, (y0+y1)/2, (z0+z1)/2);
               M.scale((x1-x0)/2, (y1-y0)/2, (z1-z0)/2);
               setUniform('1f', 'uOpacity', t ? t : 0.3);
               draw(cubeMesh, '255,255,255');
            M.restore();
         }

         let bounds = implicitSurface.bounds();
         let b = [[100,-100],[100,-100],[100,-100]];
         for (let n = 0 ; n < bounds.length ; n++) {
            drawBoundsCube(bounds[n], vm);
            for (let j = 0 ; j < 3 ; j++) {
               b[j][0] = Math.min(b[j][0], bounds[n][j][0]);
               b[j][1] = Math.max(b[j][1], bounds[n][j][1]);
            }
         }
         drawBoundsCube(b, vm, .1);
         drawBoundsCube([[-1,-.99],[-1,1],[-1,1]], vm, .1);
         drawBoundsCube([[ .99, 1],[-1,1],[-1,1]], vm, .1);
         drawBoundsCube([[-1,1],[-1,-.99],[-1,1]], vm, .1);
         drawBoundsCube([[-1,1],[ .99, 1],[-1,1]], vm, .1);
      }

      M.restore();

      // POSSIBLY REBUILD THE IMPLICIT SURFACE

      if (textureState==2 || isNewTextureCode || ! isRubber && activeState() && frameCount % 4 == 0) {
         implicitSurface.remesh();
         if (toRubber) {
            isRubber = true;
            toRubber = false;
         }
         isNewTextureCode = false;
      }

      // RESTORE MATRICES TO BEFORE JOINT ROTATIONS

      for (let n = 0 ; n < S.length ; n++)
         S[n].M = S[n].M_save;

      // HANDLE ROTATING THE MODEL
   
      let delta = 2 * deltaTime;

      let rotateModel = (rotate, rotateState, matrix_rotate, offset) => {
         let rotateTarget = Math.PI / 2 * rotateState;
         if (rotate != rotateTarget) {
            let rotateBy = 0;
            if (rotate > rotateTarget + delta)
               rotateBy = -delta;
            if (rotate < rotateTarget - delta)
               rotateBy = delta;
            if (Math.abs(rotate - rotateTarget) < delta)
               rotateBy = rotateTarget - rotate;
            modelMatrix = matrix_multiply(matrix_rotate(rotateBy), modelMatrix);
            rotate += rotateBy;
            mn = findBlob(xPrev, yPrev);
         }
         return rotate;
      }
      rotatex = rotateModel(rotatex, rotatexState, matrix_rotateX);
      rotatey = rotateModel(rotatey, rotateyState, matrix_rotateY);

      vm  = viewMatrix;
      vmi = matrix_inverse(vm);

      if (videoHandTracker && ! window.vr)
         videoHandTracker.update();

      g2.update();
   }

   // FIND OUT WHETHER THE MODEL HAS A PARTICULAR NAMED PART

   let hasPart = partName => {
      for (let i = 0 ; i < S.length ; i++)
         if (S[i].name === partName)
            return true;
      return false;
   }

   // INSERT A BLOB INTO THE ARRAY OF BLOBS
   
   let insertBlob = (nInsert, s) => {
      for (let n = S.length ; n > nInsert ; n--)
         S[n] = S[n-1];
      S[nInsert] = s;
      activeSet(true);
   }

   // DELETE A BLOB
   
   let deleteBlob = nDelete => {
      let s = S[nDelete];

      for (let n = nDelete ; n < S.length - 1 ; n++)
         S[n] = S[n+1];
      S.pop();

      for (let n = 0 ; n < S.length ; n++)
         if (S[n].parentID == s.id) {
            delete S[n].parentID;
            delete S[n].jointPosition;
         }

      mn = findBlob(xPrev, yPrev);
      activeSet(true);
   }

   // FIND THE INDEX OF A BLOB WITHIN THE ARRAY OF BLOBS

   let findBlobIndex = s => {
      if (s)
         for (let n = 0 ; n < S.length ; n++)
            if (s.id == S[n].id)
               return n;
      return -1;
   }

   let findBlobFromID = id => {
      for (let n = 0 ; n < S.length ; n++)
         if (S[n].id == id)
            return S[n];
      return null;
   }

   let isChildOf = (s, parentName) => {
      let parent = findBlobFromID(s.parentID);
      return parent && parent.name == parentName;
   }

   let parent = s => findBlobFromID(s.parentID);

   // HANDLE UNDO AND REDO

   let undoStack = [], undoStackPointer = -1;

   let saveForUndo = () => {
      if (isCreating)
         createEnd();
      let S2 = [];
      for (let n = 0 ; n < S.length ; n++)
         S2.push(blobDuplicate(S[n]));
      undoStack[++undoStackPointer] = S2;
   }

   let undo = () => {
      saveForUndo();
      undoStackPointer--;
      if (undoStackPointer >= 0) {
         S = undoStack[undoStackPointer--];
         activeSet(true);
      }
      if (undoStackPointer == -1)
         undoStackPointer = 0;
   }

   let redo = () => {
      if (undoStackPointer < undoStack.length-1) {
         S = undoStack[++undoStackPointer];
         activeSet(true);
      }
      if (undoStackPointer == undoStack.length-1)
         undoStackPointer = undoStack.length-2;
   }

   // DUPLICATE A BLOB

   let blobDuplicate = s => {
      return {
         M: s.M.slice(),
         Q: s.Q.slice(),
         blur: s.blur,
         color: s.color,
         id: s.id,
         info: s.info,
         isBlobby: s.isBlobby,
         isColored: s.isColored,
         jointPosition: s.jointPosition ? s.jointPosition.slice() : null,
         jointRotation: s.jointRotation ? s.jointRotation.slice() : null,
         parentID: s.parentID,
         rounded: s.rounded,
         sign: s.sign,
         symmetry: s.symmetry,
         texture: '',
         form: s.form,
      };
   }

   // COMPUTE THE MATRIX DESCRIBING A BLOB'S INITIAL POSITION/SCALE

   let rMin = .025;

   let computeMatrix = s => {
      let C = mix(s.A, s.B, 0.5),
          R = [ Math.max(rMin, Math.abs(s.A[0] - s.B[0]) / 2),
                Math.max(rMin, Math.abs(s.A[1] - s.B[1]) / 2),
                Math.max(rMin, Math.abs(s.A[2] - s.B[2]) / 2) ];
      s.M = [ R[0], 0   , 0   , 0 ,
              0   , R[1], 0   , 0 ,
              0   , 0   , R[2], 0 ,
              C[0], C[1], C[2], 1 ];
      s.M = matrix_multiply(vmi, s.M);
      computeQuadric(s);
   }

   // FIND WHICH BLOB IS VISIBLE AT A GIVEN PIXEL

   let findActiveBlob = (x, y) => {
      mn = findBlob(x, y);
      if (mn != mnPrev)
         activeSet(true);
      mnPrev = mn;
   }
   
   let findBlob = (x,y) => {
      let p = matrix_transform(vmi, [0,0,fl,1]);
      let u = matrix_transform(vmi, normalize([x,y,-fl,0]));
      let tMin = 1000, nMin = -1;
      for (let n = 0 ; n < S.length ; n++) {
         let t = raytraceToQuadric(S[n].Q, p, u);
         if (t < tMin) {
            tMin = t;
            nMin = n;
         }
      }
      return nMin;
   }

   // COMPUTE THE QUADRIC EQUATION FOR RAY TRACING TO A BLOB
   
   computeQuadric = s => {
      let IM = matrix_inverse(s.M);
      s.Q = matrix_multiply(matrix_transpose(IM),
                            matrix_multiply([1, 0, 0, 0,
                                             0, 1, 0, 0,
                                             0, 0, 1, 0,
                                             0, 0, 0,-1], IM));
   }

   // RAY TRACE TO A BLOB
   
   let raytraceToQuadric = (Q,p,u) => {
      let A = dot(u, matrix_transform(Q, u)),
          B = dot(u, matrix_transform(Q, p)),
          C = dot(p, matrix_transform(Q, p)),
          D = B*B - A*C;
      return D < 0 ? 10000 : (-B - Math.sqrt(D)) / A;
   }

   // GET THE DISTANCE TO THE BLOB AT A PIXEL

   let blobZ = (n, x,y) => {
      let p = [0,0,fl,1];
      let u = normalize([x,y,-fl,0]);
      let t = raytraceToQuadric(S[n].Q, p, u);
      return p[2] + t * u[2];
   }

   let rotateAboutPoint = (nn, rot, p) => {
      let s = S[nn];
      move(s,-p[0],-p[1],-p[2]);
      s.M = matrix_multiply(rot, s.M);
      move(s, p[0], p[1], p[2]);
      for (let n = 1 ; n < S.length ; n++)
         if (S[n].parentID == s.id)
            rotateAboutPoint(n, rot, p);
   }

   let rotateAboutJoint = nn => {
      let p = matrix_transform(S[nn].M, S[nn].jointPosition);
      rotateAboutPoint(nn, S[nn].jointRotation, p);
   }

   let move = (s,x,y,z) => { s.M[12]+=x; s.M[13]+=y; s.M[14]+=z; }

   // MOVE, ROTATE OR SCALE A BLOB

   let xfBlob = (s, matrix, x,y,z, isTransformingChildren) => {
      move(s,-x,-y,-z);
      s.M = matrix_multiply(vm    , s.M);
      s.M = matrix_multiply(matrix, s.M);
      s.M = matrix_multiply(vmi   , s.M);
      move(s, x, y, z);
      if (isTransformingChildren)
         for (let i = 0 ; i < S.length ; i++)
            if (S[i].parentID == s.id)
               xfBlob(S[i], matrix, x,y,z, true);
   }

   let transformBlob = (n, x,y,z) => {
      let s = S[n];
      activeSet(true);
      let mx = s.M[12], my = s.M[13], mz = s.M[14];

      if (isUniformScaling)
         xfBlob(s, matrix_scale(1+4*y, 1+4*y, 1+4*y), mx,my,mz, isPressed);
      if (isScaling)
         xfBlob(s, matrix_scale(1+4*x, 1+4*y, 1+4*z), mx,my,mz, isPressed);
      if (isRotating)
         xfBlob(s, matrix_multiply(matrix_rotateX(-2*y), matrix_rotateY(2*x)), mx,my,mz, isPressed);
      if (isTranslating) {
         xfBlob(s, matrix_translate(x,y,z), mx,my,mz, isPressed);
         if (! isRubber && rotatexState % 4 == 0 && rotateyState % 4 == 0 && (n == mn || I(n) == mn)) {
            let b = implicitSurface.bounds();
            for (let i = 0 ; i < S.length ; i++)
               if (S[i].isBlobby && b[i][0][0] < b[n][0][0] && b[i][0][1] > b[n][0][1] &&
                                    b[i][1][0] < b[n][1][0] && b[i][1][1] > b[n][1][1]) {
                  s.M[14] = blobZ(i, xPrev, yPrev);
                  if (! s.isBlobby)
                     s.M[14] -= (b[n][2][1] - b[n][2][0]) / 2;
                  break;
               }
         }
      }
      computeQuadric(s);
   }

   let isDraggingFromCenter = false;

   let I = n => S[n].symmetry==2 ? n-1 : n;
   
   let transform = (n, dx, dy, dz) => {
      isDraggingFromCenter = isPressed && S[n].symmetry == 0;
      if (isDraggingFromCenter)
         for (let i = 0 ; i < S.length ; i++) {
             S[i].saveSymmetry = S[i].symmetry;
             S[i].symmetry = 0;
         }
      transform2(n, dx, dy, dz);
      if (isDraggingFromCenter)
         for (let i = 0 ; i < S.length ; i++) {
            S[i].symmetry = S[i].saveSymmetry;
            delete S[i].saveSymmetry;
         }
   }
   let transform2 = (n, dx, dy, dz) => {
      let sym = S[n].symmetry ? 1 : 0;
      for (let i = 0 ; i <= sym ; i++) {
         let sgn = isScaling || isUniformScaling || i == 0 ? 1 : -1;
         if (! isScaling && ! isUniformScaling && I(n) == n-1) sgn *= -1;
         let r = rotateyState % 2;
         let sx = ! isRotating || i==0 ? 1 : -1;
         transformBlob(I(n)+i, r ?  sx*dx : dx*sgn,
                               r ?  sx*dy : dy,
                               r ? sgn*dz : dz);
      }
   }

   let nameBipedParts = () => {
      for (let i = 0 ; i < S.length ; i++)
         if (S[i].name == 'right_foot') {
            for (let n = 0 ; n < S.length ; n++) {
               let s = S[n], m = s.symmetry;
               if (isChildOf(s, 'chest')) s.name = m==0 ? 'head' : m==1 ? 'right_upper_arm' : 'left_upper_arm';
               if (isChildOf(s, 'left_upper_arm' )) s.name = 'left_lower_arm' ;
               if (isChildOf(s, 'right_upper_arm')) s.name = 'right_lower_arm';
               if (isChildOf(s, 'left_upper_arm' )) s.name = 'left_lower_arm' ;
               if (isChildOf(s, 'right_lower_arm')) s.name = 'right_hand';
               if (isChildOf(s, 'left_lower_arm' )) s.name = 'left_hand' ;
            }
            return;
         }

      S[0].name = 'belly';
      for (let n = 1 ; n < S.length ; n++) {
         let s = S[n], m = s.symmetry;
         if      (isChildOf(s, 'belly')) s.name = m==0 ? 'chest' : m==1 ? n<3 ? 'right_eye' : 'right_upper_leg' :
                                                                          n<3 ? 'left_eye'  : 'left_upper_leg'  ;
         else if (isChildOf(s, 'chest')) s.name = m==0 ? 'head'  : m==1 ? 'right_upper_arm' : 'left_upper_arm'  ;
         else if (isChildOf(s, 'head' )) s.name = m==0 ? 'nose'  : m==1 ? 'right_eye'       : 'left_eye'        ;
         else if (isChildOf(s, 'right_upper_leg')) s.name = 'right_lower_leg';
         else if (isChildOf(s, 'right_lower_leg')) s.name = 'right_foot'     ;
         else if (isChildOf(s, 'right_upper_arm')) s.name = 'right_lower_arm';
         else if (isChildOf(s, 'right_lower_arm')) s.name = 'right_hand'     ;
         else if (isChildOf(s, 'left_upper_leg' )) s.name = 'left_lower_leg' ;
         else if (isChildOf(s, 'left_lower_leg' )) s.name = 'left_foot'      ;
         else if (isChildOf(s, 'left_upper_arm' )) s.name = 'left_lower_arm' ;
         else if (isChildOf(s, 'left_lower_arm' )) s.name = 'left_hand'      ;
      }
   }

   // INTERACTION TO CREATE A NEW BLOB

   let createBegin = (x,y) => {
      mn = S.length;
      S.push({
         A: [x,y,0],
         B: [x+.01,y+.01,0],
         blur: 0.5,
         color: defaultColor,
         id: uniqueID(),
         isBlobby: true,
         isColored: false,
         rounded: false,
         sign: 1,
         symmetry: 0,
         texture: '',
      });
      computeMatrix(S[mn]);
      xPrev = x;
      yPrev = y;
   }

   let createDrag = (x,y) => {
      activeSet(true);
      let s = S[mn];

      if (!s || ! s.B) {
         mn = -1;
         keyChar = null;
         return;
      }

      s.B[0] = x;
      s.B[1] = y;
      let rz = Math.max(rMin, Math.min(Math.abs(s.A[0] - s.B[0]),
                                       Math.abs(s.A[1] - s.B[1])) / 2);
      s.A[2] = -rz;
      s.B[2] = +rz;

      computeMatrix(s);
      xyTravel += Math.abs(x - xPrev) + Math.abs(y - yPrev);
      xPrev = x;
      yPrev = y;
   }

   let createEnd = () => {
      if (isCentering && S[mn].A[0] * S[mn].B[0] < 0) {
         S[mn].M[12] = 0;
         computeQuadric(S[mn]);
      }
      handleJoint(mn);
      isCreating = false;
      mn = -1;
      if (isMirroring)
         mirror();
   }

   let deleteSelectedBlob = () => {
      if (S.length > 0) {               // DELETE A BLOB
         let n = ns(), sym = S[n].symmetry;
         if (sym == 1) deleteBlob(n+1);
                       deleteBlob(n);
         if (sym == 2) deleteBlob(n-1);
      }
   }

   // HELPER FUNCTIONS FOR RESPONDING TO MOUSE/CURSOR EVENTS

   let handleJoint = nn => {
      if (nn >= 1) {
         let intersection = (a,b) => {
            return [ [ Math.max(a[0][0],b[0][0]), Math.min(a[0][1],b[0][1]) ],
                     [ Math.max(a[1][0],b[1][0]), Math.min(a[1][1],b[1][1]) ],
                     [ Math.max(a[2][0],b[2][0]), Math.min(a[2][1],b[2][1]) ] ];
         }
         let computeJointPosition = (s, I) =>
            s.jointPosition = matrix_transform(matrix_inverse(s.M), [ (I[0][0] + I[0][1]) / 2,
                                                                      (I[1][0] + I[1][1]) / 2,
                                                                      (I[2][0] + I[2][1]) / 2 ]);

         if (S[nn].parentID) {                          // REPOSITION EXISTING JOINT
            let b = implicitSurface.bounds();
            let n = findBlobIndex(parent(S[nn]));
            if (n >= 0) {
               let I = intersection(b[n], b[nn]);
               computeJointPosition(S[nn], I);
               if (S[nn].symmetry) {
                  let nn2 = S[nn].symmetry==1 ? nn+1 : nn-1;
                  let n2 = findBlobIndex(parent(S[nn2]));
                  let I = intersection(b[n2], b[nn2]);
                  computeJointPosition(S[nn2], I);
               }
            }
         }
         else {                                         // CREATE NEW JOINT
            let b = implicitSurface.bounds();
            for (let n = 0 ; n < b.length ; n++) {
               if (n != nn) {
                  let I = intersection(b[nn], b[n]);
                  if ( I[0][0] < I[0][1] &&
                       I[1][0] < I[1][1] &&
                       I[2][0] < I[2][1] ) {
                     S[nn].parentID = S[n].id;
                     computeJointPosition(S[nn], I);
                     S[nn].jointRotation = matrix_identity();
                     if (S[nn].symmetry)
                        createMirrorJoint(nn);
                     break;
                  }
               }
            }
            nameBipedParts();
         }
      }
   }

   let mirror = () => {
         if (S.length > 0) {                   // CHANGE MIRROR SYMMETRY
            saveForUndo();
            let n1 = ns(),
                s1 = S[n1];
            switch (s1.symmetry) {
            case 0:                            // CREATE MIRROR SYMMETRY
               let d = s1.M[12] < 0 ? 1 : 0;
               s1.symmetry = 2 - d;
               let s2 = {
                  M: s1.M.slice(),
                  color: s1.color,
                  id: uniqueID(),
                  isBlobby: s1.isBlobby,
                  isColored: s1.isColored,
                  rounded: s1.rounded,
                  sign: s1.sign,
                  symmetry: 1 + d,
                  texture: s1.texture,
                  form: s1.form,
               };
               s2.M[12] = -s1.M[12];
               computeQuadric(s2);
               insertBlob(n1 + d, s2);
               if (s1.jointPosition)
                  createMirrorJoint(n1 + 1 - d);
               break;
            case 1:                            // REMOVE MIRROR SYMMETRY
               s1.symmetry = 0;
               deleteBlob(n1+1);
               break;
            case 2:
               s1.symmetry = 0;
               deleteBlob(n1-1);
               break;
            }
         }
   }

   let createMirrorJoint = n1 => {
      let n2 = S[n1].symmetry==1 ? n1+1 : n1-1,
          s1 = S[n1],
          s2 = S[n2];
      s2.jointPosition = [-s1.jointPosition[0],
                           s1.jointPosition[1],
                           s1.jointPosition[2]];
      s2.parentID = s1.parentID;
      s2.jointRotation = matrix_identity();
      if (parent(s1) && parent(s1).symmetry) {
         let n = findBlobIndex(parent(s1));
         n += parent(s1).symmetry == 1 ? 1 : -1;
         s2.parentID = S[n].id;
      }
   }

   let setDepthToMaxOfWidthAndHeight = s => {
      let M = s.M;
      let x = norm(M.slice(0, 3));
      let y = norm(M.slice(4, 7));
      let z = norm(M.slice(8,11));
      s.M = matrix_multiply(M, matrix_scale(1, 1, Math.max(x,y)/z));
   }

   // RESPOND TO MOUSE/CURSOR EVENTS

   canvas.onPress = (x,y) => {
      isPressed = true;
      xyTravel = 0;
   }

   canvas.onDrag = (x,y) => {
      if (mn >= 0) {
         if (isLengthening) {
            let isTranslatingSave = isTranslating;
            let isScalingSave = isScaling;

            isTranslating = false;
            isScaling = true;
            transform(mn, 0, 0, y - yPrev);

            isTranslating = isTranslatingSave;
            isScaling = isScalingSave;
         }
         else
            transform(mn, x - xPrev, y - yPrev, 0);
      }

      xyTravel += Math.abs(x - xPrev) + Math.abs(y - yPrev);
      xPrev = x;
      yPrev = y;
   }
   
   canvas.onRelease = (x,y) => {
      isPressed = false;
      switch (keyChar) {
      case 'A':
      case 'B':
      case 'D':
      case 'X':
      case 'Y':
      case 'Z':
         createEnd();                      // ADD A BLOB
         break;

      case 'L':
         isLengthening = false;
         break;

      case 'R':
      case 'S':
      case 'T':
      case 'U':
         isRotating = isScaling = isTranslating = isUniformScaling = false;
         if (mn >= 0 && keyChar == 'T') {
            handleJoint(mn);
            for (let n = 0 ; n < S.length ; n++)
               if (S[n].parentID == S[mn].id)
                  handleJoint(n);
         }
         activeSet(false);
         break;
      }
      keyChar = null;
   }

   canvas.onMove = (x,y) => {
      if (isModeler && model._children.length > 0)
         return;

      if (isCreating)
         createDrag(x, y);
      else if (mn >= 0 && (isRotating || isScaling || isTranslating || isUniformScaling))
         transform(mn, x - xPrev, y - yPrev, 0);
      else if (mn >= 0 && isLengthening) {
         isTranslating = true;
         transform(mn, 0, 0, y - yPrev);
         isTranslating = false;
         isScaling = true;
         transform(mn, 0, 0, y - yPrev);
         handleJoint(mn);
         isScaling = false;
      }
      else
         findActiveBlob(x, y);

      xPrev = x;
      yPrev = y;
   }
   
   // RESPOND TO THE KEYBOARD

   canvas.onKeyPress = (key, event) => {
      if (!justPressed && ! isShowingCode && window.interactMode == 1) {
         justPressed = true;
         this.onKeyDown(key, event);
      }
   }

   this.onKeyDown = (key, event) => {

      if (key != keyPressed) {
         switch (key) {
         case 16:
            isShift = true;
            return;
         case 17:
            isControl = true;
            return;
         case 18:
            isAlt = true;
            return;
         case 189: // '-'
            if (isRubber)
               flash = true;
            return;
         }

         if (isControl)
            return;

         if (! enableModeling && model.onKeyDown)
            model.onKeyDown(event.key);

         if (! enableModeling)
        return;

         //---- EVERYTHING BELOW IS IS FOR KEY RESPONSES IN THE INTERACTIVE CLAY MODELER

         switch (String.fromCharCode(key)) {
         case 'A':
         case 'B':
         case 'D':
         case 'X':
         case 'Y':
         case 'Z':
            if (isRubber)
               flash = true;
            break;
         }
      }
      keyPressed = key;
   }

   let ns = () => mn >= 0 ? mn : S.length - 1;

   canvas.onKeyRelease = (key, event) => {
      if (justPressed && ! isShowingCode && window.interactMode == 1) {
         this.onKeyUp(key, event);
         justPressed = false;
      }
   }

   this.onKeyUp = (key, event) => {

      flash = false;
      keyPressed = -1;

      isRotating = isScaling = isTranslating = isUniformScaling = false;
      let ch = String.fromCharCode(key);
      keyChar = ch;

      if (event.ctrlKey)
         model._doControlAction(event.key);

      isControl = false;

      // USE SHIFT + ARROW KEY TO ROTATE THE VIEW OF THE MODEL

      if (isShift)
         switch (key) {
         case 37: rotateyState--; return; // LEFT  ARROW ROTATES LEFT
         case 38: rotatexState++; return; // UP    ARROW ROTATES UP
         case 39: rotateyState++; return; // RIGHT ARROW ROTATES RIGHT
         case 40: rotatexState--; return; // DOWN  ARROW ROTATES DOWN
         }

      if (! enableModeling && ! event.ctrlKey) {
         model.keyQueue.push(event.key);
     if (model.onKeyUp)
            model.onKeyUp(ch);
      }

      if (! enableModeling)
         return;

      //---- EVERYTHING BELOW IS IS FOR KEY RESPONSES IN THE INTERACTIVE CLAY MODELER

      // TYPE 0-9 TO SET BLOB COLOR

      if (S.length > 0 && ch >= '0' && ch <= '9') {
         saveForUndo();
         let color = 'color' + (key - 48) + (isLightColor ? 'l' : '');

         // SET COLOR OVER BACKGROUND TO COLOR ALL UNCOLORED BLOBS.

         if (mn < 0) {
            defaultColor = color;
            for (let n = 0 ; n < S.length ; n++)
               if (! S[n].isColored)
                  S[n].color = defaultColor;
         }

         // SET COLOR OVER A BLOB TO EXPLICITLY COLOR IT.

         else {
            let sym = S[ns()].symmetry ? 1 : 0;
            for (let i = 0 ; i <= sym ; i++) {
               S[I(ns())+i].color = color;
               S[I(ns())+i].isColored = true;
            }
         }

         isLightColor = false;
         return;
      }

      switch (key) {
      case 8: // DELETE
         if (isRubber)
            break;
         if (S.length > 0) {
            saveForUndo();
            deleteSelectedBlob();            // DELETE THE SELECTED BLOB
         }
         break;
      case 16:
         isShift = false;
         break;
      case 17:
         isControl = false;
         break;
      case 18:
         modelMatrix = matrix_translate(0,0,0);
         mn = findBlob(xPrev, yPrev);
         isAlt = false;
         break;
      case 27:
         this.setShowingCode(true);          // ESC TO SHOW/HIDE CODE EDITOR
         break;
      case 187: // '='
         if (S.length > 0) {
            saveForUndo();
            let sym = S[ns()].symmetry ? 1 : 0;
            for (let i = 0 ; i <= sym ; i++)
               setDepthToMaxOfWidthAndHeight(S[I(ns())+i]);
            activeSet(true);
         }
         return;
      case 189: // '-'
         if (isRubber)
            break;
         if (S.length > 0) {               // MAKE NEGATIVE
            saveForUndo();
            let sym = S[ns()].symmetry ? 1 : 0;
            for (let i = 0 ; i <= sym ; i++)
               S[I(ns())+i].sign = -S[I(ns())+i].sign;
            activeSet(true);
         }
         break;
      case 190: // '.'
         if (S.length > 0) {               // TOGGLE IS BLOBBY
            saveForUndo();
            let sym = S[ns()].symmetry ? 1 : 0;
            for (let i = 0 ; i <= sym ; i++)
               S[I(ns())+i].isBlobby = ! S[I(ns())+i].isBlobby;
            activeSet(true);
         }
         break;
      case 191: // '/'
         isRubber = ! isRubber;
         break;
      case 192: // '`'
         isLightColor = ! isLightColor;    // LIGHT COLOR
         break;
      case 219: // '['
         saveForUndo();
         if (S.length > 0) {
            isTranslating = true;
            transform(ns(), 0,0,-.05);     // AWAY
            isTranslating = false;
         }
         break;
      case 220: // '\'
         saveForUndo();
         isCentering     = false;
         isMirroring     = false;
         isRubber        = false;
         isShowingJoints = false;
         isWalking       = false;
         isWiggling      = false;
         textureState      = 0;
         rotatexState    = 0;
         rotateyState    = 0;
         S = [];                           // DELETE ALL BLOBS
         mn = -1;
         activeSet(true);
         break;
      case 221: // ']'
         saveForUndo();
         if (S.length > 0) {
            isTranslating = true;
            transform(ns(), 0,0,.05);      // FORWARD
            isTranslating = false;
         }
         break;
      }

      if (isControl) {
         switch (ch) {
         case 'Y':
            redo();
            break;
         case 'Z':
            undo();
            break;
         default:
            model._doControlAction(ch);
            break;
         }
         return;
      }

      if (isShift) {
         switch (ch) {
         case 'B':
            isShowingBounds = ! isShowingBounds;
            break;
         case 'E':
            displacementTextureType = (displacementTextureType + 1) % 3;
            activeSet(true);
            break;
         case 'F':
            isFewerDivs = ! isFewerDivs;
            break;
         case 'I':
            isTextureSrc = ! isTextureSrc;
            break;
         case 'M':
            isModeler = ! isModeler;
            if (! isModeler) {
               S = [];
               initMaterials();
               frameCount = 0;
            }
            else
               activeSet(true);
            break;
         case 'N':
            isFaceted = ! isFaceted;
            break;
         case 'Q':
            console.log(JSON.stringify(saveFunction()));
            break;
         case 'T':
            isTexture = ! isTexture;
            this.setShowingCode(isShowingCode);
            isNewTextureCode = true;
            break;
         case 'V':
            isRotatedView = ! isRotatedView;
            break;
         case 'X':
            isExperiment = true;
            break;
         }
         return;
      }

      switch (ch) {
      case 'A':
      case 'B':
      case 'D':
      case 'X':
      case 'Y':
      case 'Z':
         if (! isRubber && ! isCreating) {
            saveForUndo();
            createBegin(xPrev, yPrev);
            if (ch == 'A') S[mn].form = 'sphere';
            if (ch == 'B') S[mn].form = 'cube';
            if (ch == 'D') S[mn].form = 'donut';
            if (ch == 'X') S[mn].form = 'tubeX';
            if (ch == 'Y') S[mn].form = 'tubeY';
            if (ch == 'Z') S[mn].form = 'tubeZ';
            isCreating = true;
         }
         break;

      case 'C':
         if (mn >= 0 && S[mn] && S[mn].M) {
            saveForUndo();
            S[mn].M[12] = 0;                    // CENTER BLOB AT CURSOR
            computeQuadric(S[mn]);
         }
         else                                   // BUT IF OVER BACKGROUND
            isCentering = ! isCentering;        // TOGGLE CENTERING MODE
         break;
      case 'F':
         textureState = textureState == 4 ? 0 : 4;
         break;
      case 'G':
         isWalking = ! isWalking;
         break;
      case 'H':
         textureState = textureState == 5 ? 0 : 5;
         break;
      case 'I':
         // html.helpWindow1.style.zIndex = 1 - html.helpWindow1.style.zIndex;
         // html.helpWindow2.style.zIndex = 1 - html.helpWindow2.style.zIndex;
         break;
      case 'J':
         isShowingJoints = ! isShowingJoints;
         break;
      case 'K':
         if (S.length > 0) {                    // BLUR EDGES
            saveForUndo();
            S[ns()].rounded = ! S[ns()].rounded;
            activeSet(true);
         }
         break;
      case 'L':
         isLengthening = true;
         break;
      case 'M':
         isMirroring = ! isMirroring;
         break;
      case 'N':
         textureState = textureState == 1 ? 0 : 1;
         break;
      case 'O':
         // if (isShift)
         //    projectManager.clearAll();        // CLEAR ALL PROJECT DATA
         // else
         //    projectManager.clearNames();      // CLEAR PROJECT NAMES
         activeSet(true);
         break;
      case 'P':
         projectManager.choice(loadFunction); // USER CHOOSES PROJECT
         break;
      case 'Q':
         textureState = textureState == 2 ? 0 : 2;
         break;
      case 'R':
         saveForUndo();
         isRotating = true;
         break;
      case 'S':
         saveForUndo();
         isScaling = true;
         break;
      case 'T':
         saveForUndo();
         isTranslating = true;
         break;
      case 'U':
         saveForUndo();
         isUniformScaling = true;
         break;
      case 'V':
         textureState = textureState == 3 ? 0 : 3;
         break;
      case 'W':
         isWiggling = ! isWiggling;
         break;
      }
   }

// PREDEFINED PROCEDURAL TEXTURES

let textureIndex = 0;

let textures = [
``
,
`// NOISE

density += 2 * noise(7*x,7*y,7*z + time) - 1`
,
`// SUBTLE NOISE

density += .5 * (noise(7*x,7*y,7*z + time) - .3)`
,
`// ERODED

for (let s = 4 ; s < 16 ; s *= 2) {
   let u = max(0, noise(density*7*x,
                        density*7*y,
                        density*7*z));
   density -= 16 * u * u / s;
}`    
,
`// LEAFY

f = 7;
for (let s = 4*f ; s < 64*f ; s *= 2)
   density += (noise(s*x,s*y,s*z) - .3)  * f/s;` 
,
`// ROCK

for (let s = 3 ; s < 100 ; s *= 2)
   density += (noise(s*x,s*y,s*z) - .3) / s;`
];    
   
}

//////////////////////////////////////////////////////////////////////////////////////////////
////////////// GIVE PROGRAMMERS THE OPTION TO BUILD AND ANIMATE THEIR OWN MODEL. /////////////
//////////////////////////////////////////////////////////////////////////////////////////////

let wasInteractMode = true;

function Node(_form) {
   let id = uniqueID(),
       m = new Matrix(),
       form = _form,
       previousTime,
       rm;

   this._form = _form;

   this.toObj = n => {
      let s = '', V;
      let tri = (a,b,c) => s += 'f ' + ' ' + (n+a) + ' ' + (n+b) + ' ' + (n+c) + '\n';
      let quad = (a,b,c,d) => { tri(a,b,c); tri(b,d,c); }
      let addVertices = node => {
	 let printVertices = () => {
            let m = node.getGlobalMatrix();
            let r = t => (10000 * t >> 0) / 10;
	    for (let i = 0 ; i < V.length ; i++) {
	       let v = cg.mTransform(m, V[i]);
	       s += 'v ' + r(v[0]) + ' ' + r(v[1]) + ' ' + r(v[2]) + '\n';
            }
	 }
         switch (node._form) {
	 case 'cube':
	    V = [[-1,-1,-1],[ 1,-1,-1], [-1, 1,-1],[ 1, 1,-1],
	         [-1,-1, 1],[ 1,-1, 1], [-1, 1, 1],[ 1, 1, 1]];
            printVertices();
	    quad(0,4,2,6); quad(7,5,3,1);
	    quad(0,1,4,5); quad(7,3,6,2);
	    quad(0,2,1,3); quad(7,6,5,4);
	    n += 8;
	    break;
	 case 'tubeY':
	    V = [[0,-1,0],[0,1,0]];
	    for (let i = 0 ; i < 32 ; i++) {
	       let a = 2*Math.PI * i/32, c = Math.cos(a), s = Math.sin(a);
	       V.push([s,-1,c], [s,1,c]);
	    }
	    printVertices();
	    for (let i = 0 ; i < 64 ; i += 2) {
	       tri(0,2+(i+2)%64,2+i);
	       tri(1,2+i+1,2+(i+3)%64);
	       quad(2+i,2+(i+2)%64,2+i+1,2+(i+3)%64);
            }
            n += 66;
	    break;
	 case 'coneY':
	    V = [[0,-1,0],[0,1,0]];
	    for (let i = 0 ; i < 32 ; i++) {
	       let a = 2*Math.PI * i/32, c = Math.cos(a), s = Math.sin(a);
	       V.push([s,-1,c]);
	    }
	    printVertices();
	    for (let i = 0 ; i < 32 ; i++) {
	       tri(0,2+(i+1)%32,2+i);
	       tri(1,2+i,2+(i+1)%32);
	    }
            n += 34;
	    break;
	 case 'pyramidY':
	    V = [[0,-1,0],[0,1,0]];
	    for (let i = 0 ; i < 4 ; i++) {
	       let a = 2*Math.PI * (i+.5)/4, c = Math.cos(a), s = Math.sin(a);
	       V.push([s,-1,c]);
	    }
	    printVertices();
	    for (let i = 0 ; i < 4 ; i++) {
	       tri(0,2+(i+1)%4,2+i);
	       tri(1,2+i,2+(i+1)%4);
	    }
            n += 6;
	    break;
         default:
	    V = [];
	    let mesh = clay.formMesh(this._form);
	    if (mesh) {
	       for (let i = 0 ; i < mesh.length ; i += 16)
	          V.push(mesh.slice(i, i+3));
               printVertices();
	       let nv = V.length;
               for (let i = 0 ; i < V.length - 2 ; i += 2) {
	          let i2 = Math.min(nv-1,i+2);
	          let i3 = Math.min(nv-1,i+3);
	          tri(i , i+1, i2);
	          tri(i2, i+1, i3);
	       }
            }
	    n += V.length;
	    break;
         }
         for (let n = 0 ; n < node.nChildren() ; n++)
	    addVertices(node.child(n));
      }
      addVertices(this);
      return {n:n, s:s};
   }

   this.initDataTree = (node) => {
      let childJson = [];
      if(node._children && node._children.length > 0) {
         for(let i = 0; i < node._children.length; i ++) {
            childJson.push(node.child(i).dataTree);
            console.log("added kid")
         }
      }
      let dataTree = {
         form: node._form,
         bevel: node._bevel,
         blend: node._blend,
         view: node._view,
         blur: node._blur,
         opacity: node._opacity,
         color: node._color,
         dull: node._dull,
         info: node._info,
         melt: node._melt,
         children: childJson,
         precision: node._precision,
         flags: node._flags,
         isHUD: node._isHUD,
         animate: node._animate,
         update: node._update,
         customShader: node._customShader,
         texture: node._texture,
         bumpTexture: node._bumpTexture,
         ignoreParentTransform: node.ignoreParentTransform,
      }
      return dataTree;
   }

   this.dataTree = this.initDataTree(this);
   
   this.setControls = () => {
      let messages = document.getElementById("messages");
      if (! messages)
         return;
      if (interactMode != wasInteractMode) {
         messages.innerHTML = '<button onclick="interactMode=!interactMode">mode</button>';
         if (interactMode) {
            let message = ' controls: ';
            for (let ch in this._controlActions)
               message += '<button onclick=controlAction("' + ch + '")>' + ch + '</button>';
            messages.innerHTML += message;
         }
         wasInteractMode = interactMode;
      }
   }

   this.resetControls = () => {
      let messages = document.getElementById("messages");
      if (! messages)
         return;
      messages.innerHTML = '<button onclick="interactMode=!interactMode">mode</button>';
      if (interactMode) {
         let message = ' control keys: ';
         for (let ch in this._controlActions)
            message += '<button onclick=controlAction("' + ch + '")>' + ch + '</button>';
         messages.innerHTML += message;
      }
      wasInteractMode = false;
   }

   this.clear = () => {
      previousTime = 0;
      rm = matrix_identity;
      this._update   = null;
      this._animate  = null;
      this._bevel    = false;
      this._blend    = false;
      this._view     = -1;
      this._blur     = .5;
      this._opacity  = 1;
      this._children = [];
      this._color    = [1,1,1];
      this._dull     = false;
      this._info     = '';
      this._melt     = false;
      this._texture  = '';
      this._bumpTexture  = '';
      this._precision = 1;
      this._flags    = {};
      this._customShader = '';
      this._isHUD    = false;
      this._audioIdx = null;
      m.identity();
      this._controlActions = {};
      this.resetControls();
      implicitSurface.remesh();
      rotatex = rotatey = rotatexState = rotateyState = 0;
      modelMatrix = matrix_identity();
      return this;
   }

   this._parent = null;
   this.clear();

   this.child = i => this._children[i];

   this.parent = () => this._parent;

   this.prop = name => this[name] != null ? this[name] : this._parent.prop(name);

   this._controlActions = {};

   this._doControlAction = ch => {
      if (this._controlActions[ch] && justPressed) {
         this._controlActions[ch].func();
      }
   }

   this.control = (ch, label, func) => this._controlActions[ch] = { label: label, func: func };

   this.add = (form) => {
      let child = new Node(form);
      this._children.push(child);
      child._bevel  = null;
      child._blend  = null;
      child._view   = null;
      child._blur   = null;
      child._opacity= null;
      child._color  = null;
      child._dull   = null;
      child._info   = null;
      child._melt   = null;
      child._parent = this;
      child._precision = null;
      child._flags  = null;
      child._customShader = null;
      this.dataTree.children.push(child.dataTree);
      // this.dataTree.children.add(childJson);
      return child;
   }

   this.printDataTree = () => {
      console.log(this.dataTree);
   }

   this.remove = arg => { // ARG CAN BE EITHER AN INDEX OR A CHILD NODE
      let i = arg;
      if (! Number.isInteger(i))
         for (i = 0 ; i < this._children.length ; i++)
            if (arg == this._children[i])
          break;
      if (i >= 0 && i < this._children.length)
    this._children.splice(i, 1);
      return this;
   }
   this.nChildren = ()      => { return this._children.length;      }
   this.update    = func    => { this._update  = func; return this; }
   this.animate   = func    => { this._animate = func; return this; }
   this.identity  = ()      => { m.identity();         return this; }
   this.aimX      = vec     => { m.aimX(vec);          return this; }
   this.aimY      = vec     => { m.aimY(vec);          return this; }
   this.aimZ      = vec     => { m.aimZ(vec);          return this; }
   this.move      = (x,y,z) => { m.translate(x,y,z);   return this; }
   this.getForm   = ()      => this._form;
   this.get       = prop    => { return this.prop('_' + prop);      }
   this.getX      = ()      => this.getMatrix().slice( 0,  3);
   this.getY      = ()      => this.getMatrix().slice( 4,  7);
   this.getZ      = ()      => this.getMatrix().slice( 8, 11);
   this.getO      = ()      => this.getMatrix().slice(12, 15);
   this.getMatrix = ()      => { return m.getValue();               }
   this.setMatrix = value   => { m.setValue(value);    return this; }
   this.getMeshInfo = ()    => { return implicitSurface.meshInfo(); }
   this.setTable  = tf      => { isTable = tf;         return this; }
   this.setRoom   = tf      => { isRoom = tf;          return this; }
   this.getDivs   = ()      => { return implicitSurface.divs();     }
   this.placeLimb = (a,b,radius) => {
      let c = mix(a,b, .5,.5);
      let d = mix(a,b,-.5,.5);
      this.identity().move(c).aimZ(d).scale(radius,radius,norm(d));
   }
   this.turnX     = theta   => { m.rotateX(theta);     return this; }
   this.turnY     = theta   => { m.rotateY(theta);     return this; }
   this.turnZ     = theta   => { m.rotateZ(theta);     return this; }
   this.scale     = (x,y,z) => { m.scale(x,y,z);       return this; }
   this.project   = (x,y,z) => { m.project(x,y,z);     return this; }
   this.dull      = value   => { this._dull = cg.def(value, 1); return this; }
   this.metal     = (r,g,b) => this.color(r,g,b);
   this.color     = (r,g,b) => { 
      this._color = typeof r === 'string' || Array.isArray(r) ? r : [r,g,b]; 
      this.dataTree.color = this._color;
      return this; 
   }
   this.view      = value   => { this._view = value;   return this; }
   this.blur      = value   => { this._blur = value;   return this; }
   this.opacity   = value   => { this._opacity = value;return this; }
   this.info      = value   => { if (this.prop('_blend') && this._info != value) activeSet(true);
                                this._info = value;    return this; }
   this.getInfo   = ()      => { return this._info; }
   this.texture   = src     => { this._texture = src;  return this; }
   this.bumpTexture = src   => { this._bumpTexture = src; return this; }
   this.bevel     = tf      => { this._bevel = tf === undefined ? true : tf; return this; }
   this.blend     = tf      => { if (this._blend != tf) activeSet(true);
                                this._blend = tf === undefined ? false : tf; return this; }
   this.melt      = tf      => { this._melt  = tf === undefined ? true : tf; return this; }
   this.precision = value   => { this._precision = value; return this; }
   this.getGlobalMatrix = () => {
      let M = this.getMatrix();
      for (let node = this._parent ; node ; node = node._parent)
         M = cg.mMultiply(node.getMatrix(), M);
      return M;
   }

   this.getGlobalPos = () => {
      let globalMat = this.getGlobalMatrix();
      return [globalMat[12], globalMat[13], globalMat[14]];
   }

   this.addAudio = idx => {
      this._audioIdx = idx;
      console.log("clay add audio" + this._audioIdx)
      return this;
   }

   this.playAudio = () => {
      audio.updatePosition(this._audioIdx, this.getGlobalPos());
      audio.playSound(this._audioIdx);
      return this;
   }

   this.stopAudio = () => {
      audio.stopSound(this._audioIdx);
      return this;
   }

   this.getMatrixFromRoot = () => {
      let M = this.getMatrix();
      for (let node = this._parent ; node != root ; node = node._parent)
         M = cg.mMultiply(node.getMatrix(), M);
      return M;
   }
   this.flag = (name, value)  => {
      if (value === undefined) value = 1;
      if (value) {
         if (this._flags == null)
            this._flags = {};
         this._flags[name] = true;
      }
      else if (this._flags)
         delete this._flags[name];
      return this;
   }
   this.customShader = value => { 
      if (window.customShader != value)
         window.clay.clayPgm.program = null;
      window.customShader = value; 
      return this; 
   }

   this.label = label => { this._label = label; return this; }
   this.getLabel = () => this._label

   this.setVertices = f => setVertices(clay.formMesh(this._form), f);

   let mergedCounter = 0;

   this.newForm = form => {
      let vertices = [];
      let addVertices = (obj, M) => {
	 M = cg.mMultiply(M, obj.getMatrix());
	 let mesh = clay.formMesh(obj._form);
	 if (mesh) {
	    let TIM = cg.mTranspose(cg.mInverse(M));
	    TIM[12] = TIM[13] = TIM[14] = 0;
	    let color = obj._color ? obj._color : [1,1,1];
	    let V = [];
	    for (let n = 0 ; n < mesh.length ; n += 16) {
               let pos = mesh.slice(n+0, n+ 3);
               let nt  = mesh.slice(n+3, n+ 6);
               let uv  = mesh.slice(n+6, n+ 8);
               let col = mesh.slice(n+8, n+ 9);
               let wts = mesh.slice(n+9, n+15);
               pos = cg.mTransform(M, pos);
               let X = unpackAB(nt[0]), Y = unpackAB(nt[1]), Z = unpackAB(nt[2]);
               let nor = cg.normalize(cg.mTransform(TIM, [ X[0],Y[0],Z[0] ]));
               let tan = cg.mTransform(TIM, [ X[1],Y[1],Z[1] ]);
               let rgb = unpackRGB(col[0]);
	       if (Array.isArray(color))
                  rgb = [ color[0] * rgb[0], color[1] * rgb[1], color[2] * rgb[2] ];
               V.push(vertexArray(pos, nor, tan, uv, rgb, wts));
	       let v = V[V.length-1];
	    }
            if (vertices.length > 0)
	       vertices.push(vertices[vertices.length-1], V[0]);
            for (let i = 0 ; i < V.length ; i++)
	       vertices.push(V[i]);
	 }
	 for (let n = 0 ; n < obj.nChildren() ; n++)
	    addVertices(obj.child(n), M);
      }
      addVertices(this, cg.mIdentity());
      setFormMesh(form, new Float32Array(vertices.flat()));
   }

   this.merge = () => {
      let getMesh = obj => {
         let vertices = [];
	 let mesh = clay.formMesh(obj._form);
	 let M = obj.getMatrix();
	 let TIM = cg.mTranspose(cg.mInverse(M));
	 for (let n = 0 ; n < mesh.length ; n += 16) {
	    let v = mesh.slice(n, n + 16);
	    let P = cg.mTransform(M, [v[0],v[1],v[2]]);
	    let N = cg.mTransform(TIM, [v[3],v[4],v[5],0]);
	    vertices.push(P[0],P[1],P[2],
	                  N[0],N[1],N[2],
	                  v[6],v[7],
			  v[8],v[9],v[10],
			  v[11],v[12],v[13],v[14],v[15]);
	 }
	 return new Float32Array(vertices.flat());
      }

      let mergedMesh = getMesh(this.child(0));
      for (let i = 1 ; i < this.nChildren() ; i++)
         mergedMesh = glueMeshes(mergedMesh, getMesh(this.child(i)));

      let name = 'merged' + mergedCounter++;
      clay.defineMesh(name, mergedMesh);
      this._form = name;

      while (this.nChildren() > 0)
         this.remove(0);

      return this;
   }

   this.hud = changeY => {
      this._isHUD = true;
      let m = cg.mMultiply(clay.inverseRootMatrix, this.inverseViewMatrix());
      let Y = [0,1,0];
      let Z = m.slice(8,11);
      let X = cg.normalize(cg.cross(Y,Z));
      if (changeY)
         Y = cg.normalize(cg.cross(Z,X));
      m = [ X[0],X[1],X[2],0, Y[0],Y[1],Y[2],0, Z[0],Z[1],Z[2],0, m[12],m[13],m[14],1 ];
      this.setMatrix(m);
      this.move(0,0,-1).scale(1 / (window.vr ? 2 : fl));
      return this;
   }

   this.share = () => {
      window.mySharedObj.push(this.getJson());
      return this;
   }
   this.faceViewer = () => {
      let worldOrigin = matrix => cg.mTransform(clay.inverseRootMatrix, matrix.slice(12,15));
      let Z = cg.normalize(cg.subtract(worldOrigin(clay.root().inverseViewMatrix(0)),
                                       worldOrigin(this.getGlobalMatrix())));
      let X = cg.normalize(cg.cross([0,1,0], Z));
      let m = this.getMatrix();
      this.setMatrix([ X[0],X[1],X[2],0, 0,1,0,0, Z[0],Z[1],Z[2],0, m[12],m[13],m[14],1 ]);
      return this;
   }
   this.billboard = () => {
      if (this.nChildren() == 0)
         this.add('cubeXZ');
      let worldOrigin = matrix => cg.mTransform(clay.inverseRootMatrix, matrix.slice(12,15));
      let Z = cg.normalize(cg.subtract(worldOrigin(clay.root().inverseViewMatrix(0)),
                                       worldOrigin(this.getGlobalMatrix())));
      let X = cg.normalize(cg.cross([0,1,0], Z));
      this.child(0).setMatrix([ X[0],X[1],X[2],0, 0,1,0,0, Z[0],Z[1],Z[2],0, 0,0,0,1 ]).scale(1,1,.001);
      return this;
   }
   this.link = (a,b,r) => this.move(cg.mix(a,b,.5))
                              .aimZ(cg.subtract(b,a))
	                      .scale(r,r,cg.distance(a,b)/2);
   this.text = (text, textHeight) => {
      textHeight = cg.def(textHeight, .1);
      if (this.nChildren() == 0)
         this.add('cubeXZ');
      let lines = 0;
      for (let n = 0 ; n < text.length ; n++)
         if (text.charAt(n) == '\n')
	    lines++;
      this.child(0).color(10,10,10).texture(() => {
         g2.setColor('white');
         g2.textHeight(textHeight);
         g2.fillText(text, .5, .5 + .5 * lines * textHeight, 'center');
      });
      return this;
   }
   this.createAxes = (al, r) => {
      al = cg.def(al, 1);
      r  = cg.def(r, .01);
      let axes = this.add().color(10,10,10);
      axes.add('tubeX').move(al/2,0,0).scale(al/2,r,r);
      axes.add('tubeY').move(0,al/2,0).scale(r,al/2,r);
      axes.add('tubeZ').move(0,0,al/2).scale(r,r,al/2);
      axes.add('coneX').move(al,0,0).scale(3*r,4*r,4*r);
      axes.add('coneY').move(0,al,0).scale(4*r,3*r,4*r);
      axes.add('coneZ').move(0,0,al).scale(4*r,4*r,3*r);
      return axes;
   }
   this.setParticles = (data, orient) => {
      let mesh = clay.formMesh('particles,' + this.getInfo());
      if (mesh) {
         mesh.particleData = data;
         mesh.orient = orient;
      }
   }

   this.renderDots = (data, radius) => {
      radius = cg.def(radius, 0.1);
      let N = data.length;
      let form = 'dots' + N;

      if (! clay.formMesh(form)) {
         let vertexData = [];
         for (let n = 0 ; n < N ; n++)
            for (let i = 0 ; i < 3 ; i++)
               vertexData.push([ 0,0,0, 0,0,0, (i==1?1:0), (i==2?1:0) ]);
         clay.defineMesh(form, clay.trianglesMesh(vertexData));
      }
      this._form = form;
      this.flag('uTriangleDisk');

      let vm = cg.mMultiply(clay.inverseRootMatrix, clay.root().inverseViewMatrix(0));
      let X = vm.slice(0,3);
      let Y = vm.slice(4,7);
      let Z = vm.slice(8,11);

      let D = [[0,0,0], [0,0,0], [0,0,0]];
      for (let i = 0 ; i < 3 ; i++) {
         let c = radius * Math.cos(2 * Math.PI * i / 3);
         let s = radius * Math.sin(2 * Math.PI * i / 3);
         for (let j = 0 ; j < 3 ; j++)
            D[i][j] = c * X[j] + s * Y[j];
      }

      let mesh = clay.getMesh(form);
      for (let n = 0 ; n < 3*N ; n++)
         for (let j = 0 ; j < 3 ; j++) {
            mesh[16*n   + j] = data[n/3>>0][j] + D[n%3][j];
            mesh[16*n+3 + j] = Z[j];
         }
      return this;
   }

   this.framedPicture = (w,h,t,source) => {
      let picture = this.add();
      picture.add('cube').move(0,-h/2-2*t,  .6*t).scale(w/2+2*t,t,.6*t).color(.2,.1,.05);
      picture.add('cube').move(0, h/2+2*t,  .6*t).scale(w/2+2*t,t,.6*t).color(.2,.1,.05);
      picture.add('cube').move(-w/2-2*t, 0, .6*t).scale(t,h/2+3*t,.6*t).color(.2,.1,.05);
      picture.add('cube').move( w/2+2*t, 0, .6*t).scale(t,h/2+3*t,.6*t).color(.2,.1,.05);
      picture.add('cube').move(0,0,-t/100).scale(w/2+t*t,h/2+3*t,t/100).color(.2,.1,.05);
      picture.add('cube').scale(w/2+t,h/2+t,t/1000).dull().color(.5,.45,.4);
      picture.add('cube').move(0,0,t/100).scale(w/2,h/2,t/100).dull().texture(source);
      return picture;
   }

   this.setUniform = (type, name, a, b, c, d, e, f) => {
      let clay = this._clay;
      if (clay) {
         let gl = clay.gl;
         if (clay.clayPgm.program) {
            let program = clay.clayPgm.program.program;
            let loc = clay.clayPgm.program.uniform[name];
            (gl['uniform' + type])(loc, a, b, c, d, e, f);
         }
      }
   }

   this.viewMatrix = n => {
      let view = views[n ? 1 : 0];
      return view ? view._viewMatrix : cg.mIdentity();
   }

   this.inverseViewMatrix = n => cg.mInverse(this.viewMatrix(n));

   window.controlAction = ch => {
      if (model._controlActions[ch]) {
         model._controlActions[ch].func();
         return true;
      }
      return false;
   }

   let ignore = node => {
      if (node.ignore)
         return true;
      let mat = node.getMatrix();
      return mat[0]==0 && mat[1]==0 && mat[2]==0;
   }

   this.evalTextures = () => {
      if (! ignore(this)) {
         if (this._texture)
            ;//console.log('eval texture', this._texture);
         for (let n = 0 ; n < this.nChildren() ; n++)
            this.child(n).evalTextures();
      }
   }

   this.render = pm => {
      if (ignore(this))
         return;

      implicitSurface.setPrecision(this.prop('_precision'));
      let dull = this.prop('_dull');
      let color = this.prop('_color');
      if (Array.isArray(color)) {
         let materialName = '' + id;
	 if (color.length == 10)
            materials[materialName] = { ambient : [ color[0], color[1], color[2] ],
                                        diffuse : [ color[3], color[4], color[5] ],
                                        specular: [ color[6], color[7], color[8], color[9] ] };
	 else
            materials[materialName] = { ambient : [.2*color[0], .2*color[1], .2*color[2] ],
                                        diffuse : [.8*color[0], .8*color[1], .8*color[2] ],
                                        specular: [.9,.9,.9,20] };
         color = materialName;
      }

      if (this._update && window.clientID !== undefined) {    // TO HANDLE SCENE UPDATES BY A WIZARD CLIENT:

         if (window.input_state === undefined)
            window.input_state = [];

         if (clientID != clients[0]) {                        // OTHER CLIENTS JUST BROADCAST THEIR INPUT DATA
            input_state[clientID] = createInput();
            server.broadcastGlobalSlice('input_state', clientID, clientID+1);
         }
         else {                                               // BUT THE WIZARD CLIENT:

            input_state = server.synchronize('input_state');  //    GATHERS INPUT DATA FROM ALL OTHER CLIENTS

            input_state[clientID] = createInput();            //    COMPUTING ITS OWN INPUT DATA SEPARATELY

	    if (window.inputObjects === undefined)            //    THEN CONVERTS INPUT DATA TO API OBJECTS
	       window.inputObjects = [];
            for (id of clients) {
	       if (inputObjects[id] === undefined)
	          inputObjects[id] = new Input();
	       inputObjects[id].update(input_state[id]);
            }

            this._update(inputObjects);                       //    AND FINALLY UPDATES THE SCENE STATE
         }
      }

      if (this._animate) {
         this.time = Date.now() / 1000 - startTime;
         this.deltaTime = previousTime ? this.time - previousTime : 1/30;
         if(window.needUpdateInput)
            inputEvents.update();
         window.needUpdateInput=false;

         if (this.prop('_melt'))
            activeSet(true);
         try {
            this._animate(this);
         } catch (e) {
            console.error("Error in animate()\n", e);
         }
         previousTime = this.time;
      }

      rm = (this.ignoreParentTransform) ? m.getValue() : 
                                          matrix_multiply(pm, m.getValue());
      if (this == model)
         rm = matrix_multiply(rm, modelMatrix);

      if (form == 'root')
         S = [];
      else if (form) {
         let s = {
            view: this.prop('_view'),
            blur: this.prop('_blur'),
            opacity: this.prop('_opacity'),
            color: color,
            dull: dull,
            id: id,
            info: this.prop('_info'),
            isBlobby: this.prop('_blend'),
            isColored: true,
            rounded: this.prop('_bevel'),
            sign: 1,
            symmetry: 0,
            texture: form == 'label' ? DEFAULT_FONT
                                     : this.prop('_texture'),
            bumpTexture: this.prop('_bumpTexture'),
            form: form,
            flags: this.prop('_flags'),
            customShader: this.prop('_customShader'),
            M: matrix_multiply(vmi, rm)
         };
         computeQuadric(s);
         S.push(s);
      }
      for (let i = 0 ; i < this._children.length ; i++)
         this._children[i].render(rm);
   }

   // NOTE(KTR): expose a way to save args for a texture e.g. to mipmap or not (default is yes)
   this.textureWithArgs  = (src, args)  => { this._texture = src; textureConfig.set(this._texture, args); return this; }

   // NOTE: optionally ignore the parent transform
   this.ignoreParentTransform = false;
   this.setIgnoreParentTransform = (state) => { this.ignoreParentTransform = state; return this; };

   this.getJson = () => {
      let json = {
         "id": id,
         "form": this._form,
         "color": this._color == null? [1,1,1] : this._color,
         "matrix": this.getGlobalMatrix(),
      }
      return json;
   }

   this.getHeadsetPose = () => {
      if (this.pose && this.pose.transform) {
         return {
            position: [
               this.pose.transform.position.x,
               this.pose.transform.position.y,
               this.pose.transform.position.z
            ],
            orientation: this.pose.transform.orientation
         };
      }
      return null;
   }
}

// EXPOSE A ROOT NODE FOR EXTERNAL MODELING.

   let root = new Node('root');
   this.root = () => root;
   this.inverseRootMatrix = cg.mIdentity();
   this.vrWidgets = root.add();
   this.peopleBillboards = new PeopleBillboards(root);
   this.handsWidget = new HandsWidget(this.vrWidgets);
   this.controllerWidgets = {
      left : this.vrWidgets.add('sphere').dull(1).scale(0),
      right: this.vrWidgets.add('sphere').dull(1).scale(0),
   };
   let videoScreen1 = root.add('cube').texture('camera').scale(0);
   this.model = root.add();
   let videoScreen2 = root.add('cube').texture('camera').scale(0);
   let anidrawScreen = root.add('cube').texture('anidraw');
   let anidrawSlant = 0;
   let model = this.model;
   let remoteObjRoot = root.add();
   let remoteAvatarRoot = root.add();
   model.keyQueue = [];
   model.spokenCommands = cmds => {
     for (let cmd in cmds)
        if (window.speech.includes(cmd)) {
           cmds[cmd]();
           return;
        }
   }
   model._clay = this;
   let startTime = Date.now() / 1000;
   window.isHeader = true;
   window.isMirrored = true;
   window.isWhitescreen = false;
   window.isVideo = false;
   window.customShader = '';
   window.inputEvents = new InputEvents();
   window.editText = new EditText();
   window.codeEditorObj = root.add();
   window.codeEditor = new CodeEditor(codeEditorObj);

   // NOTE(KTR): Extensions

   // variant of cross() that accepts a destination array (out) and individual value components instead of an array
   let crossComponents = (out, a0,a1,a2, b0,b1,b2) => { out[0] = a1*b2 - a2*b1; out[1] = a2*b0 - a0*b2; out[2] = a0*b1 - a1*b0};
   this.crossComponents = crossComponents;
   // variant of matrix inverse accepting a destination buffer
   let matrix_inverse_w_buffer16 = (src, dst) => {
      let det = 0, cofactor = (c, r) => {
         let s = (i, j) => src[c+i & 3 | (r+j & 3) << 2];

         const s1_1 = s(1,1);
         const s1_2 = s(1,2);
         const s1_3 = s(1,3);
         const s2_2 = s(2,2);
         const s2_3 = s(2,3);
         const s3_2 = s(3,2);
         const s3_3 = s(3,3);

         return (c+r & 1 ? -1 : 1) * ( (s1_1 * (s2_2 * s3_3 - s3_2 * s2_3))
                                    - (s(2,1) * (s1_2 * s3_3 - s3_2 * s1_3))
                                    + (s(3,1) * (s1_2 * s2_3 - s2_2 * s1_3)) );
      }
      for (let n = 0 ; n < 16 ; n++) dst[n] = cofactor(n >> 2, n & 3);
      for (let n = 0 ; n <  4 ; n++) det += src[n] * dst[n << 2];
      for (let n = 0 ; n < 16 ; n++) dst[n] /= det;
      return dst;
   }
   this.matrix_inverse_w_buffer16 = matrix_inverse_w_buffer16;
   Clay.matrix_inverse_w_buffer16 = matrix_inverse_w_buffer16;

   // variant of packRGB that accepts individual color component values instead of an array
   let RGB_C = val => Math.floor(256 * Math.max(0, Math.min(.9999, val))) / 256;
   let packRGBComponents = (r, g, b) => {
      return RGB_C(r) + 256 * RGB_C(g) + 256 * 256 * RGB_C(b);  
   }
   this.packRGBComponents = packRGBComponents;


   let scaleWBuffer = (out, v, s) => { 
      for (let i=0 ; i<v.length ; i++) {
         out[i]= s*v[i];
      }
      return out; 
   }
   let normalizeWBuffer = (out, v) => scaleWBuffer(out, v, 1 / norm(v));
   

   // variant of orthogonalVector() that accepts individual x,y,z instead of an array
   let orthogonalVectorComponents = (x, y, z) => {
      if (x > Math.max(y, z)) {
         let newX = 0;
         let newY = 0;
         let newZ = 1;

         crossComponents(__retBuf, newX, newY, newZ, x, y, z)
         return normalizeWBuffer(__retBuf2, __retBuf);
      } else if (x < Math.min(y, z)) {
         let newX = 0;
         let newY = 0;
         let newZ = -1;

         crossComponents(__retBuf, newX, newY, newZ, x, y, z)
         return normalizeWBuffer(__retBuf2, __retBuf);
      } else if (y > Math.max(z, x)) {
         let newX = 1;
         let newY = 0;
         let newZ = 0;

         crossComponents(__retBuf, newX, newY, newZ, x, y, z)
         return normalizeWBuffer(__retBuf2, __retBuf);
      } else if (y < Math.min(z, x)) {
         let newX = -1;
         let newY = 0;
         let newZ = 0;

         crossComponents(__retBuf, newX, newY, newZ, x, y, z)
         return normalizeWBuffer(__retBuf2, __retBuf);
      } else if (z > Math.max(x, y)) {
         let newX = 0;
         let newY = 1;
         let newZ = 0;

         crossComponents(__retBuf, newX, newY, newZ, x, y, z)
         return normalizeWBuffer(__retBuf2, __retBuf);
      } else {
         let newX = 0;
         let newY = -1;
         let newZ = 0;

         crossComponents(__retBuf, newX, newY, newZ, x, y, z)
         return normalizeWBuffer(__retBuf2, __retBuf);
      }   
   }
   this.orthogonalVectorComponents = orthogonalVectorComponents;



   // variant of vertexArray() that accepts a destination buffer instead of returning a new one, and which also accepts individual
   // values instead of arrays
   let vertexArrayComponents = (dst, dstOff, p0, p1, p2,  n0, n1, n2, uv0=0, uv1=0, r=1, g=1, b=1, wt0=1, wt1=0, wt2=0, wt3=0, wt4=0, wt5=0) => {
      let tan = orthogonalVectorComponents(n0, n1, n2);

      dst[dstOff]     = p0;
      dst[dstOff + 1] = p1;
      dst[dstOff + 2] = p2;
      dst[dstOff + 3] = packAB(n0,tan[0]);
      dst[dstOff + 4] = packAB(n1,tan[1]);
      dst[dstOff + 5] = packAB(n2,tan[2]);
      dst[dstOff + 6] = uv0;
      dst[dstOff + 7] = uv1;
      dst[dstOff + 8] = packRGBComponents(r,g,b);
      dst[dstOff + 9] = wt0;
      dst[dstOff + 10] = wt1;
      dst[dstOff + 11] = wt2;
      dst[dstOff + 12] = wt3;
      dst[dstOff + 13] = wt4;
      dst[dstOff + 14] = wt5;
      dst[dstOff + 15] = 0;
   }
   this.vertexArrayComponents = vertexArrayComponents;
   Clay.vertexArrayComponents = this.vertexArrayComponents;

   // expose a way for the caller to retrieve a previously-defined mesh
   this.getMesh = name => formMesh[name];
   // function for building a triangle mesh and defining it in one go
   this.buildAndDefineMesh = (name, cb) => {
      const builder = this.defaultTriangleMeshBuilder;
      this.defineMesh(name, builder.build(cb));
   }

   // expose culling/non-culling toggle to user
   this.enableCull = () => {
      gl.enable(gl.CULL_FACE);
   }
   this.disableCull = () => {
      gl.disable(gl.CULL_FACE);
   }
   this.enableCull();

   // NOTE(KTR) externalize additions to clay that are somewhat experimental
   // without editing this file
   clayExtensions.init(this, gl, canvas);

   this.createParticlesMesh = createParticlesMesh;

   this.setOwnParticles = (P, S, C, name) => {
      let mesh = clay.formMesh(name);
      if (mesh) {
         mesh.particlePosition = P;
         mesh.particleSize     = S;
         mesh.particleColor    = C;
      }
   }

   let renderParticlesMeshAlphaToCoverage = mesh => {
      let data = mesh.particleData;

      if (! data)
         return;

      let n = mesh.length / (6 * 16);
      let vm = matrix_inverse(this.views[0].viewMatrix);
      let X = vm.slice(0,3);
      let Y = vm.slice(4,7);
      let Z = vm.slice(8,11);

      let setVertex = (j, p, s, c, t, u, v) => {
         let pos = [ p[0] + u * s * X[0] + v * s * Y[0],
                     p[1] + u * s * X[1] + v * s * Y[1],
                     p[2] + u * s * X[2] + v * s * Y[2] ];
         let tu = t[0] + (.5+u) * t[2];
         let tv = t[1] + (.5+v) * t[3];
         let V = vertexArray(pos, Z, null, [tu, 1 - tv], c);
         for (let k = 0 ; k < 16 ; k++)
            mesh[16 * j + k] = V[k];
      }
      for (let i = 0 ; i < n ; i++) {
         let d = data[i];
         let p = d.p;
         let s = d.s ? d.s : .01;
         let c = d.c;
         let t = d.t ? d.t : [0,0,1,1];
         setVertex(6 * i    , p, s, c, t, -.5, -.5);
         setVertex(6 * i + 1, p, s, c, t,  .5, -.5);
         setVertex(6 * i + 2, p, s, c, t, -.5,  .5);
         setVertex(6 * i + 3, p, s, c, t, -.5,  .5);
         setVertex(6 * i + 4, p, s, c, t,  .5, -.5);
         setVertex(6 * i + 5, p, s, c, t,  .5,  .5);
      }
   }

   // lights: directional and point

   let r3 = Math.sqrt(1/3);
   let dLightDirections = [r3,r3,r3, -r3,-r3,-r3];
   let dLightColors     = [.6,.8,1, .4,.3,.2];

   let pLightPositions = [];
   let pLightColors = [];

   this.dLightDirectionsDefault = dLightDirections;
   this.dLightColorsDefault     = dLightColors;
   this.pLightPositionsDefault  = pLightPositions;
   this.pLightColorsDefault     = pLightColors;

   const MAX_D_LIGHTS = 2;
   let dLightCount    = 2;
   const MAX_P_LIGHTS = 2;
   let pLightCount    = 0;

   for (let i = dLightCount; i < MAX_D_LIGHTS; i += 1) {
      dLightDirections.push(0);
      dLightDirections.push(0);
      dLightDirections.push(0);
   }
   for (let i = dLightCount; i < MAX_D_LIGHTS; i += 1) {
      dLightColors.push(0);
      dLightColors.push(0);
      dLightColors.push(0);
   }
   for (let i = pLightCount; i < MAX_P_LIGHTS; i += 1) {
      pLightPositions.push(0);
      pLightPositions.push(0);
      pLightPositions.push(0);
   }
   for (let i = pLightCount; i < MAX_P_LIGHTS; i += 1) {
      pLightColors.push(0);
      pLightColors.push(0);
      pLightColors.push(0);
   }
   const tmp    = [0,0,0];
   const tmpOut = [0,0,0];

   this.setDirectionalLights = (directions, colors, count) => {
      dLightCount = count;
      const buffer = directions;
      const dst = dLightDirections;
      const colorBuffer = dLightColors;

      for (let i = 0; i < count; i += 1) {
         const offset = i * 3;

         tmp[0] = buffer[offset];
         tmp[1] = buffer[offset + 1];
         tmp[2] = buffer[offset + 2];

         normalizeWBuffer(tmpOut, tmp);

         dst[offset]     = tmpOut[0];
         dst[offset + 1] = tmpOut[1];
         dst[offset + 2] = tmpOut[2];
      }


      for (let i = 0; i < count; i += 1) {
         const offset = i * 3;
         colorBuffer[offset    ] = colors[offset];
         colorBuffer[offset + 1] = colors[offset + 1];
         colorBuffer[offset + 2] = colors[offset + 2];
      }
   };
   this.setDirectionalLightsObjs = (lightList) => {
      dLightCount = lightList.length;

      const dst = dLightDirections;
      const colorBuffer = dLightColors;

      let iOff = 0;
      for (let i = 0; i < dLightCount; i += 1) {
         const buffer = lightList[i].direction;
         tmp[0] = buffer[0];
         tmp[1] = buffer[1];
         tmp[2] = buffer[2];

         normalizeWBuffer(tmpOut, tmp);

         dst[iOff]     = tmpOut[0];
         dst[1 + iOff] = tmpOut[1];
         dst[2 + iOff] = tmpOut[2];

         const color = lightList[i].color;
         colorBuffer[iOff]     = color[0];
         colorBuffer[1 + iOff] = color[1];
         colorBuffer[2 + iOff] = color[2];

         iOff += 3;
      }
   }

   this.clearDirectionalLights = () => {
      dLightCount = 0;
      dLightDirections = [];
   }

   this.setPointLights = (positions, colors, count) => {
      pLightCount = count;
      const buffer = positions;
      const dst = pLightPositions;
      const colorBuffer = pLightColors;

      for (let i = 0; i < count; i += 1) {
         const offset = i * 3;

         dst[offset]     = buffer[offset];
         dst[offset + 1] = buffer[offset + 1];
         dst[offset + 2] = buffer[offset + 2];
      }


      for (let i = 0; i < count; i += 1) {
         const offset = i * 3;
         colorBuffer[offset    ] = colors[0];
         colorBuffer[offset + 1] = colors[1];
         colorBuffer[offset + 2] = colors[2];
      }
   };
   this.setPointLightsObjs = (lightList) => {
      pLightCount = lightList.length;

      const dst = pLightPositions;
      const colorBuffer = pLightColors;

      let iOff = 0;
      for (let i = 0; i < pLightCount; i += 1) {
         const buffer = lightList[i].position;
         dst[iOff]     = buffer[0];
         dst[1 + iOff] = buffer[1];
         dst[2 + iOff] = buffer[2];

         const color = lightList[i].color;
         colorBuffer[iOff]     = color[0];
         colorBuffer[1 + iOff] = color[1];
         colorBuffer[2 + iOff] = color[2];

         iOff += 3;
      }
   }

   this.clearPointLights = () => {
      pLightCount     = 0;
      pLightPositions = [];
   }

   this.resetSavedShaderInfo = () => {
      prevMesh             = null;
      prevTextureResource  = null;
      prevTextureBindPoint = -1;
   }
}

// store own names for the primitive topology
Clay.TRIANGLES      = WebGL2RenderingContext.TRIANGLES;
Clay.TRIANGLE_STRIP = WebGL2RenderingContext.TRIANGLE_STRIP;

