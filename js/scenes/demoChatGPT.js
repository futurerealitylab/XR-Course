import * as aiobject from "/js/util/aiobject.js";
import * as global from "../global.js";
import { Gltf2Node } from "../render/nodes/gltf2.js";

export const init = async model => {
    server.spawnPythonThread("chatgpt.py", "let's+talk+about+elephant");

    model.animate(() => {
   });
}