function Agent() {
   this.setTarget = T => {
      target = T.slice();
      rampUp = 0;
   }
   this.isAtTarget = () => distance(target, this.getPos()) < .01;
   this.getPos = () => pos;
   this.getTravelDelta = () => travelDelta;
   this.getHeading = () => heading;
   this.getLookTarget = () => lookTarget;
   this.setLookTarget = P => {
      isLooking = true;
      lookTarget = P.slice();
   }
   this.update = time => {
      pos = advanceToward(target, .002);
      if (prevPos !== undefined)
         travelDelta = distance(pos, prevPos);
      prevPos = pos.slice();
   }

   let distance = (a,b) => {
      let x = a[0] - b[0], y = a[1] - b[1];
      return Math.sqrt(x * x + y * y);
   }
   let adiff = (a,b) => {
      while (a > b + Math.PI) a -= 2 * Math.PI;
      while (a < b - Math.PI) a += 2 * Math.PI;
      return a - b;
   }
   let advanceToward = (xz,e) => {
      let d = distance(xz, pos);
      if (d > e) {
         rampUp += 10 * e;
         e *= Math.min(1, rampUp);
         if (d < .1)
	    e = d * 10 * e;
         let a = Math.atan2(xz[1] - pos[1], xz[0] - pos[0]);
	 let t = adiff(a, heading);
         heading += e * t * 2 / d;
         pos[0] += e * Math.cos(heading);
         pos[1] += e * Math.sin(heading);
	 turn -= .1 * t;
	 turn *= .9;
      }
      return pos;
   }

   let prevPos, pos = [0,0], heading = 0;
   let turn = 0, rampUp = 0, target = [0,0];
   let travelDelta = 0, travelValue = 0;
   let lookTarget = [0,0], isLooking = false;
}

