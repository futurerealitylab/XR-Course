"use strict";

export let initializeScene = () => {
   window.aiObjects = [];
   window.aiObjectsIndex = 0;
} 

export let addObject = (root) => {
   if (window.aiObjects === undefined) initializeScene();

   let index = window.aiObjectsIndex++;

   let object = root.add('cube').scale(0.2,0.2,0.2);

   window.aiObjects.push([index, object]);

   return object;
}