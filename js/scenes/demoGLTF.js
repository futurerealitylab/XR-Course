/*****************************************************************

   This demo shows a way to incorporate GLTF models that were
   previously created in external modeling programs.

*****************************************************************/

import * as global from "../global.js";
import { quat } from "../render/math/gl-matrix.js";
import { Gltf2Node } from "../render/nodes/gltf2.js";

let buddha = new Gltf2Node({ url: './media/gltf/buddha_statue_broken/scene.gltf', txtr: 14 });
let box = new Gltf2Node({ url: './media/gltf/box-gltf/box.gltf', txtr: 13 });
let attic = new Gltf2Node({ url: './media/gltf/60_fifth_ave/60_fifth_ave.gltf' , alpha: 1, txtr: 12 });

export const init = async model => {
    buddha.translation = [0, 1.16, 0]; // 1.16 is pedestal height
    buddha.scale = [1.3,1.3,1.3];
    box.translation = [0, 1, 0];
    box.scale = [0.2,0.2,0.2];
    global.gltfRoot.addNode(buddha);
    global.gltfRoot.addNode(box);
    global.gltfRoot.addNode(attic);
    //model.txtrSrc(0, '../media/textures/moon_diffuse.jpg');

    /* YUSHEN: THIS IS THE DEMO OF THE NEW TEXTURE METHOD
       SETTXTR METHOD CAN TAKE 1-3 PARAMETERS
       THE FIRST ONE MUST BE THE TEXTURE SOURCE
       THE SECOND ONE CAN EITHER BE THE DESIRED TEXTURE CHANNEL
       OR THE DO NOT ANIMATE OPTION
       THE THIRD THEN WILL BE THE REST
       COMMENT IN/OUT THE CODE TO TEST IT */

    // THIS IS THE BASIC USAGE, ONLY SOURCE, NO DESIRED CHANNEL AND ANIMATE OPTION
    //let obj = model.add('sphere').setTxtr('../media/textures/moon_diffuse.jpg').setBumptxtr('../media/textures/moon_normal.jpg');
    // THIS IS WHEN THE CHANNEL IS SET TO DESIRED ONE
    //let obj = model.add('sphere').setTxtr('../media/textures/moon_diffuse.jpg', 1).setBumptxtr('../media/textures/moon_normal.jpg', 2);
    // THIS IS WHEN THE DO_NOT_ANIMATE PARAMETER IS SET
    //let obj = model.add('sphere').setTxtr('../media/textures/moon_diffuse.jpg', true).setBumptxtr('../media/textures/moon_normal.jpg', true);
    // THIS IS WHEN EVERYTHING IS COMING TOGETHER
    let obj = model.add('sphere').setTxtr('../media/textures/moon_diffuse.jpg', 1, true).setBumptxtr('../media/textures/moon_normal.jpg', 2, true);

    model.animate(() => {
    });
 }

