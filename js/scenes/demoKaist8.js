
// IN THIS DEMO, THE WIZARD USES ALL TRIGGER POSITIONS TO DRAG EACH OBJECT

window.kaist8_input = [];                                   // GLOBAL VARIABLE FOR CONTROLLER POSITIONS
window.kaist8_state = {
   a: [-.2,1.5,0],
   b: [  0,1.5,0],
   c: [ .2,1.5,0],
};

let round = t => (1000 * t >> 0) / 1000;                    // ROUND NUMBERS TO REDUCE NETWORK MESSAGE SIZE

export const init = async model => {

   let objects = {};
   for (let a in kaist8_state) {
      objects[a] = model.add();
      objects[a].add('sphere').scale(.07).color(a=='a' ? [1,.2,.2] : a=='b' ? [1,1,0] : [0,.5,1]);
   }

   let setController = (hand, position) => {
      let index = 2 * clientID + (hand=='left' ? 0 : 1);
      kaist8_input[index] = position;
      server.broadcastGlobalSlice('kaist8_input', index, index+1);
   }
   inputEvents.onDrag = hand => setController(hand, inputEvents.pos(hand));
   inputEvents.onMove = hand => setController(hand, null);

   let whoIsAt = [];              // KEEP TRACK OF WHAT OBJECT IS CURRENTLY BEING GRABBED BY EACH CONTROLLER

   model.animate(() => {                                    // AT EVERY ANIMATION FRAME:

      kaist8_state = server.synchronize('kaist8_state')     //    UPDATE THE SCENE STATE FOR EVERY CLIENT

      if (clientID == clients[0]) {                         //    THE WIZARD MODIFIES SCENE STATE LIKE THIS:

         kaist8_input = server.synchronize('kaist8_input')  //       (1) GET ALL CONTROLLER POSITIONS

	 for (let index in kaist8_input)
	    if (! kaist8_input[index])
	       delete whoIsAt[index];
            else {
	       let P = kaist8_input[index];
	       if (! whoIsAt[index])                        //       (2) IF NEEDED, FIND AN OBJECT TO GRAB
	          for (let a in kaist8_state) {
	             let Q = kaist8_state[a];
		     let x = P[0]-Q[0], y = P[1]-Q[1], z = P[2]-Q[2];
		     if (x * x + y * y + z * z < .07 * .07) {
		        let isOkToGrab = true;
		        for (let i in whoIsAt)              //           ONLY IF IT IS NOT ALREADY GRABBED
			   if (whoIsAt[i] == a)
			      isOkToGrab = false;
                        if (isOkToGrab)
		           whoIsAt[index] = a;
                     }
	          }
               if (whoIsAt[index])                          //       (3) IF AN OBJECT IS GRABBED, MOVE IT
	          kaist8_state[whoIsAt[index]] = P;
            }

         server.broadcastGlobal('kaist8_state');            //       (4) TELL CLIENTS THE OBJECT POSITIONS
      }

      for (let a in kaist8_state)                           //    EVERY CLIENT RENDERS THE SCENE
         objects[a].identity().move(kaist8_state[a]);
   });
}
