import * as cg from "./cg.js";

const tw=.032, th=.018;

export function Toio(model, hue) {
   let root = model.add(), others = [];
   root.add('cube').move(0,th/2,0).scale(tw/2,th/2,tw/2);
   root.add('cube').move(0,th,0).scale(tw/2,.0001,tw/2).color(cg.mix([1,1,1],hue,.5));
   root.add('sphere').move(0,th/2,tw/2).scale(tw/13).color(hue);
   let steer = (B, mov, rot, far) => {
      let X = root.getMatrix().slice(0,3);
      let A = root.getMatrix().slice(12,15);
      let D = cg.subtract(B,A);
      let d = cg.norm(D);
      if (mov != 0)
         root.move(0,0,.01 * Math.min(.1, mov * d));
      if (d < far) {
	 let r = rot * cg.dot(X,D) * (far - d) / far;
	 root.turnY(Math.max(-.1, Math.min(.1, r)));
      }
   }

   this.getMatrix = () => root.getMatrix();
   this.getPos = () => root.getMatrix().slice(12,15);
   this.others = _others => others = _others;
   this.setPos = (x,y,z) => root.identity().move(x,y,z);
   this.setXZR = (x,z,r) => {
      let m = root.getMatrix();
      let c = Math.cos(r), s = Math.sin(r);
      root.setMatrix([c,0,-s,0, 0,1,0,0, s,0,c,0, x,m[13],z,1]);
   }
   this.update = P => {
      for (let n = 0 ; n < others.length ; n++)   // STEER AWAY FROM OTHER TOIOS.
         steer(others[n].getPos(), 0, -12, 3*tw);
      steer(P, 1, 1, 1000);                       // STEER TOWARD TARGET POINT.
   }
}

