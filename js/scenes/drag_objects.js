
// IN THIS DEMO, THE WIZARD USES ALL TRIGGER POSITIONS TO DRAG EACH OBJECT

window.drag_objects = {
   lion   : [-.2,1.5,0],
   tiger  : [  0,1.5,0],
   penguin: [ .2,1.5,0],
};

let round = t => (1000 * t >> 0) / 1000;                    // ROUND NUMBERS TO REDUCE NETWORK MESSAGE SIZE

export const init = async model => {

   let objects = {};
   for (let name in drag_objects) {
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

   let whoIsAt = [];              // KEEP TRACK OF WHAT OBJECT IS CURRENTLY BEING GRABBED BY EACH CONTROLLER

   model.update(input => {
      for (let id of clients)
         for (let hand in {left:0, right:1}) {
	    let controller = input[id].controller(hand);
	    let index = 2 * id + (hand=='left' ? 0 : 1);
	    if (! controller.isDown(0))
               delete whoIsAt[index];
            else {
	       let P = controller.matrix().slice(12,15);
               if (! whoIsAt[index])                        //       (2) IF NEEDED, FIND AN OBJECT TO GRAB
                  for (let a in drag_objects) {
                     let Q = drag_objects[a];
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
                  drag_objects[whoIsAt[index]] = P;
            }
         }

      server.broadcastGlobal('drag_objects');               //       (4) TELL CLIENTS THE OBJECT POSITIONS
   });

   model.animate(() => {                                    // AT EVERY ANIMATION FRAME:

      drag_objects = server.synchronize('drag_objects')     //    UPDATE THE SCENE STATE FOR EVERY CLIENT

      for (let a in drag_objects)                           //    EVERY CLIENT RENDERS THE SCENE
         objects[a].identity().move(drag_objects[a]);
   });
}
