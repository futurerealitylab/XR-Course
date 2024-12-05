
import * as global from "../global.js";
import { quat } from "../render/math/gl-matrix.js";
import { Gltf2Node } from "../render/nodes/gltf2.js";

let lab = new Gltf2Node({ url: './media/gltf/60_fifth_ave/60_fifth_edit.gltf' });

export const init = async model => {
    lab.translation = [0, 0, 0];
    lab.scale = [1.3,1.3,1.3];
    global.gltfRoot.addNode(lab);

    model.animate(() => {
    });
 }

