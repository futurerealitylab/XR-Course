import{addNewQuadLayerImage} from "../immersive-pre.js";
import{addNewCylinderLayerImage} from "../immersive-pre.js";
import{addNewEquirectLayerImage} from "../immersive-pre.js";
import{removeLayerObject} from "../immersive-pre.js";

//Quad layer image objects
let brick = null, cloud = null, concrete = null;
export const init = async model => {
   //src, pos, orient, scale,callback(layer object)
   addNewEquirectLayerImage("../media/textures/brick.png",
   { x: 1, y: 2, z: -2 },
   { x: 0, y: -1.57, z: 0, w: 1 }, 
   { x: .5, y: .5 },
   (lo)=>{
      brick = lo;
   });

   addNewCylinderLayerImage("../media/textures/concrete.png",
   { x: 0, y: 2, z: -2 },
   { x: 0, y: 0, z: 0, w: 1 }, 
   { x: .5, y: .5 },
   (lo)=>{
      concrete = lo;
   });


   addNewQuadLayerImage("../media/textures/cloud.png",
   { x: -1, y: 2, z: -2 },
   { x: 0, y: 0, z: 0, w: 1 }, 
   { x: .3, y: .3 },
   (lo)=>{
      cloud = lo;
   });

   model.animate(() => {
      if(cloud!=null){
         cloud.move({ x: Math.sin(model.time)-1, y: 2, z: -2 });
      }
   });
}
//have to manually delete layer objects
export const deinit =  () => {
   removeLayerObject(brick);
   removeLayerObject(cloud);
   removeLayerObject(concrete);
}



