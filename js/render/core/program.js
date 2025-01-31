// Copyright 2018 The Immersive Web Community Group
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
const FALLBACK_FRAG_SOURCE = `#version 300 es // NEWER VERSION OF GLSL
precision highp float; // HIGH PRECISION FLOATS

 const int nl    = 2;                // NUMBER OF DIRECTIONAL LIGHTS
 const int nlPts = 2;                // NUMBER OF POINT LIGHTS

 uniform float uTime;                // TIME, IN SECONDS
 uniform float uBlobby;              // BLOBBY FLAG
 uniform float uOpacity;
 
 uniform vec3 uLDir[nl], uLCol[nl];              // DIRECTIONAL LIGHTING
 uniform vec3 uLPoint[nlPts], uLPointCol[nlPts]; // POINT LIGHTING
 uniform int  uDLightCount, uPLightCount;

 uniform mat4  uPhong;               // MATERIAL
 uniform mat4  uModel, uProj, uView;         // MODEL, PROJECTION AND VIEW
 uniform mat4  uInvModel;
 uniform sampler2D uSampler[16];
 uniform float uDull;

 uniform int uMirrored;
 uniform int uTexture;
 uniform int uTxtr;
 uniform int uTransparentTexture;
 uniform int uVideo;
 uniform int uAnidraw;
 uniform int uCustom;
 uniform int uWhitescreen;
 uniform vec3 uViewPosition;

 in vec3  vAPos, vPos, vNor, vTan, vBi, vRGB;   // POSITION, NORMAL, TANGENT, COLOR
 in float vWeights[6];                     // BLOBBY WEIGHTS
 in vec4  vDiffuse, vSpecular;
 in vec2  vUV;

 in vec3 worldPosition;
 in vec3 worldNormal;
 in vec3 worldTangent;

 out vec4 fragColor; // RESULT WILL GO HERE

/*
float noise(vec3 point) { 
  float r = 0.; for (int i=0;i<16;i++) {
  vec3 D, p = point + mod(vec3(i,i/4,i/8) , vec3(4.0,2.0,2.0)) +
       1.7*sin(vec3(i,5*i,8*i)), C=floor(p), P=p-C-.5, A=abs(P);
  C += mod(C.x+C.y+C.z,2.) * step(max(A.yzx,A.zxy),A) * sign(P);
  D=34.*sin(987.*float(i)+876.*C+76.*C.yzx+765.*C.zxy);P=p-C-.5;
  r+=sin(6.3*dot(P,fract(D)-.5))*pow(max(0.,1.-2.*dot(P,P)),4.);
  } 
  return .5 * sin(r); 
}
*/

// KEN'S NEWER IMPLEMENTATION OF GPU NOISE, WHICH MATCHES HIS NEW IMPLEMENTATION OF CPU NOISE

vec3 s(vec3 i) { return cos(5.*(i+5.*cos(5.*(i.yzx+5.*cos(5.*(i.zxy+5.*cos(5.*i))))))); }
float t(vec3 i, vec3 u, vec3 a) { return dot(normalize(s(i + a)), u - a); }
float noise(vec3 p) {
   vec3 i = floor(p), u = p - i, v = u * u * (3. - u - u);
   return mix(mix(mix(t(i, u, vec3(0.,0.,0.)), t(i, u, vec3(1.,0.,0.)), v.x),
                  mix(t(i, u, vec3(0.,1.,0.)), t(i, u, vec3(1.,1.,0.)), v.x), v.y),
              mix(mix(t(i, u, vec3(0.,0.,1.)), t(i, u, vec3(1.,0.,1.)), v.x),
                  mix(t(i, u, vec3(0.,1.,1.)), t(i, u, vec3(1.,1.,1.)), v.x), v.y), v.z);
}


vec3 obj2World(vec3 o){
  vec4 pos = uModel * vec4(o, 1.);
  return pos.xyz;
}
vec3 world2Obj(vec3 w){
  vec4 pos = uInvModel * vec4(w, 1.);
  return pos.xyz;
}

vec3 vpow(vec3 v, float p){
  return vec3(pow(v.x, p), pow(v.y, p), pow(v.z, p));
}


vec3 lighting_contribution(
  vec3 ambientColor,
  vec3 diffuseColor,
  vec3 specularColor,
  float specularPower,
  vec3 LDirection,
  vec3 LAmbientColor,
  vec3 eye,
  vec3 normal
) {
  vec3 LDiffuseColor = vec3(1.0);
  vec3 LSpecularColor = vec3(1.0);
  vec3 ambientTerm = LAmbientColor * ambientColor;
  float diffuseIntensity = max(dot(normal, LDirection), 0.0);
  // no attenuation in this implementation, 
  // so this check is necessary to avoid adding color where it doesn't belong.
  // if (diffuseIntensity == 0.0) {
  //   return vec3(0.0);
  // }
  diffuseIntensity = max(0.0, diffuseIntensity);
  
  vec3 diffuseTerm = LDiffuseColor * diffuseColor * diffuseIntensity;
  vec3 H = normalize(LDirection + eye);
  vec3 specularTerm = pow(max(dot(normal, H), 0.0), specularPower) * LSpecularColor * specularColor;
#define FRESNEL
#ifdef FRESNEL
  {
    float base = 1.0 - dot(eye, H);
    float exponential = pow(base, 5.0);
    const float F0 = 1.0;
    float fresnel = exponential + F0 * (1.0 - exponential);
    specularTerm *= fresnel;
  }
#endif
  return (diffuseTerm + specularTerm);
}

 vec4 txtrLogic(vec4 t, vec3 ambient) {
    vec3 rgb = mix(vec3(1.), t.rgb, t.a);
    float a = t.a;
    if (uTransparentTexture == 1) {
       rgb = 5. * ambient;
       a *= max(0., 1. - (t.r + t.g + t.b) / 3.);
    }
    return vec4(rgb, a);
 }

 void main() {
    vec3 ambient, diffuse;
    vec4 specular, t;

    if (uBlobby <= 0.) {
       ambient  = uPhong[0].rgb;
       diffuse  = uPhong[1].rgb;
       specular = uPhong[2].rgba;
       t        = uPhong[3].rgba;
    }
    else {
       ambient = vDiffuse.rgb * (1. - vDiffuse.a);
       diffuse = vDiffuse.rgb * vDiffuse.a;
       specular = vSpecular;
       t = vec4(0.);
    }

    specular *= 1. - .99 * uDull;

    vec3 color = ambient + t.r * (.5 + dot(diffuse, diffuse));

    // apply lighting
//#define OLD
#ifdef OLD
    vec3 N = normalize(vNor);
    for (int n = 0 ; n < nl ; n++) {
      if (n == uDLightCount) { 
        break; 
      }

       vec3 R = uLDir[n] - 2. * dot(uLDir[n], N) * N;
       color += uLCol[n] * (
                 diffuse * max(0., dot(uLDir[n], N))
               + specular.rgb * pow(max(0., R.z), specular.w)
       );
    }
#else    
    vec3 ambientColor   = ambient;
    vec3 diffuseColor   = diffuse;
    vec3 specularColor  = specular.rgb;
    float specularPower = specular.a;

    vec3 normal = normalize(worldNormal);
    vec3 tangent = normalize(worldTangent);
    vec3 eye = normalize(uViewPosition - worldPosition);

    // directional lights
    for (int l = 0; l < nl && l < uDLightCount; l += 1) {
      vec3 LDirection    = uLDir[l];
      vec3 LAmbientColor = uLCol[l];
      color += lighting_contribution(
        ambientColor, diffuseColor, specularColor, specularPower, 
        LDirection, LAmbientColor,
        eye, normal
      );
    }
    // point lights
    for (int l = 0; l < nlPts && l < uPLightCount; l += 1) {
      vec3 LDirection    = normalize(uLPoint[l] - worldPosition);
      vec3 LAmbientColor = uLPointCol[l];
      color += lighting_contribution(
        ambientColor, diffuseColor, specularColor, specularPower, 
        LDirection, LAmbientColor,
        eye, normal
      );
    }
#endif

    float opacity = uOpacity;

    if (uVideo == 0 && uTexture == 1) {
       vec4 texture = texture(uSampler[0], vUV);
       color *= mix(vec3(1.), texture.rgb, texture.a);
       opacity *= texture.a;
       if (uTransparentTexture == 1) {
          color = 5. * ambient;
          opacity *= max(0., 1. - (texture.r + texture.g + texture.b) / 3.);
       }
    }

    vec4 rgba = vec4(1.);
    if (uTxtr != -1) {
       if (uTxtr ==  0) { rgba = txtrLogic(texture(uSampler[ 0],vUV), ambient); }
       if (uTxtr ==  1) { rgba = txtrLogic(texture(uSampler[ 1],vUV), ambient); }
       if (uTxtr ==  2) { rgba = txtrLogic(texture(uSampler[ 2],vUV), ambient); }
       if (uTxtr ==  3) { rgba = txtrLogic(texture(uSampler[ 3],vUV), ambient); }
       if (uTxtr ==  4) { rgba = txtrLogic(texture(uSampler[ 4],vUV), ambient); }
       if (uTxtr ==  5) { rgba = txtrLogic(texture(uSampler[ 5],vUV), ambient); }
       if (uTxtr ==  6) { rgba = txtrLogic(texture(uSampler[ 6],vUV), ambient); }
       if (uTxtr ==  7) { rgba = txtrLogic(texture(uSampler[ 7],vUV), ambient); }
       if (uTxtr ==  8) { rgba = txtrLogic(texture(uSampler[ 8],vUV), ambient); }
       if (uTxtr ==  9) { rgba = txtrLogic(texture(uSampler[ 9],vUV), ambient); }
       if (uTxtr == 10) { rgba = txtrLogic(texture(uSampler[10],vUV), ambient); }
       if (uTxtr == 11) { rgba = txtrLogic(texture(uSampler[11],vUV), ambient); }
       if (uTxtr == 12) { rgba = txtrLogic(texture(uSampler[12],vUV), ambient); }
       if (uTxtr == 13) { rgba = txtrLogic(texture(uSampler[13],vUV), ambient); }
       if (uTxtr == 14) { rgba = txtrLogic(texture(uSampler[14],vUV), ambient); }
       if (uTxtr == 15) { rgba = txtrLogic(texture(uSampler[15],vUV), ambient); }
    }
    color *= rgba.rgb;
    opacity *= rgba.a;

    float isLit = sign(specularPower);
    if (uVideo == 0 && uAnidraw == 0 && uCustom == 1) {
      isLit = 1.0;
    }

    if (opacity == 0.)
       discard;

    fragColor = (
      (vec4(sqrt(color * vRGB), 1.0) * isLit)
      + (vec4(diffuseColor, 1.0) * (1.0 - isLit)) 
    ) * opacity;
 }
`; 
export class Program {
  constructor(gl, vertSrc, fragSrc, attribMap, defines) {
    this._gl = gl;
    this.program = gl.createProgram();
    this.attrib = null;
    this.uniform = null;
    this.defines = {};

    this._firstUse = true;
    this._nextUseCallbacks = [];

    this.definesString = "";
    if (defines) {
      for (let define in defines) {
        this.defines[define] = defines[define];
        this.definesString += `#define ${define} ${defines[define]}\n`;
      }
    }

    this._vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.attachShader(this.program, this._vertShader);
    gl.shaderSource(this._vertShader, this.definesString + vertSrc);
    gl.compileShader(this._vertShader);

    this._fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.attachShader(this.program, this._fragShader);
    gl.shaderSource(this._fragShader, this.definesString + fragSrc);
    gl.compileShader(this._fragShader);


    if (!gl.getShaderParameter(this._fragShader, gl.COMPILE_STATUS)) {
      gl.detachShader(this.program, this._fragShader);
      gl.deleteShader(this._fragShader);
      this._fragShader = gl.createShader(gl.FRAGMENT_SHADER);
      gl.attachShader(this.program, this._fragShader);
      gl.shaderSource(this._fragShader, this.definesString + FALLBACK_FRAG_SOURCE);
      gl.compileShader(this._fragShader);
  }

    if (attribMap) {
      this.attrib = {};
      for (let attribName in attribMap) {
        gl.bindAttribLocation(this.program, attribMap[attribName], attribName);
        this.attrib[attribName] = attribMap[attribName];
      }
    }

    gl.linkProgram(this.program);
  }

  onNextUse(callback) {
    this._nextUseCallbacks.push(callback);
  }

  use() {
    let gl = this._gl;

    // If this is the first time the program has been used do all the error checking and
    // attrib/uniform querying needed.
    if (this._firstUse) {
      this._firstUse = false;
      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
        if (!gl.getShaderParameter(this._vertShader, gl.COMPILE_STATUS)) {
          console.error(
            "Vertex shader compile error: " +
              gl.getShaderInfoLog(this._vertShader)
          );
        } else if (
          !gl.getShaderParameter(this._fragShader, gl.COMPILE_STATUS)
        ) {
          console.error(
            "Fragment shader compile error: " +
              gl.getShaderInfoLog(this._fragShader)
          );
        } else {
          console.error(
            "Program link error: " + gl.getProgramInfoLog(this.program)
          );
        }
        gl.deleteProgram(this.program);
        this.program = null;
      } else {
        if (!this.attrib) {
          this.attrib = {};
          let attribCount = gl.getProgramParameter(
            this.program,
            gl.ACTIVE_ATTRIBUTES
          );
          for (let i = 0; i < attribCount; i++) {
            let attribInfo = gl.getActiveAttrib(this.program, i);
            this.attrib[attribInfo.name] = gl.getAttribLocation(
              this.program,
              attribInfo.name
            );
          }
        }

        this.uniform = {};
        let uniformCount = gl.getProgramParameter(
          this.program,
          gl.ACTIVE_UNIFORMS
        );
        let uniformName = "";
        for (let i = 0; i < uniformCount; i++) {
          let uniformInfo = gl.getActiveUniform(this.program, i);
          uniformName = uniformInfo.name.replace("[0]", "");
          this.uniform[uniformName] = gl.getUniformLocation(
            this.program,
            uniformName
          );
        }
      }
      gl.deleteShader(this._vertShader);
      gl.deleteShader(this._fragShader);
    }

    gl.useProgram(this.program);

    if (this._nextUseCallbacks.length) {
      for (let callback of this._nextUseCallbacks) {
        callback(this);
      }
      this._nextUseCallbacks = [];
    }
  }
}
