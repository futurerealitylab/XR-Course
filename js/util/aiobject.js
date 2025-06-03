"use strict";

import * as global from "../global.js";
import { Gltf2Node } from "../render/nodes/gltf2.js";

export let initializeScene = () => {
   window.aiObjects = [];
   window.aiObjectsIndex = 0;
   window.aiObjectResult = "";
} 

export let test = () => {
   let a = new Gltf2Node({ url: '../0.glb' });
   a.translation = [0,0,-5];
   global.gltfRoot.addNode(a);
}

export let updateObjects = () => {
   if (window.aiObjects === undefined) initializeScene();

   window.pythonResult = server.synchronize('pythonOutput');

   if (window.pythonResult !== window.aiObjectResult)
   {
      if (window.pythonResult !== undefined)
      {
         let result = window.pythonResult.split("+");
         if (result[0] === "meshyai")
         {
            window.aiObjectResult = result[1];
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