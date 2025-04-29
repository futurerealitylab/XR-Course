import * as cg from "../cg.js";
import { IKBody } from "../ikbody/ikbody.js";
import { Quaternion } from "../ikbody/quaternion.js";
import { Vector3 } from "../ikbody/vector3.js";
import { Humanoid } from "./humanoid.js";

let PI  = Math.PI;
let TAU = Math.PI * 2;
let sin = Math.sin;
let cos = Math.cos;

export class Tetrapod extends Humanoid {
   headHeight = .8;

   constructor(terrainObj) {
      super(terrainObj);
   }
   
   initIKOffset() {
      this.ikbody.offsets[IK.CHEST     ] = [0, 0, .24];
      this.ikbody.offsets[IK.BELLY     ] = [0, 0, .13];
      this.ikbody.offsets[IK.WAIST     ] = [0, 0, .13];
      this.ikbody.offsets[IK.PELVIS    ] = [0, 0, .13];
   }
}

function clamp(x, min = 0, max = 1) {
   return Math.min(max, Math.max(min, x));
}
