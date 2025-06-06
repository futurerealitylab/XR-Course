"use strict";

import * as global from "../global.js";
import { Gltf2Node } from "../render/nodes/gltf2.js";

export let initializeScene = () => {
   window.aiObjects = [];
   window.aiObjectsIndex = 0;
   window.aiObjectResult = "";
} 

export let test = () => {
   let fileLocation = '../' + "0.glb";
   let a = new Gltf2Node({ url: fileLocation });
   a.translation = [0,0,-5];
   global.gltfRoot.addNode(a);
}

export let updateObjects = (root) => {
   if (window.aiObjects === undefined) initializeScene();

   window.pythonResult = server.synchronize('pythonOutput');

   if (window.pythonResult !== window.aiObjectResult)
   {
      if (window.pythonResult !== undefined)
      {
         let result = window.pythonResult.split("+");

         if (result[0] === "meshyai")
         {
            let objectID = parseInt(result[1]);
            window.aiObjectResult = window.pythonResult;
            for (let i = 0; i < window.aiObjects.length; i++)
            {
               if (window.aiObjects[i][0] == objectID)
               {
                  let fileLocation = '../' + result[2];
                  console.log(fileLocation);
                  let node = new Gltf2Node({ url: '../0.glb' });
                  let matrix = window.aiObjects[i][1].getMatrix();
                  node.translation = [matrix[12],matrix[13],matrix[14]];
                  global.gltfRoot.addNode(node);
                  root.remove(window.aiObjects[i][1]);
               }
            }
         }
      }
   }
}

export let addObject = (root, prompt) => {
   if (window.aiObjects === undefined) initializeScene();

   let index = window.aiObjectsIndex++;

   let object = root.add('cube').move(0,0,-5);

   window.aiObjects.push([index, object]);

   if (window.aijobs === undefined) window.aijobs = [];
   window.aijobs.push(prompt);

   if (window.aijobs.length == 1)
      server.spawnPythonThread("meshyai.py", index.toString() + "+" + prompt);

   return object;
}