export const init = async model => {
   /*
   interface XRMesh {
      [SameObject] readonly attribute XRSpace meshSpace;

      readonly attribute FrozenArray<Float32Array> vertices;
      readonly attribute Uint32Array indices;
      readonly attribute DOMHighResTimeStamp lastChangedTime;
      readonly attribute DOMString? semanticLabel;
   };

   */

   let countLabel = model.add().move(.5,1,-.5).scale(.3).text('Detected meshes: '+window.detectedMeshes.size, .06);
   let x = 0;
   if(window.detectedMeshes){
      window.detectedMeshes.forEach(mesh => {//mesh is an XRMesh
         //mesh.vertices is the vertex position array
         //mesh.indices is the triangle array
         let meshLabel = model.add().move(.5,.8-x*.3,-.5).scale(.3).text('Mesh '+x+' vertices: '+mesh.vertices.length, .06);
         let coarseness = 500;
         let count = mesh.vertices.length/coarseness;
         for(let i =0;i<count;i++){
            model.add('cube').move(
               mesh.vertices[i*coarseness+0], 
               mesh.vertices[i*coarseness+1],
               mesh.vertices[i*coarseness+2]).scale(.01);
         }
        x++;
       });
       
   }

   model.animate(() => {
      countLabel.identity().move(.5,1,-.5).scale(.3).text('Detected meshes: '+window.detectedMeshes.size, .06);
     
   });
}


