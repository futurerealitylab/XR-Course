// This shows how to incorporate GLTF models that were
// previously created in external modeling programs.

import * as global from "../global.js";
import { quat } from "../render/math/gl-matrix.js";
import { Gltf2Node } from "../render/nodes/gltf2.js";

let buddha = new Gltf2Node({ url: './media/gltf/1.glb', txtr: 14 });
let box    = new Gltf2Node({ url: './media/gltf/box-gltf/box.gltf', txtr: 13 });
let room   = new Gltf2Node({ url: './media/gltf/60_fifth_ave/60_fifth_ave.gltf' , alpha: 1, txtr: 12 });

export const init = async model => {
    buddha.translation = [0, 1.16, 0]; // 1.16 is pedestal height
    buddha.scale = [1.3,1.3,1.3];
    box.translation = [0, 1, 0];
    box.scale = [0.2,0.2,0.2];
    global.gltfRoot.addNode(buddha);
    global.gltfRoot.addNode(box);
    global.gltfRoot.addNode(room);

//     obj.setTxtr CAN TAKE 1-3 ARGS:
//        IF 1 ARG : TXTR_SRC
//        IF 2 ARGS: TXTR_SRC , TXTR CHANNEL
//               OR  TXTR_SRC , DO_NOT_ANIMATE
//        IF 3 ARGS: TXTR_SRC , TXTR_CHANNEL , DO_NOT_ANIMATE

    let txtrFile = '../media/textures/moon_diffuse.jpg',
        bumpFile = '../media/textures/moon_normal.jpg';

// ONE ARG: ONLY SRC

//  let obj = model.add('sphere').setTxtr(txtrFile).setBumptxtr(bumpFile);

// TWO ARGS: SRC , CHANNEL

//  let obj = model.add('sphere').setTxtr(txtrFile, 1).setBumptxtr(bumpFile, 2);

// TWO ARGS: SRC , DO_NOT_ANIMATE

//  let obj = model.add('sphere').setTxtr(txtrFile, true).setBumptxtr(bumpFile, true);

// THREE ARGS: SRC , CHANNEL , DO_NOT_ANIMATE

    let obj = model.add('sphere').setTxtr(txtrFile, 1, true).setBumptxtr(bumpFile, 2, true);

    model.animate(() => {
    });
 }

