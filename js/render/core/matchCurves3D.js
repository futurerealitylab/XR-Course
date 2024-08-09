"use strict";

import * as cg from "./cg.js";
import { addGlyphs } from "./addGlyphs.js";

function MatchCurves() {
   let glyphs = [];
   let distance = (a,b) => Math.sqrt((a[0]-b[0])*(a[0]-b[0]) + (a[1]-b[1])*(a[1]-b[1]));
   let swap = (a,b,k) => { let tmp = a[k]; a[k] = b[k]; b[k] = tmp; }
   let mix = (a,b,t) => a + t * (b - a);
   let hermite = (p1,p2,d1,d2,t) => ( 2*t*t*t - 3*t*t     + 1) * p1 +
                                    (-2*t*t*t + 3*t*t        ) * p2 +
                                    (   t*t*t - 2*t*t + t    ) * d1 +
                                    (   t*t*t -   t*t        ) * d2 ;
   let bestXYS = (P, Q) => {
      let x=0, y=0, s=0, w=0;
      for (let m = 0 ; m < P.length ; m++) {
         let A=P[m], B=Q[m], n=A.length, a=0, b=0, c=0, d=0, e=0, f=0;
         for (let i = 0 ; i < n ; i++) {
            let ax = A[i][0], ay = A[i][1],
                bx = B[i][0], by = B[i][1];
            a += ax;
            b += ay;
            c += bx;
            d += by;
            e += ax * ax + ay * ay;
            f += ax * bx + ay * by;
         }
         let M = [ [n,0,a,c], [0,n,b,d], [a,b,e,f] ];
         for (let i = 0 ; i < 3 ; i++) {
            let I = i, a = Math.abs(M[i][i]);
            for (let k = i+1 ; k < 3 ; k++)
               if (Math.abs(M[k][i]) > a)
                  a = Math.abs(M[I = k][i]);
            for (let k = i ; k <= 3 ; k++)
               swap(M[I],M[i],k);
            for (let k = i+1 ; k < 3 ; k++) {
               let c = -M[k][i] / M[i][i];
               for(let j = i ; j <= 3 ; j++)
                  M[k][j] = i==j ? 0 : M[k][j] + c * M[i][j];
            }
         }
         let xys = [];
         for (let i = 2 ; i >= 0 ; i--) {
            xys[i] = M[i][3] / M[i][i];
            for (let k = i-1 ; k >= 0 ; k--)
               M[k][3] -= M[k][i] * xys[i];
         }
         let t = this.curveLength(B);
         x += t * xys[0];
         y += t * xys[1];
         s += t * xys[2];
         w += t;
      }
      return [x/w, y/w, s/w];
   }
   let normalize = src => {
      let dst = [], xlo = 1000000, xhi = -xlo, ylo = xlo, yhi = xhi;
      for (let n = 0 ; n < src.length ; n++) {
         let s = src[n];
         for (let i = 0 ; i < s.length ; i++) {
            xlo = Math.min(xlo, s[i][0]);
            xhi = Math.max(xhi, s[i][0]);
            ylo = Math.min(ylo, s[i][1]);
            yhi = Math.max(yhi, s[i][1]);
         }
      }
      for (let n = 0 ; n < src.length ; n++) {
         let s = src[n];
         let x = (xlo + xhi) / 2;
         let y = (ylo + yhi) / 2;
         let r = Math.max(xhi - xlo, yhi - ylo) / 2;
         let d = [];
         for (let i = 0 ; i < s.length ; i++)
	    if (s[i].length == 2)
               d.push([(s[i][0] - x) / r, (s[i][1] - y) / r]);
            else
               d.push([(s[i][0] - x) / r, (s[i][1] - y) / r, s[i][2] / r]);
         dst.push(d);
      }
      return dst;
   }
   this.resample = (src, n) => {
      let L = [0];
      for (let i = 1 ; i < src.length ; i++)
         L[i] = L[i-1] + distance(src[i-1], src[i]);
      for (let i = 0 ; i < src.length ; i++)
         L[i] /= L[L.length-1];
   
      let m = src.length, dst = [];
      for (let j = 0 ; j < n ; j++) {
         dst.push([]);
         let t = Math.min(.9999, j / (n-1));
         for (let i = 0 ; i < src.length ; i++)
            if (t >= L[i] && t < L[i+1]) {
               let f = (t - L[i]) / (L[i+1] - L[i]);
               for (let k = 0 ; k < src[i].length ; k++)
                  dst[j][k] = mix(src[i][k], src[i+1][k], f);
               break;
            }
      }
      return dst;
   }
   
   this.glyph = k => glyphs[k];
   this.nGlyphs = () => glyphs.length;
   
   this.curveLength = src => {
      let len = 0;
      for (let i = 1 ; i < src.length ; i++)
         len += distance(src[i-1], src[i]);
      return len;
   }

   this.addGlyphFromCurves = (name, curves, code) => {
      let C = [];
      for (let n = 0 ; n < curves.length ; n++)
         C.push(this.resample(curves[n], 100));
      glyphs.push({
         name   : name,
         curves : normalize(C),
         code   : code,
      });
   }

   this.addGlyph = (name,...args) => {
      let curves = [];
      for (let n = 0 ; n < args.length ; n++) {
         let arg = args[n];
         let curve = [];
         for (let i = 0 ; i < arg.length ; i++) {
            let p = arg[i];
            if (typeof p != 'number')
	       curve.push([p[0],p[1],0]);
            else if (i >= 2 && i < arg.length - 2) {
               let x0 = arg[i-2][0], y0 = arg[i-2][1],
                   x1 = arg[i-1][0], y1 = arg[i-1][1],
                   x2 = arg[i+1][0], y2 = arg[i+1][1],
                   x3 = arg[i+2][0], y3 = arg[i+2][1],
                   d1 = distance([x0,y0],[x1,y1]),
                   d2 = distance([x2,y2],[x3,y3]),
                   u1 = 2 * p * (x1-x0) / d1,
                   v1 = 2 * p * (y1-y0) / d1,
                   u2 = 2 * p * (x3-x2) / d2,
                   v2 = 2 * p * (y3-y2) / d2;
               for (let t = 1/20 ; t < 1 ; t += 1/20)
                  curve.push([ hermite(x1,x2,u1,u2,t), hermite(y1,y2,v1,v2,t), 0 ]);
            }
         }
         curves.push(curve);
      }
      this.addGlyphFromCurves(name, curves);
   }
   
   this.recognize = src => {
      let strokes = [];
      for (let n = 0 ; n < src.length; n++)
         strokes.push(this.resample(src[n], 100));
      let candidate = normalize(strokes);
   
      let K = 0, lowScore = 1000000;
      for (let k = 0 ; k < glyphs.length ; k++) {
         let curves = glyphs[k].curves;
         if (curves.length == candidate.length) {
            let score = 0;
            for (let n = 0 ; n < curves.length ; n++) {
	       let curve = curves[n];
               let curveLen = this.curveLength(curve);
               for (let i = 0 ; i < 100 ; i++) {
                  let dx = candidate[n][i][0] - curve[i][0];
                  let dy = candidate[n][i][1] - curve[i][1];
                  score += (dx * dx + dy * dy) * curveLen;
               }
            }
            if (score < lowScore) {
               lowScore = score;
               K = k;
            }
         }
      }

      let zSum = 0, count = 0;
      for (let n = 0 ; n < strokes.length ; n++)
      for (let i = 0 ; i < strokes[n].length ; i++) {
         zSum += strokes[n][i][2];
         count++;
      }
      let z = zSum / count;
   
      let curves = glyphs[K].curves;
      let xys = bestXYS(curves, strokes);
      let x = xys[0], y = xys[1], s = xys[2];
      let targetStrokes = [];
      for (let n = 0 ; n < curves.length ; n++) {
         let curve = curves[n];
         let targetStroke = [];
         for (let i = 0 ; i < 100 ; i++)
            targetStroke.push([ x + s * curve[i][0],
                                y + s * curve[i][1],
                                z + s * curve[i][2] ]);
         targetStrokes.push(targetStroke);
      }
      return [strokes, targetStrokes, K, [x,y,z,s]];
   }
   
   this.mix = (A,B,t) => {
      let C = [];
      for (let n = 0 ; n < A.length ; n++) {
         let a = A[n], b = B[n], c = [];
         for (let i = 0 ; i < A[n].length ; i++)
            c.push([ a[i][0] + t * (b[i][0] - a[i][0]),
                     a[i][1] + t * (b[i][1] - a[i][1]),
		     a[i][2] + t * (b[i][2] - a[i][2]) ]);
         C.push(c);
      }
      return C;
   }

   this.animate = (f, m, time, T) => {
      let src = f(time);
      m = cg.mMultiply(cg.mTranslate(T[0],T[1],T[2]),
          cg.mMultiply(cg.mScale(T[3],T[3],T[3]*cg.ease(time/2)), m));
      let dst = [];
      for (let n = 0 ; n < src.length ; n++) {
         let curve = [];
         for (let i = 0 ; i < src[n].length ; i++)
            curve.push(cg.mTransform(m, src[n][i]));
         dst.push(this.resample(curve, 20));
      }
      return dst;
   }
}
 
export let matchCurves = new MatchCurves();

addGlyphs(matchCurves);

