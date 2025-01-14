
function Vector3(x,y,z) {
   this.x = x === undefined ? 0 : x;
   this.y = y === undefined ? 0 : y;
   this.z = z === undefined ? 0 : z;

   let applyQuaternion = (v, q) => {
      let x = v.x, y = v.y, z = v.z, X = q.x, Y = q.y, Z = q.z, W = q.w;
      v.x = 2 * (W*z*Y + X*z*Z - W*y*Z + X*y*Y) + x * (W*W + X*X - Y*Y - Z*Z);
      v.y = 2 * (W*x*Z + X*x*Y - W*z*X + Y*z*Z) + y * (W*W - X*X + Y*Y - Z*Z);
      v.z = 2 * (W*y*X - W*x*Y + X*x*Z + Y*y*Z) + z * (W*W - X*X - Y*Y + Z*Z);
   }

   this.add = v => {
      this.x += v.x;
      this.y += v.y;
      this.z += v.z;
      return this;
   }

   // THIS FUNCTION IS NOT NEEDED FOR IKBODY

   this.applyMatrix4 = M => {
      let m = M.elements;
      let x = this.x, y = this.y, z = this.z;
      this.x = m[0] * x + m[4] * y + m[ 8] * z + m[12];
      this.y = m[1] * x + m[5] * y + m[ 9] * z + m[13];
      this.z = m[2] * x + m[6] * y + m[10] * z + m[14];
   }

   this.applyQuaternion = q => {
      applyQuaternion(this, q);
      return this;
   }

   this.copy = v => {
      this.x = v.x;
      this.y = v.y;
      this.z = v.z;
      return this;
   }

   this.distanceTo = v => {
      let x = v.x-this.x, y = v.y-this.y, z = v.z-this.z;
      return Math.sqrt(x*x + y*y + z*z);
   }

   this.lengthSq = () => {
      return this.x * this.x + this.y * this.y + this.z * this.z;
   }

   this.lerp = (v,t) => {
      this.x += t * (v.x - this.x);
      this.y += t * (v.y - this.y);
      this.z += t * (v.z - this.z);
      return this;
   }

   this.multiplyScalar = s => {
      this.x *= s;
      this.y *= s;
      this.z *= s;
      return this;
   }

   this.negate = () => {
      this.x = -this.x;
      this.y = -this.y;
      this.z = -this.z;
      return this;
   }

   this.offset = (x,y,z,q) => {
      if (q === undefined) {
         this.x += x;
         this.y += y;
         this.z += z;
      }
      else {
         let v = { x:x, y:y, z:z };
	 applyQuaternion(v, q);
         this.x += v.x;
         this.y += v.y;
         this.z += v.z;
      }
      return this;
   }

   this.set = (x,y,z) => {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
   }

   this.sub = v => {
      this.x -= v.x;
      this.y -= v.y;
      this.z -= v.z;
      return this;
   }
}

