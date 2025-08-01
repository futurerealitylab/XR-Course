import * as aiobject from "/js/util/aiobject.js";
import * as global from "../global.js";
import { Gltf2Node } from "../render/nodes/gltf2.js";
import { G3 } from "../util/g3.js";
import * as cg from "../render/core/cg.js";

export const init = async model => {
    server.spawnPythonThread("chatgpt.py", "test-paper.pdf");

    let nodes = [];

    let text = "";
    let obj = {};

    model.animate(() => {
        for (let i = 0; i < nodes.length; i++)
            nodes[i].update();
        if (window.pythonOutput !== undefined)
        {
            let output = window.pythonOutput.split("+");
            if (output[0] === "chatgpt")
            {
                if (text !== output[1])
                {
                    text = output[1];
                    obj = JSON.parse(text);
                    console.log(obj);

                    for (const entry in obj)
                    {
                        nodes.push(
                        new G3(model, draw => {
                            let m = cg.mMultiply(clay.inverseRootMatrix, model.inverseViewMatrix());
                            let x = m.slice(0,3);
                            let z = m.slice(8,11);
                            z = cg.normalize([z[0],0,z[2]]);
                            let o = [obj[entry][0],obj[entry][1],obj[entry][2]];
                            let p = cg.add(o, cg.scale(z, -.5));
                            draw.color('#ffffffc0').fill2D([[-.35,-.35,0],[.35,-.35,0],[.35,.35,0],[-.35,.35,0]], p);
                            draw.textHeight(.05).font('Courier').color('#000000').text(entry, p, 'center', 0,-.28);
                        }));
                        console.log(entry);
                        console.log(obj[entry]);
                    }
                }
            }
        }
   });
}