"use strict";

// MISCELLANEOUS METHODS

   // Bezier interpolation in one dimension

   export let bezier = (t,a,b,c,d) => (1-t)*(1-t)*(1-t)*a + 3*(1-t)*(1-t)*t*b + 3*(1-t)*t*t*c + t*t*t*d;

   // Clamp a numeric value to a range.

   export let clamp = (t, lo=0, hi=1) => Math.max(lo, Math.min(hi, t));

   // If a value is undefined, give it a default value.

   export let def = (v, d) => v !== undefined ? v : d !== undefined ? d : 0;

   // Hermite interpolation in one dimension

   export let hermite = (t, a, b, da, db) => a * ( 2 * t*t*t - 3 * t*t + 1) +
                                             b * (-2 * t*t*t + 3 * t*t    ) +
                                            da * (     t*t*t - 2 * t*t + t) +
                                            db * (     t*t*t -     t*t    ) ;

   // Provide a unique random integer ID.

   export let uniqueID = () => 1000 * Math.floor(Math.random() * 1000000) + (Date.now() % 1000);

   // Two link inverse kinematics

   export let ik = (a,b,C,D) => {
      let cc = dot(C,C), x = (1 + (a*a - b*b)/cc) / 2, y = dot(C,D)/cc;
      for (let i = 0 ; i < 3 ; i++) D[i] -= y * C[i];
      y = Math.sqrt(Math.max(0,a*a - cc*x*x) / dot(D,D));
      for (let i = 0 ; i < 3 ; i++) D[i] = x * C[i] + y * D[i];
      return D;
   }

   // More convenient version of two link inverse kinematics

   export let ik2 = (A,B,len1,len2,aim) => add(A, ik(len1, len2, subtract(B, A), aim.slice()));

   // Linear mix between two angles

   export let mixAngle = (a, b, t) => {
      while (a - b > Math.PI) b += 2 * Math.PI;
      while (b - a > Math.PI) b -= 2 * Math.PI;
      return mixf(a, b, t);
   }

   // Cubic ease curve

   export let ease = t => {
      t = Math.max(0, Math.min(1, t));
      return t * t * (3 - t - t);
   }

   // Linear mix in one dimension

   export let mixf = (a,b,t,u) => a * (u===undefined ? 1-t : t) + b * (u===undefined ? t : u);

   // Pack an array of floats into a compact string representation.

   // Usage: pack(array)         -- lowest and highest array values must be: at least 0  and at most 1.
   //        pack(array, hi)     -- lowest and highest array values must be: at least 0  and at most hi.
   //        pack(array, lo, hi) -- lowest and highest array values must be: at least lo and at most hi.

   export let pack = (array, lo, hi) => {
      if (lo === undefined) { lo = 0; hi = 1; } else if (hi === undefined) { hi = lo ; lo = 0; }
      let pack = t => C92[92 * t >> 0] + C92[92 * (t % 1) + .5 >> 0];
      let s = '';
      for (let n = 0 ; n < array.length ; n++)
         s += pack((array[n] - lo) / (hi - lo));
      return s;
   }

   export let plateau = (a,b,c,d,t) => t<a || t>d ? 0 : t>b && t<c ? 1 : t<b ? (t-a)/(b-a) : (t-d)/(c-d);

   // Unpack a packed array. The lo, hi range must match the lo, hi range of the corresponding call to pack().

   export let unpack = (string, lo, hi) => {
      if (lo === undefined) { lo = 0; hi = 1; } else if (hi === undefined) { hi = lo ; lo = 0; }
      let unpack = (a, b) => (C92.indexOf(a) + C92.indexOf(b) / 92) / 92;
      let a = [];
      for (let n = 0 ; n < string.length ; n += 2)
         a.push(lo + (hi - lo) * unpack(string.charAt(n), string.charAt(n+1)));
      return a;
   }

   // Rounded string representations of a floating point value

   export let round = (t,n) => {
      if (t == 0) return ('0.00000000').substring(0, (n?n:2)+2);
      let sgn = Math.sign(t);
      let s = '' + (Math.abs(t) + .0000000001);
      return (sgn==1 ? '' : '-') + s.substring(0, s.indexOf('.') + (n?n:2) + 1);
   }

   export let decimal = (f, d) => {
      d = def(d, 2);
      for (let n = 0 ; n < d ; n++)
         f *= 10;
      let s = '' + (f >> 0);
      let int = s.substring(0, s.length-d);
      int = int == '-' ? '-0' : int == '' ? '0' : int;
      let dec = s.substring(s.length-d, s.length);
      while (dec.length < d)
         dec += '0';
      return (int.substring(0,1) !== '-' ? ' ' : '') + int + '.' + dec;
   }

   export let fixedWidth = (t,n,d) => {
      if (n === undefined) n = 0;
      if (d === undefined) d = 2;
      if (d == 0) {
         let s = '' + (t >> 0);
         if (s.substring(0,1) != '-') s = ' ' + s;
         while (s.length < n) s = ' ' + s;
         return s;
      }
      let p = 1; for (let k = 0 ; k < d ; k++) p *= 10;
      let s = '' + (p * t + .5*Math.sign(t) >> 0) / p;
      if (s.indexOf('.') == -1) s = s + '.';
      while (s.charAt(s.length-d-1) != '.') s = s + '0';
      if (s.substring(0,1) != '-') s = ' ' + s;
      while (s.length < n) s = ' ' + s;
      return s;
   }

   // Round to a specified number of digits all values within a vector

   export let roundFloat = (n, f) => {
      switch (n) {
      case 0: return      f >> 0;
      case 1: return (10 * f >> 0) / 10;
      case 2: return (100 * f >> 0) / 100;
      case 3: return (1000 * f >> 0) / 1000;
      case 4: return (10000 * f >> 0) / 10000;
      case 5: return (100000 * f >> 0) / 100000;
      }
      return f;
   }

   export let roundVec = (n,v) => {
      for (let i = 0 ; i < v.length ; i++)
         v[i] = roundFloat(n, v[i]);
      return v;
   }

   let c2i = c => c < 65 ? c - 48 : c < 65 ? c - 55 : c - 87;
   let h2f = h => Math.pow(c2i(h.charCodeAt(0)) / 16 + c2i(h.charCodeAt(1)) / 256,2.2);
   export let hexToRgba = hex => [ h2f(hex.substring(1,3)),
                                   h2f(hex.substring(3,5)),
				   h2f(hex.substring(5,7)),
                                   hex.length > 8 ? h2f(hex.substring(7,9)) : 1 ];
   let f2h = f => {
      const c = '0123456789abcdef';
      f = clamp(f,0,.999);
      let hi = 16 * f >> 0;
      let lo = 16 * (16 * f - hi) >> 0;
      return c[hi] + c[lo];
   }
   export let rgbToHex = rgb => '#' + f2h(rgb[0]) + f2h(rgb[1]) + f2h(rgb[2]);

// VECTOR METHODS

   export let add       = (a,b)     => { let v = []; for (let i=0 ; i<a.length ; i++) v.push(a[i] + b[i]); return v; }
   export let cross     = (a,b)     => [ a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0] ];
   export let distance  = (a,b)     => norm(subtract(a,b));
   export let dot       = (a,b)     => { let s = 0 ; for (let i=0 ; i<a.length ; i++) s += a[i] * b[i]; return s; }
   export let mix       = (a,b,t,u) => { let v = []; for (let i=0 ; i<a.length ; i++) v.push(mixf(a[i],b[i],t,u)); return v; }
   export let mixSimple = (a, b, t) => {
      return [
          a[0] + t * (b[0] - a[0]),
          a[1] + t * (b[1] - a[1]),
          a[2] + t * (b[2] - a[2])
      ];
   }
   export let norm      = v         => Math.sqrt(dot(v,v));
   export let normalize = v         => scale(v, 1 / norm(v));
   export let scale     = (a,s)     => { let v = []; for (let i=0 ; i<a.length ; i++) v.push(s * a[i]); return v; }
   export let subtract  = (a,b)     => { let v = []; for (let i=0 ; i<a.length ; i++) v.push(a[i] - b[i]); return v; }
   export let distVec3  = (a,b)     => { let dx = a[0] - b[0]; let dy = a[1] - b[1]; let dz = a[2] - b[2]; return Math.sqrt(dx * dx + dy * dy + dz * dz);}

// CURVE METHODS

   // Compute the total geometric length of a curve.

   export let computeCurveLength = curve => {
      let len = 0;
      for (let i = 0 ; i < curve.length - 1 ; i++)
         len += distance(curve[i], curve[i+1]);
      return len;
   }

   // Copy a curve.

   export let copyCurve = src => {
      let dst = [];
      for (let i = 0 ; i < src.length ; i++)
         dst.push(src[i].slice());
      return dst;
   }

   // Create a spline, given key points and number of samples per key.

   export let spline = (keys, dst, ptsPerKey) => {
      let spline = dst;
      if (spline === null || spline === undefined)
         spline = [];

      let N = def(ptsPerKey, 10);
      let nk = keys.length;
      let ns = 0;

      if (nk == 2) {
         for (let i = 0 ; i <= N ; i++)
            spline[ns++] = mixf(keys[0], keys[1], i / N);
         return spline;
      }

      function x(k) { return keys[k].x !== undefined ? keys[k].x : keys[k][0]; }
      function y(k) { return keys[k].y !== undefined ? keys[k].y : keys[k][1]; }
      function z(k) { return keys[k].z !== undefined ? keys[k].z : keys[k].length > 2 ? keys[k][2] : 0; }
      function l(k) { return L[k]; }

      function append(x,y,z) {
         if (keys[0].length == 2)
            spline[ns++] = [x,y];
         else
            spline[ns++] = [x,y,z];
      }

      let L = [];
      for (let n = 0 ; n < nk-1 ; n++) {
         let dx = x(n+1) - x(n), dy = y(n+1) - y(n), dz = z(n+1) - z(n);
         L.push(Math.sqrt(dx * dx + dy * dy + dz * dz));
      }

      let D = [];
      for (let n = 0 ; n < nk ; n++)
         D.push([ n == 0 ? (3*x(n+1) - 2*x(n) - x(n+2)) / 3
                : n<nk-1 ? (l(n) * (x(n) - x(n-1)) + l(n-1) * (x(n+1) - x(n))) / (l(n-1) + l(n))
                         : (2*x(n) - 3*x(n-1) + x(n-2)) / 3
                ,
                  n == 0 ? (3*y(n+1) - 2*y(n) - y(n+2)) / 3
                : n<nk-1 ? (l(n) * (y(n) - y(n-1)) + l(n-1) * (y(n+1) - y(n))) / (l(n-1) + l(n))
                         : (2*y(n) - 3*y(n-1) + y(n-2)) / 3
                ,
                  n == 0 ? (3*z(n+1) - 2*z(n) - z(n+2)) / 3
                : n<nk-1 ? (l(n) * (z(n) - z(n-1)) + l(n-1) * (z(n+1) - z(n))) / (l(n-1) + l(n))
                         : (2*z(n) - 3*z(n-1) + z(n-2)) / 3
                ]);


      if (x(0) == x(nk-1) && y(0) == y(nk-1) && z(0) == z(nk-1))
         for (let j = 0 ; j < 3 ; j++)
            D[0][j] = D[nk-1][j] = (D[0][j] + D[nk-1][j]) / 2;

      for (let n = 0 ; n < nk - 1 ; n++) {
         for (let i = 0 ; i < N ; i++) {
            let t = i / N, tt = t * t, ttt = t * tt;
            append(hermite(t, x(n), x(n+1), D[n][0] * .9, D[n+1][0] * .9),
                   hermite(t, y(n), y(n+1), D[n][1] * .9, D[n+1][1] * .9),
                   hermite(t, z(n), z(n+1), D[n][2] * .9, D[n+1][2] * .9));
         }
      }
      append(x(nk - 1), y(nk - 1), z(nk - 1));
      return spline;
   }

   // Resample a curve to equal geometric spacing.

   export let resampleCurve = (src, count) => {
      let dst = [];
      if (src.length == 0)
         return dst;

      count = def(count, 100);

      let D = [];
      for (let i = 0 ; i < src.length ; i++)
         D.push(i == 0 ? 0 : D[i-1] + distance(src[i], src[i-1]));

      dst.push(src[0].slice());
      let i = 1;
      let sum = D[src.length-1];
      for (let j = 1 ; j < count-1 ; j++) {
         let d = sum * j / (count-1);
         while (D[i] < d && i < src.length-1)
            i++;
         let f = (d - D[i-1]) / (D[i] - D[i-1]);
         dst[j] = mix(src[i-1], src[i], f);
      }
      dst.push(src[src.length-1].slice());

      return dst;
   }

   // Sample the value at a fractional distance along a curve.

   export let sample = (arr, t, isAngle) => {
      let mixFunction = isAngle ? mixAngle : mix;
      let n = arr.length;
      if (n == 1)
         return arr[0];
      if (t > 1) {
         let L = computeCurveLength(arr), i = n - 2;
         while (distance(arr[i], arr[n-1]) < L / 10)
            i--;
         return mixFunction(arr[i], arr[n-1], (t - i/(n-1)) / (1 - i/(n-1)));
      }
      t = Math.max(0, Math.min(0.999, t));
      let i = Math.floor((n-1) * t);
      let f = (n-1) * t - i;
      return mixFunction(arr[i], arr[i+1], f);
   }

   export let lerp = (t,a,b) => a + t * (b - a);

// KEN'S NEWER IMPLEMENTATION OF NOISE WHICH MATCHES HIS NEWER GPU IMPLEMENTATION

export let noise = (x,y,z) => {
   let normalize = v => { let s = Math.sqrt(dot(v,v)); return v.map(a => a/s); }
   let c = Math.cos,floor = Math.floor,dot = (a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
   let r = (x,y,z) => c(5 * (x + 5 * c(5 * (y + 5 * c(5 * (z + 5 * c(5 * x)))))));
   let s = (x,y,z) => normalize([ r(x,y,z), r(y,z,x), r(z,x,y) ]);
   let i = floor(x), j = floor(y), k = floor(z), u = x-i, v = y-j, w = z-k;
   let t = (x,y,z) => dot( s(i+x, j+y, k+z), [u-x, v-y, w-z] );
   let e = (f,a,b) => a + (b - a) * (f < .5 ? 2*f*f : 2*f*(2-f)-1);
   return e(w, e(v, e(u, t(0,0,0), t(1,0,0)), e(u, t(0,1,0), t(1,1,0))),
               e(v, e(u, t(0,0,1), t(1,0,1)), e(u, t(0,1,1), t(1,1,1))));
}

// GEOMETRY METHODS

export let isLineIntersectPoly = (A, B, P) => {
   let V = A.concat(1);
   let W = normalize(subtract(B,A)).concat(0);
   let t0 = -100000, t1 = 100000;
   for (let i = 0 ; i < P.length ; i++) {
      let pv = dot(P[i], V);
      let pw = dot(P[i], W);
      if (pw > 0)
         t0 = Math.max(t0, -pv / pw);
      else
         t1 = Math.min(t1, -pv / pw);
   }
   return t0 > t1 || t1 < 0 || t0 > distance(A, B) ? null : [t0, t1];
}

export let rayIntersectTriangle = (V,W, A,B,C) => {
   let AB = subtract(B,A), BC = subtract(C,B), CA = subtract(A,C);
   let Z = cross(AB, BC);
   let t = (dot(Z,A) - dot(Z,V)) / dot(Z,W);
   let P = add(V, scale(W, t));
   let I = cross(Z, BC), J = cross(Z, CA), K = cross(Z, AB);
   let d = (B, I, AB) => dot(subtract(P,B), I) / dot(AB, I);
   return Math.max(d(B,I,AB), d(C,J,BC), d(A,K,CA)) <= 0 ? t : -1;
}

export let isSphereIntersectBox = (S,B) => {
   let C = [ S[0] - B[12], S[1] - B[13], S[2] - B[14] ], r = S[3];
   let X = B.slice(0, 3), sx = norm(X), x = Math.abs(dot(C, X) / sx) - sx,
       Y = B.slice(4, 7), sy = norm(Y), y = Math.abs(dot(C, Y) / sy) - sy,
       Z = B.slice(8,11), sz = norm(Z), z = Math.abs(dot(C, Z) / sz) - sz;
   return ( x < 0 && y < 0 && z < 0 ? 0 :
            y < 0 && z < 0 ? x * x :
            z < 0 && x < 0 ? y * y :
            x < 0 && y < 0 ? z * z :
            x < 0 ? y * y + z * z :
            y < 0 ? z * z + x * x :
            z < 0 ? x * x + y * y :
            x * x + y * y + z * z ) <= r * r;
}

export let isBoxIntersectBox = (A,B) => {
   let P = [[1,0,0,1],[-1,0,0,1],[0,1,0,1],[0,-1,0,1],[0,0,1,1],[0,0,-1,1]];
   let isIntersect = (A,B) => {
      let C = mMultiply(mInverse(B), A);
      let mc = a => mTransform(C, a);
      for (let n = 0 ; n < 4 ; n++) {
         let u = n&1 ? 1 : -1, v = n&2 ? 1 : -1;
         if (isLineIntersectPoly(mc([-1,u,v]), mc([1,u,v]), P)) return true;
         if (isLineIntersectPoly(mc([v,-1,u]), mc([v,1,u]), P)) return true;
         if (isLineIntersectPoly(mc([u,v,-1]), mc([u,v,1]), P)) return true;
      }
      return false;
   }
   return isIntersect(A,B) || isIntersect(B,A);
}

export let isPointInBox = (point, matrix) => {
   let p = mTransform(mInverse(matrix), point);
   return p[0]*p[0] < 1 && p[1]*p[1] < 1 && p[2]*p[2] < 1;
}

// MATRIX METHODS

export let mAimX = (X,Y) => {
   let Z;
   X = normalize(X);
   if (Y === undefined) {
      let Y0 = cross([0,0,1], X), t0 = dot(Y0,Y0), Z0 = cross(X, Y0),
          Y1 = cross([1,1,0], X), t1 = dot(Y1,Y1), Z1 = cross(X, Y1),
          t  = t1 / (4 * t0 + t1);
      Y = normalize(mix(Y0, Y1, t)),
      Z = normalize(mix(Z0, Z1, t));
   }
   else {
      Z = normalize(cross(X,Y));
      Y = normalize(cross(Z,X));
   }
   return [ X[0],X[1],X[2],0, Y[0],Y[1],Y[2],0, Z[0],Z[1],Z[2],0, 0,0,0,1 ];
}

export let mAimY = (Y,Z) => {
   let X;
   Y = normalize(Y);
   if (Z === undefined) {
      let Z0 = cross([1,0,0], Y), t0 = dot(Z0,Z0), X0 = cross(Y, Z0),
          Z1 = cross([0,0,1], Y), t1 = dot(Z1,Z1), X1 = cross(Y, Z1),
          t  = t1 / (4 * t0 + t1);
      Z = normalize(mix(Z0, Z1, t));
      X = normalize(mix(X0, X1, t));
   }
   else {
      X = normalize(cross(Y,Z));
      Z = normalize(cross(X,Y));
   }
   return [ X[0],X[1],X[2],0, Y[0],Y[1],Y[2],0, Z[0],Z[1],Z[2],0, 0,0,0,1 ];
}

export let mAimZ = (Z,X) => {
   let Y;
   Z = normalize(Z);
   if (X === undefined) {
      let X0 = cross([0,1,0], Z), t0 = dot(X0,X0), Y0 = cross(Z, X0),
          X1 = cross([1,0,0], Z), t1 = dot(X1,X1), Y1 = cross(Z, X1),
          t  = t1 / (4 * t0 + t1);
      X = normalize(mix(X0, X1, t)),
      Y = normalize(mix(Y0, Y1, t));
   }
   else {
      Y = normalize(cross(Z,X));
      X = normalize(cross(Y,Z));
   }
   return [ X[0],X[1],X[2],0, Y[0],Y[1],Y[2],0, Z[0],Z[1],Z[2],0, 0,0,0,1 ];
}

export let mFromQuaternion = q =>
   [ 1 - 2 * (q.y * q.y + q.z * q.z),     2 * (q.z * q.w + q.x * q.y),     2 * (q.x * q.z - q.y * q.w), 0,
         2 * (q.y * q.x - q.z * q.w), 1 - 2 * (q.z * q.z + q.x * q.x),     2 * (q.x * q.w + q.y * q.z), 0,
         2 * (q.y * q.w + q.z * q.x),     2 * (q.z * q.y - q.x * q.w), 1 - 2 * (q.x * q.x + q.y * q.y), 0,  0,0,0,1 ];

export let mHitRect = (beamMatrix, objMatrix) => {
   let L = [[0,0,1,0],[1,0,0,1],[-1,0,0,1],[0,1,0,1],[0,-1,0,1]];
   let M = mTranspose(mMultiply(mInverse(objMatrix), beamMatrix));
   for (let i = 0 ; i < L.length ; i++)
      L[i] = mTransform(M, L[i]);
   let z = -L[0][3] / L[0][2];		// shift to perspective space.
   if (z > 0)				// if rect is behind the beam
      return null;			//    then give up.
   let F = i => z * L[i][2] + L[i][3];  // x or y as a function of z.
   for (let i = 1 ; i < L.length ; i++)
      if (F(i) < 0)			// if outside of any bounding plane
         return null;			//    then give up.
   return [F(1)-1, F(3)-1, -z];		// return [-1...1, -1...1, z-dist]
}

export let mIdentity = () => [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];

export let mInverse = src => {
   let dst = [], det = 0, cofactor = (c, r) => {
      let s = (i, j) => src[c+i & 3 | (r+j & 3) << 2];
      return (c+r & 1 ? -1 : 1) * ( (s(1,1) * (s(2,2) * s(3,3) - s(3,2) * s(2,3)))
                                  - (s(2,1) * (s(1,2) * s(3,3) - s(3,2) * s(1,3)))
                                  + (s(3,1) * (s(1,2) * s(2,3) - s(2,2) * s(1,3))) );
   }
   for (let n = 0 ; n < 16 ; n++) dst.push(cofactor(n >> 2, n & 3));
   for (let n = 0 ; n <  4 ; n++) det += src[n] * dst[n << 2];
   for (let n = 0 ; n < 16 ; n++) dst[n] /= det;
   return dst;
}

export let mMirrorZ = m => [ m[ 0], m[ 1],-m[ 2],0,
                             m[ 4], m[ 5],-m[ 6],0,
                            -m[ 8],-m[ 9], m[10],0,
                             m[12], m[13],-m[14],1 ];

export let mMultiply = (a,b) => {
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

export let mRotateX = theta => {
   let m = mIdentity();
   m[ 5] =  Math.cos(theta);
   m[ 6] =  Math.sin(theta);
   m[ 9] = -Math.sin(theta);
   m[10] =  Math.cos(theta);
   return m;
}

export let mRotateY = theta => {
   let m = mIdentity();
   m[10] =  Math.cos(theta);
   m[ 8] =  Math.sin(theta);
   m[ 2] = -Math.sin(theta);
   m[ 0] =  Math.cos(theta);
   return m;
}

export let mRotateZ = theta => {
   let m = mIdentity();
   m[ 0] =  Math.cos(theta);
   m[ 1] =  Math.sin(theta);
   m[ 4] = -Math.sin(theta);
   m[ 5] =  Math.cos(theta);
   return m;
}

export let mPerspective = fl => [ 1,0,0,0, 0,1,0,0, 0,0,-1,-1/fl, 0,0,-1,0 ];

export let mScale = (x,y,z) => {
   if (y === undefined)
      if (Array.isArray(x)) {
         z = x[2];
         y = x[1];
         x = x[0];
      }
      else
         y = z = x;
   let m = mIdentity();
   m[ 0] = x;
   m[ 5] = y;
   m[10] = z;
   return m;
}

export let mToQuaternion = m => {
   let x = Math.sqrt(Math.max(0, 1 + m[0] - m[5] - m[10])) * Math.sign(m[6] - m[9]) / 2,
       y = Math.sqrt(Math.max(0, 1 - m[0] + m[5] - m[10])) * Math.sign(m[8] - m[2]) / 2,
       z = Math.sqrt(Math.max(0, 1 - m[0] - m[5] + m[10])) * Math.sign(m[1] - m[4]) / 2;
   return { x: x, y: y, z: z, w: Math.sqrt(1 - x*x - y*y - z*z) };
}

export let mTransform = (m,p) => {
   let x = p[0], y = p[1], z = p[2], w = p[3] === undefined ? 1 : p[3];
   let q = [ m[0]*x + m[4]*y + m[ 8]*z + m[12]*w,
             m[1]*x + m[5]*y + m[ 9]*z + m[13]*w,
             m[2]*x + m[6]*y + m[10]*z + m[14]*w,
             m[3]*x + m[7]*y + m[11]*z + m[15]*w ];
   return p[3] === undefined ? [ q[0]/q[3],q[1]/q[3],q[2]/q[3] ] : q;
}

export let mTranslate = (x,y,z) => {
   if (y === undefined) {
      z = x[2];
      y = x[1];
      x = x[0];
   }
   let m = mIdentity();
   m[12] = x;
   m[13] = y;
   m[14] = z;
   return m;
}

export let mTranspose = m => [ m[0],m[4],m[ 8],m[12],
                               m[1],m[5],m[ 9],m[13],
                               m[2],m[6],m[10],m[14],
                               m[3],m[7],m[11],m[15] ];

export let mProject = (x,y,z) => [1,0,0,x, 0,1,0,y, 0,0,1,z, 0,0,0,1 ];


export let Matrix = function() {
   let top = 0, m = [ mIdentity() ];
   this.aimX      = (X,Y)   => this.setValue(mMultiply(m[top], mAimX(X,Y)));
   this.aimY      = (Y,Z)   => this.setValue(mMultiply(m[top], mAimY(Y,Z)));
   this.aimZ      = (Z,X)   => this.setValue(mMultiply(m[top], mAimZ(Z,X)));
   this.getValue  = ()      => m[top].slice();
   this.identity  = ()      => this.setValue(mIdentity());
   this.inverse   = ()      => this.setValue(mInverse(m[top]));
   this.project   = (x,y,z) => this.setValue(mMultiply(m[top], mProject(x,y,z)));
   this.restore   = ()      => { --top; return this; }
   this.rotateX   = theta   => this.setValue(mMultiply(m[top], mRotateX(theta)));
   this.rotateY   = theta   => this.setValue(mMultiply(m[top], mRotateY(theta)));
   this.rotateZ   = theta   => this.setValue(mMultiply(m[top], mRotateZ(theta)));
   this.save      = ()      => { m[top+1] = m[top].slice(); top++; return this; }
   this.scale     = (x,y,z) => this.setValue(mMultiply(m[top], mScale(x,y,z)));
   this.setValue  = value   => { m[top] = value.slice(); return this; }
   this.translate = (x,y,z) => this.setValue(mMultiply(m[top], mTranslate(x,y,z)));
   this.transpose = ()      => this.setValue(mTranspose(m[top]));
}

export let packMatrix = m => { // PACK A ROTATION+TRANSLATION MATRIX (SCALING IS NOT SUPPORTED)
   let I = t => 10000 * t >> 0, Q = mToQuaternion(m);
   return [ I(m[12]), I(m[13]), I(m[14]), I(Q.x), I(Q.y), I(Q.z) ];
}

export let unpackMatrix = P => { // UNPACK A ROTATION+TRANSLATION MATRIX
   let x = P[3]/10000, y = P[4]/10000, z = P[5]/10000, w = Math.sqrt(1 - x * x - y * y - z * z);
   return mFromQuaternion({x:x, y:y, z:z, w:w}).slice(0, 12).concat([P[0]/10000, P[1]/10000, P[2]/10000, 1]);
}

let C92 = " !#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~";
export let packC   = t => { let n = (t + 1.27) / .0003 >> 0; return C92[n / 92 >> 0] + C92[n % 92]; }
export let unpackC = s => .0003 * (92 * C92.indexOf(s.charAt(0)) + C92.indexOf(s.charAt(1))) - 1.27;

export let vec2vecProj = (a,b) => {
   let proj = dot(a,b)/dot(b,b);
   return [b[0]*proj,b[1]*proj,b[2]*proj];
}

export let vec2planeProj = (a,n) => {
   let proj = dot(a,n)/(norm(n)*norm(n));
   return [a[0]-n[0]*proj,a[1]-n[1]*proj,a[2]-n[2]*proj];
}

export let vec2DRotate = (v,theta) => {
    return [v[0]*Math.cos(theta)-v[1]*Math.sin(theta),v[0]*Math.sin(theta)+v[1]*Math.cos(theta)];
}

export let vec3DRotate = (v,x,y,z) => {
    let rotateZ = vec2DRotate([v[0], v[1]], z);
    v[0] = rotateZ[0];
    v[1] = rotateZ[1];

    let rotateY = vec2DRotate([v[2], v[0]], y);
    v[2] = rotateY[0];
    v[0] = rotateY[1];

    let rotateX = vec2DRotate([v[1], v[2]], x);
    v[1] = rotateX[0];
    v[2] = rotateX[1];

    return v;
}

export let r_axis = (theta,axis) => {
   axis = normalize(axis);
   return [Math.cos(theta)+axis[0]*axis[0]*(1-Math.cos(theta)),axis[0]*axis[1]*(1-Math.cos(theta))-axis[2]*Math.sin(theta),axis[0]*axis[2]*(1-Math.cos(theta))+axis[1]*Math.sin(theta),
           axis[0]*axis[1]*(1-Math.cos(theta))+axis[2]*Math.sin(theta),Math.cos(theta)+axis[1]*axis[1]*(1-Math.cos(theta)),axis[1]*axis[2]*(1-Math.cos(theta))-axis[0]*Math.sin(theta),
           axis[0]*axis[2]*(1-Math.cos(theta))-axis[1]*Math.sin(theta),axis[1]*axis[2]*(1-Math.cos(theta))+axis[0]*Math.sin(theta),Math.cos(theta)+axis[2]*axis[2]*(1-Math.cos(theta))];
}

export let rmMultiply = (r, m) => {
   let mm = [0,0,0];
   for (let i = 0; i < 3; i++) {
      mm[i] = dot(r.slice(i*3,i*3+3),m);
   }
   return mm;
}

export let rotateAroundAxis = (v, theta, axis) => {
   let r = r_axis(theta, axis);
   return rmMultiply(r,v);
}

// PHYSICS

export function Deriv() {
   this.set = p => P = p;
   this.get = () => V;
   this.update = () => { V = P - _P; _P = P; }
   let P = 0, _P = 0, V = 0;
}

export function Spring() {
   this.getPosition = () => P;
   this.setDamping  = d  => D = d;
   this.setForce    = f  => F = f;
   this.setMass     = m  => M = Math.max(0.001, m);
   this.update = e => {
      V += (F - P) / M * e;
      P  = (P + V) * (1 - D * e);
   }        
   let D = 1, F = 0, M = 1, P = 0, V = 0;
}              

export function DOF() {
   this.setPosition = p  => P = p;
   this.setDamping  = d  => spring.setDamping(d);
   this.setForce    = f  => spring.setForce(f);
   this.setMass     = m  => spring.setMass(m);
   this.getPosition = () => spring.getPosition();

   this.update = e => {
      d1.set(P);
      d1.update();
      d2.set(d1.get());
      d2.update();
      spring.setForce(d2.get());
      spring.update(e);
   }

   let d1 = new Deriv();
   let d2 = new Deriv();
   let spring = new Spring();
   let P = 0;
}

export let computeQuadric = (s) => {
      let IM = mInverse(s.M);
      s.Q = mMultiply(mTranspose(IM),
                      mMultiply([1, 0, 0, 0,
                                 0, 1, 0, 0,
                                 0, 0, 1, 0,
                                 0, 0, 0,-1], IM));
}

export let quat2eul = (quat_vec ) =>{
   let x = quat_vec[0];
   let y = quat_vec[1];
   let z = quat_vec[2];
   let w = quat_vec[3];

   let eul = 0; 
   const t0 = 2.0 * (w * x + y * z);
    const t1 = 1.0 - 2.0 * (x * x + y * y);
    const roll_x = Math.atan2(t0, t1);

    const t2 = 2.0 * (w * y - z * x);
    t2 > 1.0 && (t2 = 1.0);
    t2 < -1.0 && (t2 = -1.0);
    const pitch_y = Math.asin(t2);

    const t3 = 2.0 * (w * z + x * y);
    const t4 = 1.0 - 2.0 * (y * y + z * z);
    const yaw_z = Math.atan2(t3, t4);

   return eul = { roll: roll_x, pitch: pitch_y, yaw: yaw_z }; 
}

