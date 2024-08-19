
window.ballInfo = {                              // SHARED STATE IS A GLOBAL VARIABLE.
   rgb: 'red',                                   // IT MUST BE AN OBJECT OF THE FORM:
   xyz: [0,1.5,0]                                // { name: value, name: value ... }
};

export const init = async model => {
   let ball = model.add('sphere');

   inputEvents.onPress = hand => {
      ballInfo.rgb = hand == 'left' ? 'green'    // Set ball color: left=green, right=blue
                                    : 'blue';
      ballInfo.xyz = inputEvents.pos(hand);      // AFTER AN INPUT EVENT MODIFIES STATE
      server.broadcastGlobal('ballInfo');        // BROADCAST THE NEW STATE VALUE.
   }
   inputEvents.onDrag = hand => {
      ballInfo.xyz = inputEvents.pos(hand);      // AFTER AN INPUT EVENT MODIFIES STATE
      server.broadcastGlobal('ballInfo');        // BROADCAST THE NEW STATE VALUE.
   }
   inputEvents.onRelease = hand => {
      ballInfo.rgb = 'red';                      // AFTER AN INPUT EVENT MODIFIES STATE
      server.broadcastGlobal('ballInfo');        // BROADCAST THE NEW STATE VALUE.
   }

   model.animate(() => {
      ballInfo = server.synchronize('ballInfo'); // BEGIN ANIMATE BY SYNCHRONIZING STATE.

      ball.identity().move(ballInfo.xyz).scale(.1).color(ballInfo.rgb);
   });
}

