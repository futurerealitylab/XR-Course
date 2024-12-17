import * as global from "../global.js";
import { Gltf2Node } from "../render/nodes/gltf2.js";

let attic = new Gltf2Node({ url: './media/gltf/attic1986_ver2/attic1986_ver2.gltf' });

export const init = async model => {
    attic.translation = [0, -.85, 0];
    attic.scale = [2.8,2.8,2.8];
    global.gltfRoot.addNode(attic);

    model.animate(() => {
    });
 }

