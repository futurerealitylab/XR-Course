
// IN THIS DEMO, THE WIZARD USES ALL TRIGGER POSITIONS TO DRAG EACH OBJECT

window.example8Input = [];                                   // GLOBAL VARIABLE FOR CONTROLLER POSITIONS
window.example8State = {
   lion   : [-.2,1.5,0],
   tiger  : [  0,1.5,0],
   penguin: [ .2,1.5,0],
};

let round = t => (1000 * t >> 0) / 1000;                    // ROUND NUMBERS TO REDUCE NETWORK MESSAGE SIZE

export const init = async model => {

   let objects = {};
   for (let name in example8State) {
      objects[name] = model.add();
      switch (name) {
      case 'lion':
         // HERE YOU CAN CHANGE TO THE CODE TO BUILD A LION
         objects[name].add('sphere').scale(.07).color(1,.2,.2);
	 break;
      case 'tiger':
         // HERE YOU CAN CHANGE TO THE CODE TO BUILD A TIGER
         objects[name].add('sphere').scale(.07).color(1,1,0);
	 break;
      case 'penguin':
         // HERE YOU CAN CHANGE TO THE CODE TO BUILD A PENGUIN
         objects[name].add('sphere').scale(.07).color(0,.5,1);
	 break;
      }
   }

   let setController = (hand, position) => {
      let index = 2 * clientID + (hand=='left' ? 0 : 1);
      example8Input[index] = position;
      server.broadcastGlobalSlice('example8Input', index, index+1);
   }
   inputEvents.onDrag = hand => setController(hand, inputEvents.pos(hand));
   inputEvents.onMove = hand => setController(hand, null);

   let whoIsAt = [];              // KEEP TRACK OF WHAT OBJECT IS CURRENTLY BEING GRABBED BY EACH CONTROLLER

   model.animate(() => {                                    // AT EVERY ANIMATION FRAME:

      example8State = server.synchronize('example8State')   //    UPDATE THE SCENE STATE FOR EVERY CLIENT

      if (clientID == clients[0]) {                         //    THE WIZARD MODIFIES SCENE STATE LIKE THIS:

         example8Input = server.synchronize('example8Input')//       (1) GET ALL CONTROLLER POSITIONS

	 for (let index in example8Input)
	    if (! example8Input[index])
	       delete whoIsAt[index];
            else {
	       let P = example8Input[index];
	       if (! whoIsAt[index])                        //       (2) IF NEEDED, FIND AN OBJECT TO GRAB
	          for (let a in example8State) {
	             let Q = example8State[a];
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
	          example8State[whoIsAt[index]] = P;
            }

         server.broadcastGlobal('example8State');           //       (4) TELL CLIENTS THE OBJECT POSITIONS
      }

      for (let a in example8State)                          //    EVERY CLIENT RENDERS THE SCENE
         objects[a].identity().move(example8State[a]);
   });
}
