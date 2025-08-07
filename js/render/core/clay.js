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
import { G2 } from "../../util/g2.js";
import { videoHandTracker } from "./videoHandTracker.js";
import { ClientStateSharing } from "./clientStateSharing.js";
import * as glUtil from "./gl_util.js"
import * as clayExtensions from "./clay_extensions.js";

import * as wasm from "/js/wasm.js";

import { selfDefinedAvatar } from "./myAvatar.js";

import * as sync from "/js/util/sync.js";
import * as input from "./inputEvents.js";
import * as room_mng from "/js/util/room_manager.js";
import * as audio from "../../util/spatial-audio.js"

import * as txtrManager from "./textureManager.js";

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

let clientStateSharing;

export function Clay(gl, canvas) {
   this.debug = state => debug = state;

   let clearTexture = new ImageData(textureCanvas.width, textureCanvas.height);

   let textureConfig  = new Map();

   clientStateSharing = new ClientStateSharing();

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
   //this.controllerOrigin = hand => cg.mTransform(controllerMatrix[hand], [hand=='left'?.01:-.01,-.04,-.08]);
   this.controllerOrigin = hand => cg.mTransform(controllerMatrix[hand], [0,-.05,-.08]);
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


let M = new cg.Matrix();

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

let drawMesh = (mesh, materialId, textureSrc, txtr, bumpTextureSrc, bumptxtr, dull, flags, customShader, opacity, view) => {
   if (!this.renderingIsActive)
      return;

   let saveProgram = this.clayPgm.program;
   if (customShader)
      window.customShader = customShader;

   let m = M.getValue();
   let mInv = cg.mInverse(m);
   setUniform('Matrix4fv', 'uIRM', false, clay.inverseRootMatrix);
   setUniform('Matrix4fv', 'uModel', false, m);
   setUniform('Matrix4fv', 'uInvModel', false, mInv);

   setUniform('1f', 'uOpacity', opacity ? opacity : 1);

   let material = materials[materialId];
   let a = material.ambient, d = material.diffuse, s = material.specular, t = material.texture;
   if (t === undefined) t = [0,0,0,0];
   setUniform('Matrix4fv', 'uPhong', false, [a[0],a[1],a[2],0, d[0],d[1],d[2],0, s[0],s[1],s[2],s[3], t[0],t[1],t[2],t[3]]);

   // CANCEL DRAWING IF THE MESH DOES NOT EXIST

   if (!mesh || mesh.length == 0)
      return;

   if (mesh.isParticles)
      if (mesh.particlesInline)
         this.renderParticlesMeshInline(this, mesh, views);
      else
         renderParticlesMesh(mesh, mInv);

   setUniform('1iv', 'uSampler', [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]);  // SPECIFY TEXTURE INDICES.
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


   if (_canvas_txtr[txtr] && _canvas_txtr[txtr].counter-- > 0) {
      gl.activeTexture(gl.TEXTURE0 + txtr);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, _canvas_txtr[txtr].src);
   }
   setUniform('1i', 'uTxtr', txtr);
   setUniform('1i', 'uBumpTxtr', bumptxtr);


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
   return cg.normalize(cg.cross(c, v));
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

let renderParticlesMesh = (mesh, mInv) => {
   let data = mesh.particleData;
   let orient = mesh.orient;

   if (! data)
      return;

   let N = mesh.length / (6 * 16);
   let vm = cg.mMultiply(clay.inverseRootMatrix, cg.mMultiply(this.pose.transform.matrix, mInv));
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
   order.sort((a,b) => cg.dot(Z,data[a]?data[a].p: -1) - cg.dot(Z,data[b]?data[b].p: -1));

   let setVertex = (j, p, n, s, c, u, v, uRaw, vRaw) => {
      let nx = X, ny = Y, nz = Z;
      let pos, d = [1,0,0];
      let sx = s[0] ? s[0] : s;
      let sy = s[1] ? s[1] : s;
      if (Array.isArray(p[0])) {
         let c = cg.mix(p[0],p[1],.5,.5);
         d = cg.mix(p[0],p[1],-1, 1);
         ny = cg.normalize(cg.cross(nz,d));
         pos = [ sx * c[0] + u * d[0] + v * ny[0],
                 sy * c[1] + u * d[1] + v * ny[1],
                 sx * c[2] + u * d[2] + v * ny[2] ];
      }
      else {
         if (n) {
            if (n[0]==0 && n[2]==0) {
               nz = cg.normalize(n);
               nx = cg.normalize(cg.cross(d,nz));
               ny = cg.normalize(cg.cross(nz,nx));
            }
            else {
	       ny = [0,1,0];
               nx = cg.normalize(cg.cross(ny,n));
               nz = cg.normalize(cg.cross(nx,ny));
            }
         }
         pos = [ p[0] + u * sx * nx[0],
                 p[1] + v * sy * ny[1],
                 p[2] + u * sx * nx[2] ];
      }
      let V = vertexArray(pos, nz, null, [uRaw, vRaw], c);
      for (let k = 0 ; k < 16 ; k++)
         mesh[16 * j + k] = V[k];
   }
   for (let i = 0 ; i < N ; i++) {
      if(!data[order[i]]) continue;
      let d = data[order[i]];
      let p = d.p;
      let n = d.n;
      let r = d.r ? d.r : 0;
      let s = d.s ? d.s : .01;
      let c = d.c;
      let t = d.t ? d.t : [0,0,1,1];
      setVertex(6 * i    , p, n, s, c, -.5, -.5, t[0], t[3]); // NOTE: passing in raw UVs as well
      setVertex(6 * i + 1, p, n, s, c,  .5, -.5, t[2], t[3]);
      setVertex(6 * i + 2, p, n, s, c, -.5,  .5, t[0], t[1]);
      setVertex(6 * i + 3, p, n, s, c, -.5,  .5, t[0], t[1]);
      setVertex(6 * i + 4, p, n, s, c,  .5, -.5, t[2], t[3]);
      setVertex(6 * i + 5, p, n, s, c,  .5,  .5, t[2], t[1]);
   }
   mesh.order = order;
}

let createSquareMesh = (i,j,k, z) => {
   let A = []; A[i] = z; A[j] = -1; A[k] =  1;
   let B = []; B[i] = z; B[j] = -1; B[k] = -1;
   let C = []; C[i] = z; C[j] =  1; C[k] =  1;
   let D = []; D[i] = z; D[j] =  1; D[k] = -1;
   let N = []; N[i] = z < 0 ? -1 : 1; N[j] = 0; N[k] = 0;

   let V = [];
   let s = i==2 == z>=0;
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
   return cg.normalize(cg.cross([U[0]-P[0],U[1]-P[1],U[2]-P[2]],
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
let buildCanZMesh = n => glueMeshes(buildTubeZMesh(n),
                                    createMesh(n, 2, uvToDisk, -1));

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


this.animateWireColor = (wire, r, f, colors) => {
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
   
   wire.setVertices((u,v) => {
      let basePosition = cg.add(cg.add(f(u), cg.scale(X[nu*u >> 0], r * Math.sin(2 * Math.PI * v))),
                                cg.scale(Y[nu*u >> 0], r * Math.cos(2 * Math.PI * v)));
      if(colors) {
         let colorIndex = Math.floor(u * (colors.length - 1)); // Sample the color using the same u
         let color = colors[colorIndex];
         return [...basePosition, ...color];
      }

      return basePosition;
   });
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
            let normal = cg.normalize(normalDirection);
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
         let outward = cg.cross(cg.subtract(B, A), cg.subtract(C, B));
         if (cg.dot(outward, normalDirection) < 0) { let tmp = a; a = c; c = tmp; }

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
         t += 2 * cg.noise(14*x,14*y,14*z) - .5;
         break;
      case 2:
         t += .5 * (cg.noise(7*x,7*y,7*z + time) - .3);
         break;
      case 3:
         let u = Math.max(0, cg.noise(20*x,20*y,20*z));
         t -= 16 * u * u;
         break;
      case 4:
         for (let s = 4 ; s < 128 ; s *= 2)
            t += 8 * (cg.noise(7*s*x,7*s*y,7*s*z) - .3) / s;
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
      displacementTextureType == 1 ? cg.noise(6*p[0],6*p[1],6*p[2]) / 5
      : displacementTextureType == 2 ? Math.sin(21*p[0]) * Math.sin(21*p[1]) * Math.sin(21*p[2]) / 10
      : 0;

      let projectPointToForm = (form, p, rounded, info) => {
         if (form == 'donut') {
            let R = info ? info : .37;
            let rxy = Math.sqrt(p[0] * p[0] + p[1] * p[1]),
                dx = (1-R) * p[0] / rxy, dy = (1-R) * p[1] / rxy,
                r = cg.norm([p[0] - dx, p[1] - dy, p[2]]);
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
      return { p: cg.scale(p, 1/r), n: p };
   }

   let sdf = (form, m, p, rounded, info) => {
      p = matrix_transform(m, p);
      let pn = projectPointToForm(form, p, rounded, info);
      return cg.norm(cg.subtract(pn.p, p)) * Math.sign(cg.dot(p,pn.n) - cg.dot(pn.p,pn.n));
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
   setFormMesh('can12'   , buildCanZMesh(12));
   setFormMesh('tube6'   , createMesh( 6, 2, uvToTube));
   setFormMesh('disk12'  , createMesh(12, 2, uvToDisk));

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

            da = 1 + ad * cg.norm([A1[0],A1[1],A1[2]]),
            db = 1 + ad * cg.norm([B1[0],B1[1],B1[2]]),
            dc = 1 + ad * cg.norm([C1[0],C1[1],C1[2]]),

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
      return cg.normalize([f0-fx,f0-fy,f0-fz]);
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
         let W = cg.normalize(cg.cross([2*a,b,c],[b,2*e,f])),
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
      if (blobMatrices === undefined || blobMatrices.length == 0) {
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
//////////////////////////////////////// THE MODELER /////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////

let S = [], vm, vmi, computeQuadric, activeSet, implicitSurface,
    rotatex, rotatey, rotatexState, rotateyState, modelMatrix;
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
   let viewMatrix = cg.mIdentity();
   let viewMatrixInverse = cg.mInverse(viewMatrix);

   implicitSurface = new ImplicitSurface();
   vm  = cg.mIdentity();
   vmi = cg.mIdentity();

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

   let draw = (mesh,color,move,turn,size,texture,txtr,bumpTexture,bumptxtr,dull,flags,customShader,opacity,view) => {

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
         drawMesh(mesh, color, texture, txtr, bumpTexture, bumptxtr, dull, flags, customShader, opacity, view);

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
      clientStateSharing.update();
      window.timestamp++;
      window.needUpdateInput = true;
      window.mySharedObj = [];
      this.updatePgm();
      this.model = model;
      this.views = views;
      codeEditorObj.scale(0);
      const posePosition = this.pose.transform.position;
      setUniform('3f', 'uViewPosition', posePosition.x, posePosition.y, posePosition.z);

      for (let hand in this.controllerWidgets)
         if (window.handtracking)
            this.controllerWidgets[hand].scale(0);
         else {
            let i = 0;
            for (let b = 0 ; b < 7 ; b++)
	       if (clientState.button(clientID, hand, b))
	          i = b + 1;
            this.controllerWidgets[hand].setMatrix(clientState.hand(clientID, hand))
                                        .scale(this.controllerBallSize)
                                        .color(clientState.color(i));
         }

      if (window.clay) scenes();

      // HANDLE LOADING A NEW SCENE

      if (window.vr && ! window.suppress_vrWidgets)
         this.vrWidgets.identity();
      else
         this.vrWidgets.scale(0);

      if (window.animate)
         window.animate();

      /*if (! window.isVideo) {
         videoScreen1.scale(0);
         videoScreen2.scale(0);
      }
      else {
         let s = 3.8;
         let videoScreen = model._isHUD ? videoScreen1 : videoScreen2;
         videoScreen.setMatrix(cg.mInverse(views[0].viewMatrix))
                    //.move(0,0,-.3*s).turnY(Math.PI).scale(.3197*s,.2284*s,.001).scale(.181);
                    .move(0,0,-.3*s).scale(.3197*s,.2284*s,.001).scale(.181);
      }*/

      /*if (window.interactMode != 2) {
         anidrawScreen.scale(0);
      }
      else {
         let s = 3.8;
         anidrawScreen.setMatrix(cg.mInverse(views[0].viewMatrix))
                      .move(0,0,-.3*s)
                      .move(0,-.08*anidrawSlant,0).turnX(-1.2*anidrawSlant)
                      //.turnY(Math.PI).scale(.3197*s,.2284*s,.001).scale(.181);
                      .scale(.3197*s,.2284*s,.001).scale(.181);
      }*/

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

      M.save();

      viewMatrix = M.getValue();
      viewMatrixInverse = cg.mInverse(viewMatrix);

      

      // SPECIFY THE BLOBS FOR THE MODEL
   
      for (let n = 0 ; n < S.length ; n++) {
         M.save();

            let materialId = S[n].color;
            let m = materials[materialId];

            if (true) {
               let m = materials[materialId];
               if (n == mn)
                  m.texture = [.5,0,0,0];
               M.save();
               M.setValue(cg.mMultiply(vm, S[n].M));
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
               draw(formMesh[name], materialId, null, null, null, S[n].texture, S[n].txtr, S[n].bumpTexture, S[n].bumptxtr, S[n].dull, S[n].flags, S[n].customShader, S[n].opacity, S[n].view);
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

      vm  = viewMatrix;
      vmi = cg.mInverse(vm);

      if (videoHandTracker && ! window.vr)
         videoHandTracker.update();

      //g2.update();
   }

// PREDEFINED PROCEDURAL TEXTURES

let textureIndex = 0;

let textures = [
``
,
`// NOISE

density += 2 * cg.noise(7*x,7*y,7*z + time) - 1`
,
`// SUBTLE NOISE

density += .5 * (cg.noise(7*x,7*y,7*z + time) - .3)`
,
`// ERODED

for (let s = 4 ; s < 16 ; s *= 2) {
   let u = max(0, cg.noise(density*7*x,
                        density*7*y,
                        density*7*z));
   density -= 16 * u * u / s;
}`    
,
`// LEAFY

f = 7;
for (let s = 4*f ; s < 64*f ; s *= 2)
   density += (cg.noise(s*x,s*y,s*z) - .3)  * f/s;` 
,
`// ROCK

for (let s = 3 ; s < 100 ; s *= 2)
   density += (cg.noise(s*x,s*y,s*z) - .3) / s;`
];    
   
}

//////////////////////////////////////////////////////////////////////////////////////////////
////////////// GIVE PROGRAMMERS THE OPTION TO BUILD AND ANIMATE THEIR OWN MODEL. /////////////
//////////////////////////////////////////////////////////////////////////////////////////////

let wasInteractMode = true;

function Node(_form) {
   let id = cg.uniqueID(),
       m = new cg.Matrix(),
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
         txtr: node._txtr,
         bumpTexture: node._bumpTexture,
         bumptxtr: node._bumptxtr,
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
      rm = cg.mIdentity();
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
      this._txtr     = -1;
      this._bumpTexture  = '';
      this._bumptxtr = -1;
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
      modelMatrix = cg.mIdentity();
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

   this.add = form => {
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
      if (form == 'label')
         child.txtrSrc(15, 'media/textures/fixed-width-font.png');
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
   this.setRoom   = tf      => { isRoom = tf;          return this; }
   this.getDivs   = ()      => { return implicitSurface.divs();     }
   this.placeLimb = (a,b,radius) => {
      let c = cg.mix(a,b, .5,.5);
      let d = cg.mix(a,b,-.5,.5);
      return this.identity().move(c).aimZ(d).scale(radius,radius,cg.norm(d));
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
   this.textBox = (text, textHeight) => {
      if (this.nChildren() == 0) {
         this._g2 = new G2();
         this.add('cubeXZ').setTxtr(this._g2.getCanvas());
      }
      let nLines = (text.match(new RegExp("\n", "g")) || []).length;
      textHeight = cg.def(textHeight, .1);
      this._g2.clear();
      this._g2.setColor('white');
      this._g2.setFont('Arial');
      this._g2.textHeight(textHeight);
      this._g2.fillText(text, 0, nLines * textHeight, 'center');
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
      this.txtrSrc(1, source);
      picture.add('cube').move(0,-h/2-2*t,  .6*t).scale(w/2+2*t,t,.6*t).color(.2,.1,.05);
      picture.add('cube').move(0, h/2+2*t,  .6*t).scale(w/2+2*t,t,.6*t).color(.2,.1,.05);
      picture.add('cube').move(-w/2-2*t, 0, .6*t).scale(t,h/2+3*t,.6*t).color(.2,.1,.05);
      picture.add('cube').move( w/2+2*t, 0, .6*t).scale(t,h/2+3*t,.6*t).color(.2,.1,.05);
      picture.add('cube').move(0,0,-t/100).scale(w/2+t*t,h/2+3*t,t/100).color(.2,.1,.05);
      picture.add('cube').scale(w/2+t,h/2+t,t/1000).dull().color(.5,.45,.4);
      picture.add('cube').move(0,0,t/100).scale(w/2,h/2,t/100).dull().txtr(1);
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
                                          cg.mMultiply(pm, m.getValue());
      if (this == model)
         rm = cg.mMultiply(rm, modelMatrix);

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
/*
            texture: form == 'label' ? DEFAULT_FONT
                                     : this.prop('_texture'),
            txtr: this.prop('_txtr'),
*/
            texture: this.prop('_texture'),
            txtr: form == 'label' ? 15 : this.prop('_txtr'),

            bumpTexture: this.prop('_bumpTexture'),
            bumptxtr: this.prop('_bumptxtr'),
            form: form,
            flags: this.prop('_flags'),
            customShader: this.prop('_customShader'),
            M: cg.mMultiply(vmi, rm)
         };
         cg.computeQuadric(s);
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

   // NEWER MULTI-TEXTURE-UNIT TEXTURE HANDLING

   this.setTxtr = (src, a, b) => {
      let txtr = undefined;
      let do_not_animate = undefined;

      if (a !== undefined) {
         if (typeof a == 'number') txtr = a;
         else do_not_animate = a;
      }

      if (b !== undefined) {
         if (typeof b == 'boolean') do_not_animate = b;
         else txtr = b;
      }

      if (txtr === undefined)
         txtr = txtrManager.getArbitraryChannel();
      this.txtrSrc(txtr, src, do_not_animate);
      return this.txtr(txtr);
   }

   this.setBumptxtr = (src, a, b) => {
      let txtr = undefined;
      let do_not_animate = undefined;

      if (a !== undefined) {
         if (typeof a == 'number') txtr = a;
         else do_not_animate = a;
      }

      if (b !== undefined) {
         if (typeof b == 'boolean') do_not_animate = b;
         else txtr = b;
      }
      
      if (txtr === undefined)
         txtr = txtrManager.getArbitraryChannel();
      this.txtrSrc(txtr, src, do_not_animate);
      return this.bumptxtr(txtr);
   }

   this.txtr = (txtr) => {
      this._txtr = txtr;
      return this;
   }

   this.bumptxtr = (txtr) => {
      this._bumpTxtr = txtr;
      return this;
   }

   this.txtrSrc = (txtr, src, do_not_animate) => {
      // New texture API
      txtrManager.setTextureToChannel(txtr);

      if (typeof src == 'string') {                             // IF THE TEXTURE SOURCE IS AN IMAGE FILE
         let image = new Image();                           
         image.onload = () => {
             gl.activeTexture (gl.TEXTURE0 + txtr);
	          gl.bindTexture   (gl.TEXTURE_2D, gl.createTexture());
             gl.texImage2D    (gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
             gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
             gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	   }
         image.src = src;
         delete _canvas_txtr[txtr];
      }
      else {                                      // FOR ANY OTHER TEXTURE SOURCE,
         if (! src._animate)
            do_not_animate = true;
            gl.activeTexture (gl.TEXTURE0 + txtr);   // ASSUME THAT ITS CONTENT CAN BE ANIMATED.
            gl.bindTexture   (gl.TEXTURE_2D, gl.createTexture());
            gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            _canvas_txtr[txtr] = { src: src, counter: do_not_animate ? 1 : Number.MAX_SAFE_INTEGER };
      }

      return txtr;
   }
}

window._canvas_txtr = [];

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
   //let videoScreen1 = root.add('cube').texture('camera').scale(0);
   this.model = root.add();
   //let videoScreen2 = root.add('cube').texture('camera').scale(0);
   //let anidrawScreen = root.add('cube').texture('anidraw');
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

   // variant of cg.cross() that accepts a destination array (out) and individual value components instead of an array
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
   let normalizeWBuffer = (out, v) => scaleWBuffer(out, v, 1 / cg.norm(v));
   

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
         let su = s[0] ? s[0] : s;
         let sv = s[1] ? s[1] : s;
         let pos = [ p[0] + u * su * X[0] + v * sv * Y[0],
                     p[1] + u * su * X[1] + v * sv * Y[1],
                     p[2] + u * su * X[2] + v * sv * Y[2] ];
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

