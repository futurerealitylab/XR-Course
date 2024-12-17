import * as global from "../global.js";
import { Gltf2Node } from "../render/nodes/gltf2.js";

let attic = new Gltf2Node({ url: './media/gltf/60_fifth_ave/60_fifth_ave.gltf' , alpha: 1});

export const init = async model => {
    attic.translation = [0, -.85, 0];
    attic.scale = [2.8,2.8,2.8];
    global.gltfRoot.addNode(attic);

    model.animate(() => {
        //console.log("view x: "+ views[0]._viewMatrix[12]);
        //console.log("view z: "+ views[0]._viewMatrix[14]);
    });
 }

