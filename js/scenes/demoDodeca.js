import * as cg from "../render/core/cg.js";

let createEdges = (c,dist) => {
   let e = [];
   for (let i = 1 ; i < c.length ; i++)
   for (let j = 0 ; j < i ; j++)
      if (cg.distance(c[i],c[j]) < dist)
         e.push([i,j]);
   return e;
}

let dodecahedron = () => {
   let c = [], e = [], p = 2 / (1 + Math.sqrt(5));
   for (let i = -1 ; i <= 1 ; i += 2)
   for (let j = -1 ; j <= 1 ; j += 2) {
      let b = i*p, a = j+j*p;
      c.push([a,b,0],[b,0,a],[0,a,b],[i,j,-1],[i,j,1]);
   }
   return { corners: c, edges: createEdges(c,1.24) };
}

let icosahedron = () => {
   let c = [], e = [], p = (1 + Math.sqrt(5)) / 2;
   for (let i = -1 ; i <= 1 ; i += 2)
   for (let j = -p ; j <= p ; j += 2*p)
      c.push([0,i,j],[i,j,0],[j,0,i]);
   return { corners: c, edges: createEdges(c, 2.1) };
}

let rhombi = t => {
   let c = [];
   let D = dodecahedron();
   let I = icosahedron();
   for (let d = 0 ; d < D.corners.length ; d++) {
      let a = D.corners[d];
      for (let i = 0 ; i < I.corners.length ; i++) {
         let b = I.corners[i];
	 if (cg.distance(a,b) < 1.2)
	    c.push(cg.mix(a,b,t));
      }
   }
   return c;
}

let C  = rhombi(0.38);
let C0 = rhombi(0);
let C1 = rhombi(1);

let E = [];
for (let i = 1 ; i < C.length ; i++)
for (let j = 0 ; j < i ; j++)
   if (cg.distance(C[i],C[j]) < 1)
      E.push([i,j]);

let createEdge = (shape,a,b,r) => shape.add('tubeZ')
                                       .move(cg.mix(a,b,.5))
                                       .aimZ(cg.subtract(b,a))
                                       .scale(r,r,.5*cg.distance(a,b));

let wireFrame = (model, S, r) => {
   let shape = model.add().move(0,1.6,0).scale(.06);

   for (let n = 0 ; n < S.corners.length ; n++)
      shape.add('sphere').move(S.corners[n]).scale(1.3*r).color(20,0,0);

   for (let n = 0 ; n < S.edges.length ; n++)
      createEdge(shape, S.corners[S.edges[n][0]],
                        S.corners[S.edges[n][1]], r);

   return shape;
}

let R;

export const init = async model => {
   wireFrame(model, dodecahedron(), .05).color('silver');
   wireFrame(model, icosahedron (), .05).color('bronze').scale(.9106);
}

