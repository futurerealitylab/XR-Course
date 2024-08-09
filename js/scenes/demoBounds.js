import{addNewQuadLayerImage} from "../immersive-pre.js";
import{removeLayerObject} from "../immersive-pre.js";
let los = []
export const init = async model => {


let m = 1;
   for(let i=0;i<window.xrRefSpace.boundsGeometry.length;i++){
      addNewQuadLayerImage("../media/textures/cloud.png",
      { x: window.xrRefSpace.boundsGeometry[i].x * m, 
         y: window.xrRefSpace.boundsGeometry[i].y * m, 
         z: window.xrRefSpace.boundsGeometry[i].z * m },
      { x: -1.57, y: 0, z: 0, w: 1 }, 
      { x: 1, y: 1 },
      (lo)=>{
         los.push(lo);
      });
   }
   
}
export const deinit =  () => {
   for(let i=0;i<los.length;i++){
      removeLayerObject(los[i]);
   }
}

