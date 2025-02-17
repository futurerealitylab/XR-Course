
export function Quaternion(x,y,z,w) {
   this.x = x===undefined ? 0 : x;
   this.y = y===undefined ? 0 : y;
   this.z = z===undefined ? 0 : z;
   this.w = w===undefined ? 1 : w;

   this.copy = q => {
      this.x = q.x;
      this.y = q.y;
      this.z = q.z;
      this.w = q.w;
      return this;
   }
   this.inverse = () => {
      this.x = -this.x;
      this.y = -this.y;
      this.z = -this.z;
      return this;
   }
   this.multiply = q => {
      let x = this.x, y = this.y, z = this.z, w = this.w;
      this.x = + x * q.w + y * q.z - z * q.y + w * q.x;
      this.y = - x * q.z + y * q.w + z * q.x + w * q.y;
      this.z = + x * q.y - y * q.x + z * q.w + w * q.z;
      this.w = - x * q.x - y * q.y - z * q.z + w * q.w;
      return this;
   }
   this.normalize = () => {
      let x = this.x, y = this.y, z = this.z, w = this.w;
      let s = Math.sqrt(x*x + y*y + z*z + w*w);
      this.x /= s;
      this.y /= s;
      this.z /= s;
      this.w /= s;
      return this;
   }

   this.set = (x,y,z,w) => {
      this.x = x;
      this.y = y;
      this.z = z;
      this.w = w;
      return this;
   }
   this.toMatrix = () => {
      let x = this.x, y = this.y, z = this.z, w = this.w;
      return [ 1 - 2*(y*y + z*z),     2*(z*w + x*y),     2*(x*z - y*w), 0,
                   2*(y*x - z*w), 1 - 2*(z*z + x*x),     2*(x*w + y*z), 0,
                   2*(y*w + z*x),     2*(z*y - x*w), 1 - 2*(x*x + y*y), 0,  0,0,0,1 ];
   }
}

