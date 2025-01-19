// This is currently a placeholder to place all the functions related to implicit surface, they are
// directly copy & paste from clay.js and need future organizing & testing

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

    // POSSIBLY REBUILD THE IMPLICIT SURFACE

    if (textureState==2 || isNewTextureCode || ! isRubber && activeState() && frameCount % 4 == 0) {
         implicitSurface.remesh();
         if (toRubber) {
            isRubber = true;
            toRubber = false;
         }
         isNewTextureCode = false;
      }

// DRAW THE MODEL
   
    implicitSurface.beginBlobs();

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
      let C = cg.mix(s.A, s.B, 0.5),
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
      let u = matrix_transform(vmi, cg.normalize([x,y,-fl,0]));
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
      let A = cg.dot(u, matrix_transform(Q, u)),
          B = cg.dot(u, matrix_transform(Q, p)),
          C = cg.dot(p, matrix_transform(Q, p)),
          D = B*B - A*C;
      return D < 0 ? 10000 : (-B - Math.sqrt(D)) / A;
   }

   // GET THE DISTANCE TO THE BLOB AT A PIXEL

   let blobZ = (n, x,y) => {
      let p = [0,0,fl,1];
      let u = cg.normalize([x,y,-fl,0]);
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


// SET IMPLICIT SURFACE PROPERTIES
   
      implicitSurface.setBlur(blur);
      implicitSurface.setDivs(isFewerDivs ? 15 : activeState() ? 30 : 60);
      implicitSurface.setFaceted(isFaceted);
      implicitSurface.setNoise(textureState);
      implicitSurface.setIsTexture(isTexture);
      implicitSurface.setTextureSrc(isTextureSrc ? 'media/textures/wood.png' : '');