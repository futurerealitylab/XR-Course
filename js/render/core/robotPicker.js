import * as cg from "./cg.js";

export function RobotPicker(model, POS, LEN1, LEN2) {
   this.ik = true;
   this.scale = .5;
   this.color = 'red';

   let robotColor = [.3,.3,.3];
   let motorColor = [.1,.5,1];

   this.root  = model.add().color(robotColor);
   let base   = this.root.add().move(0,.147,0);
   let turret = base.add().color(motorColor);
   let limb1  = base.add().color(motorColor);
   let limb2  = base.add().color(robotColor);

   base.add('cube').move(0,-.121,0).scale(.1,.026,.1);

   turret.add('tubeY8').move(0,.08-.15,0).scale(.064,.024,.064).turnY(Math.PI/8);
   turret.add('cube'  ).move(0,.12-.15,0).scale(.0245,.03 ,.059);
   turret.add('tubeX' ).move(0,.15-.15,0).scale(.0245,.06 ,.059);
   turret.add('tubeX' ).move(-.03,   0,0).scale(.03 ,.01 ,.01);

   limb1.add('cube'  ).move(-.055,LEN1/2-.01,0).scale(.015,LEN1/2+.01,.015).color(robotColor);
   limb1.add('tubeX' ).move(-.055,LEN1      ,0).scale(.025,.05,.05);
   limb1.add('tubeX' ).move(-.035,LEN1      ,0).scale(.035,.01,.01);

   limb2.add('cube'  ).move(0,LEN2/2-.01,0).scale(.015,LEN2/2+.01,.015).color(robotColor);
   limb2.add('sphere').move(0,LEN2      ,0).scale(.03);

   this.update = P => {
      this.root.identity().move(POS).scale(this.scale);
      limb2.child(1).color(this.color);

      if (this.ik) {
	 P = cg.subtract(P, POS);
	 P = cg.scale(P, 1/this.scale);
	 P[1] -= .147;
	 if (cg.norm(P) > LEN1 + LEN2)
	    P = cg.scale(cg.normalize(P), LEN1 + LEN2);
	 let a = Math.atan2(P[0], P[2]);

	 let x = Math.sqrt(P[0]*P[0] + P[2]*P[2]);
	 let D = cg.ik(LEN1, LEN2, [x,P[1],0], [0,1,0]);
	 if (cg.norm(D) > LEN1)
	    D = cg.scale(cg.normalize(D), LEN1);
	 let E = [ Math.sin(a)*D[0], D[1], Math.cos(a)*D[0] ];
	 let b = Math.atan2(D[0], D[1]);

         turret.identity().turnY(a);
         limb1 .identity().turnY(a).turnX(b);
	 let Y = cg.normalize(cg.subtract(P, E)),
	     X = cg.normalize(cg.cross(Y, [0,1,0])),
	     Z = cg.normalize(cg.cross(X, Y));
	 limb2.setMatrix([X[0],X[1],X[2],0,
	                  Y[0],Y[1],Y[2],0,
	                  Z[0],Z[1],Z[2],0,
	                  E[0],E[1],E[2],1]);
      }
      else {
         let t = model.time;
         let a = t;
         let b = Math.sin(t * 0.8) / 2;
         let c = Math.PI + Math.sin(t * 1.2);

         turret.identity().turnY(a);
         limb1 .identity().turnY(a).turnX(b);
         limb2 .identity().turnY(a).turnX(b).move(0,LEN1,0).turnX(c);
      }
   }

   this.update([POS[0],POS[1]+.1,POS[2]+.1]);
}

