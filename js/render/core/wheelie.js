import * as cg from './cg.js';

/*
	We support three kinds of behaviors:
	(1) Move to a target location
	(2) Look at a target 3D point with weight between 0 and 1.
	(3) Ambient behaviors showing personality: pose = height,turn,nod,tilt
	    a) Create target moods influencers, including shy, bold, curious, etc.
	    b) Use time-varying noise to pseudo-randomly vary between these.
	    c) Allow user to change the relative weight of each mood influencer.
	    values of pose.turn and pose.nod are overridden by look point.
*/

export function Wheelie(model, POS) {

   this.ik     = 1;

   let metal = [.8/4,.6/4,0, .8,.6,0, 20];

   let root = model.add();

   let wheelie  = root.add().color(0,.45,1);
   let body     = wheelie.add();
   let ankle    = body.add();
   let waist    = ankle.add();
   let shoulder = waist.add();

   let head = root.add().color(0,.45,1);

   let neck = head.add('sphere').scale(.025).color(metal);
   let ring = head.add('tubeZ' ).move(0,0,.016).scale(.026,.026,.007).color('black').dull();
   let face = head.add('cube'  ).move(0,0,.04).scale(.1,.05,.03);
   let leye = head.add('sphere').move(-.05,0,.07).scale(.03,.03,.003).color('white');
   let reye = head.add('sphere').move( .05,0,.07).scale(.03,.03,.003).color('white');

   let asep = .055, len = .08, angle = Math.PI / 5, wsep = .1;

   let antennae = head.add().move(0,.02,.04);
   antennae.add('tubeY' ).move( asep,0,0).turnZ(-angle).move(0,len,0).scale(.005,len,.005).color(metal);
   antennae.add('tubeY' ).move(-asep,0,0).turnZ( angle).move(0,len,0).scale(.005,len,.005).color(metal);
   antennae.add('sphere').move( asep,0,0).turnZ(-angle).move(0,2*len,0).scale(.02).color('red');
   antennae.add('sphere').move(-asep,0,0).turnZ( angle).move(0,2*len,0).scale(.02).color('red');

   let lpupil = leye.add('sphere').color(0,0,0).dull();
   let rpupil = reye.add('sphere').color(0,0,0).dull();

   let butt1  = waist.add('tubeX').move(-.015-.022,0,0).scale(.021,.05,.05);
   let butt2  = waist.add('tubeX').move(-.015+.022,0,0).scale(.021,.05,.05);
   let butt3  = waist.add('tubeX').move(-.015,0,0).scale(.005,.03,.03).color(metal);
   let upper  = waist.add('tubeY').move(0,.2,0).scale(.01,.2,.01).color(metal);

   let lower1 = ankle.add('sphere').scale(.025).color(metal);
   let lower2 = ankle.add('tubeY' ).move(0,.2,0).scale(.013,.2,.013).color(metal);

   let base   = body.add('cube'  ).scale(.04,.025,.03);
   let ring2  = body.add('tubeY' ).move(0,.025,0).scale(.026,.001,.026).color('black').dull();
   let lwheel = body.add('tubeX' ).move(-wsep,0,0).scale(.03,.05,.05);
   let rwheel = body.add('tubeX' ).move( wsep,0,0).scale(.03,.05,.05);
   let ltire  = body.add('torusX').move(-wsep,0,0).scale(.07,.05,.05).color(0,0,0);
   let rtire  = body.add('torusX').move( wsep,0,0).scale(.07,.05,.05).color(0,0,0);
   let axle   = body.add('tubeX' ).scale(wsep,.014,.014).color(metal);

   let rotX = 0;
   let rotY = 0;
   let travelDelta = 0, travelValue = 0;

   let xzTarget = [0,0];
   this.setXZTarget = T => {
      xzTarget = T.slice();
      rampUp = 0;
   }
   this.getXZ = () => [ pos[0], pos[2] ];
   this.isAtXZTarget = () => cg.distance(xzTarget, this.getXZ()) < .01;

   let lookTarget = [0,0,0], isLooking = false;
   this.setLookTarget = P => {
      isLooking = true;
      lookTarget = P.slice();
   }

   let adiff = (a,b) => {
      while (a > b + Math.PI) a -= 2 * Math.PI;
      while (a < b - Math.PI) a += 2 * Math.PI;
      return a - b;
   }

   let turn1 = 0, turn2 = 0;

   let rampUp = 0;

   let blinkTime = 0;

   let advanceToward = (xz,e) => {
      let D = [xz[0]-P[0], xz[1]-P[1]];
      let d = Math.sqrt(D[0]*D[0] + D[1]*D[1]);
      if (d > e) {
         rampUp += 10 * e;
         e *= Math.min(1, rampUp);
         if (d < .1)
	    e = d * 10 * e;
         let a = Math.atan2(D[1], D[0]);
	 let turn = adiff(a, P[2]);
         P[2] += e * turn * 2 / d;
         P[0] += e * Math.cos(P[2]);
         P[1] += e * Math.sin(P[2]);
	 turn1 -= .1 * turn;
	 turn1 *= .9;
      }
      return P;
   }

   let prevPos;

   let P = [0,0,0];

   let rotXdof = new cg.DOF();
   rotXdof.setMass(2);

   let rotYdof = new cg.DOF();
   rotYdof.setDamping(2);

   let traveldof = new cg.DOF();
   traveldof.setMass(100);

   let pos = POS;

   this.update = time => {
      let dir = 0;

      if (this.ik) {
	 P = advanceToward(xzTarget, .002);
	 pos = [P[0], pos[1], P[1]];
	 dir = Math.PI/2 - P[2];
      }

      let bend = .8 - rotY;
      let fwd = .2 * bend + 50000 * travelValue;

      fwd = Math.max(-.4, Math.min(.4, fwd));

      if (prevPos !== undefined)
         travelDelta = cg.norm(cg.subtract(pos, prevPos));
      prevPos = pos.slice();

      let fx = 2 * cg.noise(100,0,time / 2);
      let fy = 2 * cg.noise(200,0,time / 2);
      let ft =     cg.noise(300,0,time / 8);
      let F = cg.mTransform(wheelie.getMatrix(), [fx,fy+tableHeight,1]);
      wheelie .identity().move(pos).turnY(dir).scale(3*thingsScale);
      body    .identity().move(0,.069,0);
      ankle   .identity().move(0,.03,0).turnY(rotX).turnX(-bend + fwd);
      waist   .identity().move(0,.4,0).turnX(2 * bend).move(.032,0,0);
      shoulder.identity().move(0,.4,0).turnX(-bend - fwd);

      // TURN THE HEAD TOWARD THE GAZE TARGET

      let L = isLooking ? lookTarget : F;

      let T = cg.mMultiply(wheelie.getMatrix(),
              cg.mMultiply(body.getMatrix(),
              cg.mMultiply(ankle.getMatrix(),
              cg.mMultiply(waist.getMatrix(),
                           shoulder.getMatrix())))).slice(12,15);
      let ZL = cg.normalize(cg.subtract(L, T));
      let ZF = cg.normalize(cg.subtract(F, T));
      let lookFraction = Math.max(0, Math.min(1, 1.5 * cg.dot(ZL,ZF)));
      let Z = cg.mix(ZF, ZL, lookFraction);
      let X = cg.normalize(cg.cross([0,1,0], Z));
      let Y = cg.normalize(cg.cross(Z, X));
      let M = [ X[0],X[1],X[2],0, Y[0],Y[1],Y[2],0, Z[0],Z[1],Z[2],0, T[0],T[1],T[2],1 ];
      head.setMatrix(M).turnZ(ft).scale(3*thingsScale);

      let lookX = (1 - lookFraction) * (cg.dot(X, F) - .01);
      let lookY = (1 - lookFraction) * (cg.dot(Y, F) - .85);

      rotXdof.setPosition(lookX);
      rotXdof.update(model.deltaTime);
      rotX = 70 * rotXdof.getPosition();

      rotYdof.setPosition(lookY);
      rotYdof.update(model.deltaTime);
      rotY = 20 * rotYdof.getPosition();

      traveldof.setPosition(travelDelta);
      traveldof.update(model.deltaTime);
      travelValue = 20 * traveldof.getPosition();

      let gaze = t => {
         let s = t < 0 ? -1 : 1;
	 t = s * Math.min(1, s * t);
	 return s * .25 * Math.pow(s * 2 * t, .3);
      }
      lpupil.identity().turnY(gaze(-30*lookX)).turnX(gaze(30*lookY)).move(0,0,1).scale(.7);
      rpupil.identity().turnY(gaze(-30*lookX)).turnX(gaze(30*lookY)).move(0,0,1).scale(.7);

      if (time > blinkTime)
         blinkTime = time + 1 + 3 * Math.random();

      let isBlinking = blinkTime - time < .1;
      if (isBlinking) {
         leye.color(0,.45,1)
         reye.color(0,.45,1);
         lpupil.ignore = true;
         rpupil.ignore = true;
      }
      else {
         leye.color('white');
         reye.color('white');
         lpupil.ignore = false;
         rpupil.ignore = false;
      }
   }

   this.root = root;
}

