import * as cg from "../render/core/cg.js";

export const init = async model => {
   clay.defineMesh('myTerrain', clay.createGrid(60, 60));
   model.txtrSrc(1, '../media/textures/chessboard.png');
   let terrain = model.add('myTerrain').txtr(1);
   model.animate(() => {
      terrain.identity()
             .move(0,1.5,0)
	     .turnX(-.1 * Math.PI)
	     .scale(.4);
      terrain.setVertices((u,v) => {
         return [ 3*u,
	          2*v-1,
		  .4 * u * cg.noise(3*u-model.time,3*v,model.time)
	        ];
      });
   });
}

