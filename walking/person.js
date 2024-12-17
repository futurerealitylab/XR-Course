
let Person = function(id) {

   let myTube   = Tube(8);
   let mySphere = Sphere(8);

   let downForce = 0, eyeFace = 0, turnToLook = 0,  rgb = [1,1,1];;

   let sSway = new Spring();
   let sYaw  = new Spring();
   let sHead = new Spring();
   sSway.setMass(5);
   sYaw .setMass(5);
   sHead.setMass(5);

   let previousTime, t = 0, tx = 0, tz = 0, blinkTime = Date.now() / 1000;

   let swayMax = 0;

   let P = {};

   this.params = () => 'color go heading height hipsway hipwidth idle leglift looking pace radius scale sidle stride twist'.split(' ');
   this.get = param => P[param];
   this.set = (param, value) => P[param] = value;

   this.setPosition = pos => { tx = pos[0]; tz = pos[1]; }
   this.getPosition = ()  => [ tx, tz ];

   this.getRGB = () => {
      let colors = [[1,1,1],[1,0,0],[0,1,0],[0,0,1],[1,0,.5]];
      let color = this.get('color');
      let c = .999 * (colors.length - 1) * color;
      return normalize(mix(colors[c>>0], colors[c+1>>0], c%1));
   }

   this.update = time => {
      P.leglift *= P.go;
      P.stride  *= P.go;

      let idle = P.idle * (1 - P.go);

      let r  = .01 + .10 * Math.pow(P.radius, 1.5);
      let hw = .05 + .14 * P.hipwidth;
      let yh = .5 + P.height;
      let ll = yh/2-r*.49;

      let joint = (J,R,C) => M.S().move(J).scale(R?R:r).color(C?C:rgb).draw(mySphere).R();
      let limb = (A,B,R) => M.S().move(mix(A,B,.5)).aim(subtract(A,B)).scale(R?R:r,R?R:r,distance(A,B)/2).color(rgb).draw(myTube).R();

      let step = t => t % 2 < 1 ? 2 * ease(t % 1) - 1 : 1 - 2 * (t % 1);

      let face = TAU * ((P.heading + P.sidle) % 1);
      let fc = C(face);
      let fs = S(face);

      let dir = TAU * P.heading - TAU/2;
      let dc = 3 * C(dir) * P.stride;
      let ds = 3 * S(dir) * P.stride;

      if (previousTime) {
         let dt = 2 * (time - previousTime) * P.pace;
         t  += dt;
         tx += dt * ds * .075 * P.scale;
         tz += dt * dc * .075 * P.scale;
      }
      previousTime = time;

      let lLift = .2 * Math.max(0, S(TAU*t)) * P.leglift;
      let rLift = .2 * Math.max(0,-S(TAU*t)) * P.leglift;

      let lStep = .1 * step(2*t  );
      let rStep = .1 * step(2*t+1);

      let swaying = Math.max(-.04, Math.min(.04, .4 * (rLift - lLift) * P.hipwidth));
      let stepping = lStep + rStep;

      sSway.setForce(swaying);
      sSway.update(.1);
      let sway = sSway.getPosition() * P.hipsway * 1.2 + .1 * idle * noise1(50.25 * id + .2 * time);

      sYaw.setForce(Math.max(-.1,Math.min(.1,.4 * P.stride * (rLift - lLift) / (.4+.6*P.height) * mix(1,.5,P.hipwidth) * C(dir - face))));
      sYaw.update(.1);
      let yaw = sYaw.getPosition();

      let LFoot = [ hw*fc + ds * lStep, r + lLift,-hw*fs + dc * lStep];
      let RFoot = [-hw*fc + ds * rStep, r + rLift, hw*fs + dc * rStep];

      let LHip = [sway*C(dir) + hw*fc, yh, -sway*S(dir) - hw*fs];
      let RHip = [sway*C(dir) - hw*fc, yh, -sway*S(dir) + hw*fs];

      let roll = -.3 * sway;

      let Pelvis = mix(LHip, RHip, .5);

      let df = (a,b) => .1 * Math.max(0, distance(a,b) - 2*ll);
      downForce = .9 * (downForce + df(LHip,LFoot) + df(RHip,RFoot));

      Pelvis[1] -= downForce;
      let DH = scale(subtract(RHip, LHip), .5);
      let rollHips = sway * (.2 - P.hipsway);
      let rs = S(rollHips), rc = C(rollHips);

      let dhx = DH[0] * rc;
      let dhy = DH[1] + rs;
      let dhz = DH[2] * rc;

      let twistAngle  = 1.4 * (P.twist - .5) + yaw + 2 * turnToLook;
      let twistAngle2 = 2.8 * (P.twist - .5) + yaw + 4 * turnToLook;

      let tc = C(twistAngle), ts = S(twistAngle);
      DH = [tc * dhx + ts * dhz, dhy, -ts * dhx + tc * dhz];
      LHip = subtract(Pelvis, DH);
      RHip = add(Pelvis, DH);

      let tc2 = C(twistAngle2), ts2 = S(twistAngle2);
      let DH2 = [tc2 * dhx + ts2 * dhz, dhy, -ts2 * dhx + tc2 * dhz];
      let LWrist = add(add(Pelvis, scale(DH2, [-2,0,-1.9])), [0,-ll/6,0]);
      let RWrist = add(add(Pelvis, scale(DH2, [ 2,0, 1.9])), [0,-ll/6,0]);

      let head = add(add(Pelvis, [0,1.5*ll,0]), scale([-dc,0,ds], .5*sway));

      let eyeFaceTarget = face + 2.8 * (P.twist - .5);
      eyeFace = mixAngle(eyeFace, eyeFaceTarget, .1);

      let LShoulder = add(LWrist, [0,1.3*ll,0]);
      let RShoulder = add(RWrist, [0,1.3*ll,0]);

      let SS = mix(LShoulder,RShoulder,.5);
      let Neck = [head[0],SS[1],head[2]];
      LShoulder = add(LShoulder, scale(subtract(Neck, SS), [1,0,1]));
      RShoulder = add(RShoulder, scale(subtract(Neck, SS), [1,0,1]));
      LShoulder = add(LShoulder, scale(subtract(Neck, LShoulder), .2));
      RShoulder = add(RShoulder, scale(subtract(Neck, RShoulder), .2));

      Neck[1]   -= .035 * ll;
      Pelvis[1] += .025 * ll;

      LWrist = add(LWrist, scale([DH[2],0,-DH[0]], yaw*20));
      RWrist = add(RWrist, scale([DH[2],0,-DH[0]],-yaw*20));

      let armDY = (D, len) => len - Math.sqrt(len * len - D[0] * D[0] - D[2] * D[2]);

      LWrist[1] += armDY(subtract(LShoulder, LWrist), 1.3 * ll);
      RWrist[1] += armDY(subtract(RShoulder, RWrist), 1.3 * ll);

      let getElbow = (H,F) => add(H, ik(.66*ll, .65*ll, subtract(F,H), cross([0,-1,0], DH2)));
      let LElbow = getElbow(LShoulder, LWrist);
      let RElbow = getElbow(RShoulder, RWrist);

      let tch = C(twistAngle/2), tsh = S(twistAngle/2);
      let DHH = [tch * dhx + tsh * dhz, dhy, -tsh * dhx + tch * dhz];
      let getKnee = (H,F) => add(H, ik(ll, ll, subtract(F,H), cross([0,1,0], DHH)));
      let LKnee = getKnee(LHip, LFoot);
      let RKnee = getKnee(RHip, RFoot);

      rgb = this.getRGB(P.color);

      this.draw = () => {

         M.S().move(tx,0,tz).scale(.2 * P.scale);
            let blink = time < blinkTime;
            if (time - blinkTime > .2)
               blinkTime += .2 + 2 * Math.random();

            M.S().move(head);
               let m = VM.get(), z1 = [m[2],m[6],m[10]], s = blink ? .03 : .001;
               M.S().turnY(eyeFace + idle * noise1(50.25 * id + .3 * time))
	            .turnX(     .5 * idle * noise1(50.25 * id + .3 * time + 100));
                  let z0 = normalize(M.get().slice(8,11));
               M.R();

	       let t = Math.pow(.5 + .5 * (z0[0]*z1[0]+z0[2]*z1[2]), .25);
               M.aim(mix(z0, z1, P.looking * t),2,[0,1,0]);
               turnToLook = .25 * P.looking * t * (z0[2]*z1[0] - z0[0]*z1[2]) * (1 + z0[0]*z1[0] + z0[2]*z1[2]);

               M.S().move(   0,.13,   0)           .scale(.11 ,.13,.11).color(rgb).draw(mySphere).R();
               M.S().move( .05,.15,.095).turnY( .5).scale(.03,   s,.01).color([0,0,0]).draw(mySphere).R();
               M.S().move(-.05,.15,.095).turnY(-.5).scale(.03,   s,.01).color([0,0,0]).draw(mySphere).R();
            M.R();

	    let chain = (joints, r) => {
	       for (let i = 0 ; i < joints.length-1 ; i++) {
	          limb(joints[i], joints[i+1], r);
		  joint(joints[i+1], r);
	       }
	    }

            joint(Pelvis);
	    chain([Pelvis, LHip, LKnee, LFoot]);
	    chain([Pelvis, RHip, RKnee, RFoot]);

            joint(Neck, .7*r);
	    chain([Neck, LShoulder, LElbow, LWrist], .7*r);
	    chain([Neck, RShoulder, RElbow, RWrist], .7*r);
         M.R();
      }
   }
}

