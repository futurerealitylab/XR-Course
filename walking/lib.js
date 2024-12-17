// SUPPORT FOR STEREO VIEWING ON A PHONE

document.body.addEventListener('click', () => {
   if (DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission()
         .then(permissionState => {})
         .catch(console.error);
   }
}, { once: true });

let imu = {}, imuTime, imuSamplingInterval;
if (window.DeviceOrientationEvent)
   window.addEventListener('deviceorientation', event => {
      imu.alpha = event.alpha;                             // COMPASS DIRECTION, IN DEGREES
      imu.beta  = event.beta;                              // TURN ABOUT SCREEN, IN DEGREES
      imu.gamma = event.gamma;                             // TILT FORWARD/BACK, IN DEGREES

      let time = Date.now() / 1000;                        // KEEP TRACK OF AVERAGE SAMPLE TIME
      if (imuTime !== undefined)
         imuSamplingInterval = imuSamplingInterval === undefined ? time - imuTime
	                     : .99 * imuSamplingInterval + .01 * ( time - imuTime );
      imuTime = time;
   });

// MATH AND VECTOR SUPPORT

let C         = t       => Math.cos(t);
let S         = t       => Math.sin(t);
let TAU       = 2 * Math.PI;
let add       = (a,b)   => a.map((a,i) => a + b[i]);
let cross     = (a,b)   => [ a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0] ];
let distance  = (a,b)   => norm(subtract(a,b));
let dot       = (a,b)   => { let t = 0 ; a.map((a,i) => t += a * b[i]); return t; }
let ease      = t       => (t = Math.max(0,Math.min(1,t))) * t * (3 - t - t);
let mix       = (a,b,t) => a[0]!==undefined ? a.map((a,i) => a + t * (b[i] - a)) : a + t * (b - a);
let mixAngle  = (a,b,t) => { while (b-a>TAU/2) b-=TAU; while (a-b>TAU/2) b+=TAU; return mix(a,b,t); }
let norm      = v       => Math.sqrt(dot(v,v));
let normalize = v       => scale(v, 1 / norm(v));
let scale     = (a,s)   => a.map((a,i) => (s[i]!==undefined ? s[i] : s) * a);
let subtract  = (a,b)   => a.map((a,i) => a - b[i]);

function noise1(t) {
   if (! this.u) { this.u=[]; for (let i=0;i<256;i++) this.u[i]=6*Math.sin(12345*i); }
   let u = this.u, i = t >> 0, f = t - i;
   return f * (u[i & 255] * (f*(f-2)+1) + u[i+1 & 255] * f*(f-1));
}

// TRACK THE MOUSE OR TOUCHSCREEN

let trackMouse = canvas => {
   canvas.rx = canvas.ry = 0;
   let mousedown = (x,y,e) => {
      let r = e.target.getBoundingClientRect();
      canvas.mx = canvas.x = x - r.left >> 0;
      canvas.my = canvas.y = y - r.top  >> 0;
   }
   let mousemove = (x,y,e) => {
      let r = e.target.getBoundingClientRect();
      canvas.x = x - r.left >> 0;
      canvas.y = y - r.top  >> 0;
      if (canvas.mx !== undefined) {
         canvas.rx += canvas.x-canvas.mx; canvas.mx = canvas.x;
         canvas.ry += canvas.y-canvas.my; canvas.my = canvas.y;
      }
   }
   let mouseup = () => canvas.mx = undefined;
   canvas.onmousedown = e => mousedown(e.clientX, e.clientY, e);
   canvas.onmousemove = e => mousemove(e.clientX, e.clientY, e);
   canvas.onmouseup   = e => mouseup();
   let cT = e => e.changedTouches[0];
   canvas.addEventListener('touchstart', e => mousedown(cT(e).pageX, cT(e).pageY, e));
   canvas.addEventListener('touchmove' , e => mousemove(cT(e).pageX, cT(e).pageY, e));
   canvas.addEventListener('touchend'  , e => mouseup  (cT(e).pageX, cT(e).pageY, e));
}

// 2-LINK INVERSE KINEMATICS. ARGS: a,b: THIGH,LEG LENGTHS; C: ANKLE POSITION; D: KNEE AIM DIRECTION

let ik  = (a,b,C,D) => {
   let c=dot(C,C), x=(1+(a*a-b*b)/c)/2, y=dot(C,D)/c;
   for (let i = 0 ; i < 3 ; i++) D[i] -= y * C[i];
   y = Math.sqrt(Math.max(0,a*a - c*x*x) / dot(D,D));
   for (let i=0 ; i<3 ; i++) D[i] = x*C[i] + y*D[i];
   return D;
}

// PHYSICS

function Spring() { 
   this.getPosition = () => P;                       // OUTPUT
   this.setDamping  = d  => D = d;                   // INPUT
   this.setForce    = f  => F = f;                   // INPUT
   this.setMass     = m  => M = Math.max(0.001, m);  // INPUT
   this.update = e => {                              // NEED TO CALL THIS EVERY FRAME
      V += (F - P) / M * e;
      P  = (P + V) * (1 - D * e);
   }
   let D = 1, F = 0, M = 1, P = 0, V = 0;
}

// MATRIX SUPPORT

let mInverse = m => {                                // INVERT A 4x4 MATRIX
   let d = [], de = 0, co = (c, r) => {
      let s = (i, j) => m[c+i & 3 | (r+j & 3) << 2];
      return (c+r & 1 ? -1 : 1) * ( (s(1,1) * (s(2,2) * s(3,3) - s(3,2) * s(2,3)))
                                  - (s(2,1) * (s(1,2) * s(3,3) - s(3,2) * s(1,3)))
                                  + (s(3,1) * (s(1,2) * s(2,3) - s(2,2) * s(1,3))) );
   }
   for (let n = 0 ; n < 16 ; n++) d.push(co(n >> 2, n & 3));
   for (let n = 0 ; n <  4 ; n++) de += m[n] * d[n << 2]; 
   for (let n = 0 ; n < 16 ; n++) d[n] /= de;
   return d;
}

function Matrix() {
   let mxm = (a, b) => {
      let d = [];
      for (let n = 0 ; n < 16 ; n++)
         d.push(a[n&3]*b[n&12] + a[n&3|4]*b[n&12|1] + a[n&3|8]*b[n&12|2] + a[n&3|12]*b[n&12|3]);
      return d;
   }
   let mId = () => [ 1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1 ];
   let mPe = (fl, m) => mxm(m, imu.alpha == null ? [1,0,0,0, 0,1,0,0, 0,0,1,-1/fl, 0,0,0,1]
                                                 : [1,0,0,0, 0,1,0,0, 0,0,0,-1/fl, 0,0,1,0]);
   let mRX = (t, m) => mxm(m, [1,0,0,0, 0,C(t),S(t),0, 0,-S(t),C(t),0, 0,0,0,1]);
   let mRY = (t, m) => mxm(m, [C(t),0,-S(t),0, 0,1,0,0, S(t),0,C(t),0, 0,0,0,1]);
   let mRZ = (t, m) => mxm(m, [C(t),S(t),0,0, -S(t),C(t),0,0, 0,0,1,0, 0,0,0,1]);
   let mSc = (x,y,z, m) => mxm(m, [x[0]!==undefined?x[0]:x,0,0,0,
                                   0,x[0]!==undefined?x[1]:y,0,0,
				   0,0,x[0]!==undefined?x[2]:z,0, 0,0,0,1]);
   let mTr = (x,y,z, m) => mxm(m, [1,0,0,0, 0,1,0,0, 0,0,1,0, x[0]!==undefined?x[0]:x,
                                                              x[0]!==undefined?x[1]:y,
                                                              x[0]!==undefined?x[2]:z,1]);
   let stack = [{M:mId(),C:[1,1,1],O:1}], top = 0;
   let set = arg => { stack[top].M = arg; return this; }
   let get = () => stack[top].M;

   this.aim = (W,i,V) => {
      W = normalize(W);
      let a = cross(W,[1,0,0]), b = cross(W,[0,1,0]);
      if (V === undefined)
         V = normalize(dot(a,a) > dot(b,b) ? a : b);
      let U = normalize(cross(V,W));
      V = normalize(cross(W,U));
      let A = i==0 ? [W,U,V] : i==1 ? [V,W,U] : [U,V,W];
      set(mxm(get(), [ A[0],0, A[1],0, A[2],0, 0,0,0,1 ].flat()));
      return this;
   }
   this.identity = () => set(mId());
   this.perspective = fl => set(mPe(fl, get()));
   this.turnX = t => set(mRX(t, get()));
   this.turnY = t => set(mRY(t, get()));
   this.turnZ = t => set(mRZ(t, get()));
   this.scale = (x,y,z) => set(mSc(x,y?y:x,z?z:x, get()));
   this.move = (x,y,z) => set(mTr(x,y,z, get()));
   this.get = () => get();
   this.set = value => set(value);
   this.S = () => {
      if (++top == stack.length)
         stack.push({});
      stack[top].M = stack[top-1].M;
      stack[top].C = stack[top-1].C;
      stack[top].O = stack[top-1].O;
      stack[top].T = stack[top-1].T;
      stack[top].B = stack[top-1].B;
      return this;
   }
   this.R = () => --top;
   this.draw = S => draw({S:S,C:stack[top].C,
                              O:stack[top].O,
			      T:stack[top].T,
			      B:stack[top].B});
   this.color       = arg => { stack[top].C = arg; return this; }
   this.opacity     = arg => { stack[top].O = arg; return this; }
   this.texture     = arg => { stack[top].T = arg; return this; }
   this.bumpTexture = arg => { stack[top].B = arg; return this; }
}

// INITIALIZE WEBGL

let start_gl = (canvas, vertexShader, fragmentShader) => {
   let gl = canvas.getContext("webgl");
   gl.canvas = canvas;
   let program = gl.createProgram();
   gl.program = program;
   let addshader = (type, src) => {
      let shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (! gl.getShaderParameter(shader, gl.COMPILE_STATUS))
         throw "Cannot compile shader:\n\n" + gl.getShaderInfoLog(shader);
      gl.attachShader(program, shader);
   };
   for (let i in materials) {
      let index = fragmentShader.indexOf('// MATERIAL');
      fragmentShader = fragmentShader.substring(0, index)
                     + 'if (uMaterial == ' + i + ') {' + materials[i] + '}'
                     + fragmentShader.substring(index);
   }
   addshader(gl.VERTEX_SHADER  , vertexShader  );
   addshader(gl.FRAGMENT_SHADER, fragmentShader);
   gl.linkProgram(program);
   if (! gl.getProgramParameter(program, gl.LINK_STATUS))
      throw "Could not link the shader program!";
   gl.useProgram(program);
   gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
   gl.enable(gl.DEPTH_TEST);
   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
   gl.depthFunc(gl.LEQUAL);
   let vertexAttribute = (name, size, position) => {
      let attr = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(attr);
      gl.vertexAttribPointer(attr, size, gl.FLOAT, false, vertexSize * 4, position * 4);
   }
   vertexAttribute('aPos', 3, 0);
   vertexAttribute('aNor', 3, 3);
   vertexAttribute('aUV' , 2, 6);
   vertexAttribute('aTan', 3, 8);
   return gl;
}

// IMPLEMENT VARIOUS 3D SHAPES

let createMesh = (nu, nv, p) => {
   let V = (u,v) => {
      let P = p(u,v);
      let getD = (du,dv) => normalize(subtract(p(u+du,v+dv), P));
      let U = getD(.001, 0);
      if (P.length < 6)
         P = P.concat(cross(U, getD(0, .001)));
      return P.concat([u, 1-v, U[0], U[1], U[2]]);
   }
   let mesh = [];
   for (let j = nv-1 ; j >= 0 ; j--) {
      for (let i = 0 ; i <= nu ; i++)
         mesh.push(V(i/nu,(j+1)/nv),  V(i/nu,j/nv));
      mesh.push(V(1,j/nv), V(0,j/nv));
   }
   return new Float32Array(mesh.flat());
}
let sphere = (nu, nv) => createMesh(nu, nv, (u,v) => {
   let theta = 2 * Math.PI * u;
   let phi = Math.PI * (v - .5);
   return [ C(phi) * C(theta), C(phi) * S(theta), S(phi) ];
});
let tube = (nu, nv, i) => createMesh(nu, nv, (u,v) => {
   let U = C(2 * Math.PI * u),
       V = S(2 * Math.PI * u),
       W = 2 * v - 1;
   return i==0 ? [W,U,V] : i==1 ? [V,W,U] : [U,V,W];
});
let disk = (nu, nv, i) => createMesh(nu, nv, (u,v) => {
   let U = v * C(2 * Math.PI * u),
       V = v * S(2 * Math.PI * u);
   return i==0 ? [0,U,V,1,0,0] : i==1 ? [V,0,U, 0,1,0] : [U,V,0,0,0,1];
});
let cylinder = (nu, i, r) => createMesh(nu, 6, (u,v) => {
   r = r ? r : 1;
   let x = C(2 * Math.PI * u),
       y = S(2 * Math.PI * u),
       t = Math.sqrt(4 + (1-r)*(1-r)), a = 2/t, b = (1-r)/t;
       swizzle = v => i==0 ? [v[2],v[0],v[1], v[5],v[3],v[4]]
                    : i==1 ? [v[1],v[2],v[0], v[4],v[5],v[3]]
                           : [v[0],v[1],v[2], v[3],v[4],v[5]];
   switch (5 * v >> 0) {
   case 0: return swizzle([   0,  0,-1,    0,  0,-1 ]);
   case 1: return swizzle([   x,  y,-1,    0,  0,-1 ]);
   case 2: return swizzle([   x,  y,-1,  a*x,a*y, b ]);
   case 3: return swizzle([ r*x,r*y, 1,  a*x,a*y, b ]);
   case 4: return swizzle([ r*x,r*y, 1,    0,  0, 1 ]);
   case 5: return swizzle([   0,  0, 1,    0,  0, 1 ]);
   }
});
let torus = (nu, nv, r, t, i) => createMesh(nu, nv, (u,v) => {
   r = r ? r : .5;
   t = t ? t : 1;
   let ct = C(2 * Math.PI * u);
   let st = S(2 * Math.PI * u);
   let cp = C(2 * Math.PI * v);
   let sp = S(2 * Math.PI * v);
   let U = (1 + r * cp) * ct,
       V = (1 + r * cp) * st,
       W =      r * Math.max(-t, Math.min(t, sp));
   return i==0 ? [W,U,V] : i==1 ? [V,W,U] : [U,V,W];
});
let strToTris = s => {
   let t = [], i;
   for (let n = 0 ; n < s.length ; n++)
      if ((i = 'N01'.indexOf(s.charAt(n))) >= 0)
         t.push(i-1);
   return new Float32Array(t);
}
let square=strToTris(`1N000111100 11000110100 N1000100100  N1000100100 NN000101100 1N000111100`);
let cube = strToTris(`1N100111100 11100110100 N1100100100  N1100100100 NN100101100 1N100111100
                      N1N00N01N00 11N00N11N00 1NN00N10N00  1NN00N10N00 NNN00N00N00 N1N00N01N00
                      11N10011010 11110010010 1N110000010  1N110000010 1NN10001010 11N10011010
                      NN1N00100N0 N11N00000N0 N1NN00010N0  N1NN00010N0 NNNN00110N0 NN1N00100N0
                      N1101011001 11101010001 11N01000001  11N01000001 N1N01001001 N1101011001
                      1NN0N00100N 1N10N01100N NN10N01000N  NN10N01000N NNN0N00000N 1NN0N00100N`);

// API FOR CREATING 3D SHAPES

let CreateMesh = (nu,nv,f) => { return { type: 1, mesh: createMesh(nu,nv,f) }; }
let Cube       = ()        => { return { type: 0, mesh: cube }; }
let Cylinder   = (n,i,r)   => { return { type: 1, mesh: cylinder(n, i, r) }; }
let Disk       = (n,i)     => { return { type: 1, mesh: disk    (n, 1, i) }; }
let Sphere     = n         => { return { type: 1, mesh: sphere  (n, n>>1) }; }
let Square     = ()        => { return { type: 0, mesh: square }; }
let Torus      = (n,r,t,i) => { return { type: 1, mesh: torus   (n, n, r, t, i) }; }
let Tube       = (n,i)     => { return { type: 1, mesh: tube    (n, 1, i) }; }

let superquadric = (t,p) => {
   let f = (4 * t >> 0) / 4;
   t -= f + .125;
   t = TAU * (Math.sign(t) * Math.pow(Math.abs(8*t),1/p)/8 + f);
   let x = C(t), ax = Math.abs(x);
   let y = S(t), ay = Math.abs(y);
   let r = Math.pow(Math.pow(ax,p) + Math.pow(ay,p), 1/p);
   return [Math.sign(x)*ax/r, Math.sign(y)*ay/r];
}

// GPU SHADERS

let vertexSize = 11;
let vertexShader = `
   attribute vec3 aPos, aNor, aTan;
   attribute vec2 aUV;
   uniform float uAspectRatio, uEye;
   uniform mat4 uMatrix, uInvMatrix, uVMatrix, uVInvMatrix;
   varying float vClipX;
   varying vec2 vUV;
   varying vec3 vPos, vNor, vTan, vTpos;

   void main() {
      vec4 pos = uVMatrix * uMatrix * vec4(aPos, 1.0);
      vec4 nor = vec4(aNor, 0.0) * uInvMatrix * uVInvMatrix;
      vec4 tan = vec4(aTan, 0.0) * uInvMatrix * uVInvMatrix;
      vec4 tpos = uMatrix * vec4(aPos, 1.0);
      vPos = pos.xyz;
      vNor = nor.xyz;
      vTan = tan.xyz;
      vTpos = tpos.xyz;
      vUV  = aUV;

      pos = mix(pos, vec4(.5 * pos.xyz, pos.w), uEye * uEye);
      pos.x += .45 * pos.w * uEye;
      vClipX = pos.x * uEye;

      gl_Position = pos * vec4(1.,uAspectRatio,-.1,1.);
   }
`;
let fragmentShader = `
   precision mediump float;
   float noise(vec3 point) { float r = 0.; for (int i=0;i<16;i++) {
     vec3 D, p = point + mod(vec3(i,i/4,i/8) , vec3(4.0,2.0,2.0)) +
          1.7*sin(vec3(i,5*i,8*i)), C=floor(p), P=p-C-.5, A=abs(P);
     C += mod(C.x+C.y+C.z,2.) * step(max(A.yzx,A.zxy),A) * sign(P);
     D=34.*sin(987.*float(i)+876.*C+76.*C.yzx+765.*C.zxy);P=p-C-.5;
     r+=sin(6.3*dot(P,fract(D)-.5))*pow(max(0.,1.-2.*dot(P,P)),4.);
   } return .5 * sin(r); }
   uniform sampler2D uSampler[16];
   uniform int uTexture, uBumpTexture, uMaterial;
   uniform float uOpacity, vClipX;
   uniform vec3 uColor;
   varying vec2 vUV;
   varying vec3 vPos, vNor, vTan, vTpos;

   void main(void) {
      if (vClipX < 0.)
         discard;
      vec4 texture = vec4(1.);
      vec3 nor = normalize(vNor);
      for (int i = 0 ; i < 16 ; i++) {
         if (uTexture == i)
            texture = texture2D(uSampler[i], vUV);
         if (uBumpTexture == i) {
            vec3 b = 2. * texture2D(uSampler[i], vUV).rgb - 1.;
            vec3 tan = normalize(vTan);
            vec3 bin = cross(nor, tan);
            nor = normalize(b.x * tan + b.y * bin + b.z * nor);
         }
      }
      vec3 L = vec3(.577), E = vec3(0.,0.,1.);
      float c = .05 + max(0., dot(L, nor)) + max(0., dot(-L, nor));;
      vec3 color = sqrt(uColor * c) * texture.rgb;
      float power = 40.;
      // MATERIAL
      color += pow(max(0., dot(normalize(E+L), nor)), power)
             + pow(max(0., dot(normalize(E-L), nor)), power);
      gl_FragColor = vec4(color, uOpacity * texture.a);
   }
`;

let materials = [];
let addMaterial = (i,s) => materials[i] = s;

// INITIALIZE GL-RELATED VARIABLES AND DECLARE MATRICES

let gl,uBumpTexture,uColor,uEye,uInvMatrix,uMaterial,uMatrix,uOpacity,uSampler,uTexture,uVInvMatrix,uVMatrix;

let startGL = canvas => {
   gl = start_gl(canvas, vertexShader, fragmentShader);
   uAspectRatio = gl.getUniformLocation(gl.program, "uAspectRatio");
   uBumpTexture = gl.getUniformLocation(gl.program, "uBumpTexture");
   uColor       = gl.getUniformLocation(gl.program, "uColor"      );
   uEye         = gl.getUniformLocation(gl.program, "uEye"        );
   uInvMatrix   = gl.getUniformLocation(gl.program, "uInvMatrix"  );
   uMaterial    = gl.getUniformLocation(gl.program, "uMaterial"   );
   uMatrix      = gl.getUniformLocation(gl.program, "uMatrix"     );
   uOpacity     = gl.getUniformLocation(gl.program, "uOpacity"    );
   uSampler     = gl.getUniformLocation(gl.program, "uSampler"    );
   uTexture     = gl.getUniformLocation(gl.program, "uTexture"    );
   uVInvMatrix  = gl.getUniformLocation(gl.program, "uVInvMatrix" );
   uVMatrix     = gl.getUniformLocation(gl.program, "uVMatrix"    );
   gl.uniform1iv(uSampler, [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]);
}

let M  = new Matrix();
let VM = new Matrix();

// LOAD TEXTURES

let animatedSource = [];
let material = 0;

let texture = (index, source) => {
   if (typeof source == 'string') {

      // IF THE TEXTURE SOURCE IS AN IMAGE FILE, IT ONLY NEEDS TO BE SENT TO THE GPU ONCE.

      let image = new Image();
      image.onload = () => {
         gl.activeTexture (gl.TEXTURE0 + index);
         gl.bindTexture   (gl.TEXTURE_2D, gl.createTexture());
         gl.texImage2D    (gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
         gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR_MIPMAP_NEAREST);
         gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
         gl.generateMipmap(gl.TEXTURE_2D);
      }
      image.src = source;
   }
   else {

      // FOR ANY OTHER TEXTURE SOURCE, WE MUST ASSUME THAT ITS CONTENT CAN BE ANIMATED.

      gl.activeTexture (gl.TEXTURE0 + index);
      gl.bindTexture   (gl.TEXTURE_2D, gl.createTexture());
      gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      animatedSource[index] = source;
   }
}

// DRAW A SINGLE SHAPE TO THE WEBGL CANVAS

let draw = args => {

   let Shape       = args.S;
   let color       = args.C;
   let opacity     = args.O;
   let texture     = args.T;
   let bumpTexture = args.B;

   // IF THIS IS AN ANIMATED TEXTURE SOURCE, SEND THE TEXTURE TO THE GPU AT EVERY ANIMATION FRAME.

   if (animatedSource[texture]) {
      gl.activeTexture(gl.TEXTURE0 + texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, animatedSource[texture]);
   }

   gl.uniform1f       (uAspectRatio, gl.canvas.width / gl.canvas.height);
   gl.uniform1f       (uOpacity    , opacity===undefined ? 1 : opacity);
   gl.uniform1i       (uTexture    , texture===undefined ? -1 : texture);
   gl.uniform1i       (uBumpTexture, bumpTexture===undefined ? -1 : bumpTexture);
   gl.uniform1i       (uMaterial   , material);
   gl.uniform3fv      (uColor      , color);
   gl.uniformMatrix4fv(uVInvMatrix , false, mInverse(VM.get()));
   gl.uniformMatrix4fv(uVMatrix    , false, VM.get()          );
   gl.uniformMatrix4fv(uInvMatrix  , false, mInverse(M.get()));
   gl.uniformMatrix4fv(uMatrix     , false, M.get()          );
   gl.bufferData(gl.ARRAY_BUFFER, Shape.mesh, gl.STATIC_DRAW);
   gl.drawArrays(Shape.type ? gl.TRIANGLE_STRIP : gl.TRIANGLES, 0, Shape.mesh.length / vertexSize);
   return M;
}

// DRAW THE SCENE FOR ONE ANIMATION FRAME, EITHER IN MONO OR IN STEREO

let isPhone = () => imu.alpha != null;

let drawScene = drawFunction => {
   if (! isPhone()) {                       // IF NOT ON A PHONE, JUST RENDER ONCE AND WE'RE DONE.
      drawFunction();
      return;
   }
   if (imu.alpha0 === undefined)            // IF ON A PHONE, WE NEED TO COMPUTE THE VIEW MATRIX
      imu.alpha0 = imu.alpha;               // BASED ON THE PHONE'S IMU DATA, THEN RENDER IN STEREO.
   VM.S();
      if (navigator.userAgent.match(/iPhone/i))
         VM.turnX(Math.PI/180 *  imu.gamma - Math.PI/2)
           .turnZ(Math.PI/180 * -imu.beta)
           .turnY(Math.PI/180 * (imu.alpha - imu.alpha0) + (Math.abs(imu.beta) > 90 ? Math.PI : 0));
      else
         VM.turnX(Math.PI/180 *  imu.gamma + Math.PI/2)
           .turnZ(Math.PI/180 *  imu.beta)
           .turnY(Math.PI/180 * (imu.alpha0 - imu.alpha));
      for (let eye = -1 ; eye <= 1 ; eye += 2) {
         gl.uniform1f(uEye, eye);
         drawFunction();
      }
   VM.R();
}

