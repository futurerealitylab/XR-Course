
// IN THIS DEMO, THE WIZARD MOVES THE BALL TO THE AVERAGE POSITION OF ALL CONTROLLERS WHOSE TRIGGERS ARE PRESSED.

window.share_ball = { pos: [0,1.5,0] };                     // GLOBAL VARIABLE FOR RENDERABLE STATE

let round = t => (1000 * t >> 0) / 1000;                    // ROUND NUMBERS TO REDUCE NETWORK MESSAGE SIZE

export const init = async model => {

   let obj = model.add();                                   // CREATE THE RENDERABLE OBJECT
   let ball = obj.add('sphere').scale(.07).color(0,.5,1);   // CREATE THE OBJECT'S INTERNAL STRUCTURE

   model.update(input => {                                  // THE WIZARD UPDATES THE SCENE STATE
      let sum = [0,0,0], count = 0;                         // BY COMPUTING THE AVERAGE POSITION OF ALL CLIENT
      for (let id of clients)                               // CONTROLLERS FOR WHICH THE TRIGGER IS PRESSED.
         for (let hand in {left:0, right:1}) { 
            let controller = input[id].controller(hand);
	    if (controller.isDown(0)) {
	       count++;
	       let m = controller.matrix();
	       for (let i = 0 ; i < 3 ; i++)
	          sum[i] += m[12 + i];
            }
         }
      if (count > 0)
	 for (let i = 0 ; i < 3 ; i++)
	     share_ball.pos[i] = round(.9 * share_ball.pos[i] + .1 * sum[i]/count);
      server.broadcastGlobal('share_ball');
   });

   model.animate(() => {                                    // AT EVERY ANIMATION FRAME:
      share_ball = server.synchronize('share_ball')         //    EVERY CLIENT RECEIVES THE UPDATED SCENE STATE
      obj.identity().move(share_ball.pos);                  //    EVERY CLIENT RENDERS THE SCENE
   });
}
