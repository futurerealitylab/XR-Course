import * as cg from "../render/core/cg.js";
import { G2 } from "../util/g2.js";
import { loadSound, playSoundAtPosition} from "../util/positional-audio.js";


// Audio Stuff

let moveSoundBuffer = null;
function preloadSounds() {
    Promise.all([
        loadSound('../../media/sound/SFXs/demoPuzzle/SFX_Puzzle_Move_Mono_01.wav', buffer => moveSoundBuffer = buffer)
    ])
    .then(() => {
        //console.log('All puzzle sounds loaded successfully');
    })
    .catch(error => {
        //console.error('An error occurred while loading sounds:', error);
    });
}


// Call this function at the start of application
preloadSounds();


// window.puzzle IS THE GLOBAL OBJECT THAT WILL BE SHARED BETWEEN ALL CLIENTS

window.puzzle = [
   1,1,1, 1,2,1, 1,2,1,
   2,1,2, 2,0,2, 1,1,1,
   1,1,1, 1,2,1, 1,2,1,
];

// CHECK TO SEE WHETHER THE GAME HAS BEEN SOLVED

let isSolved = () => {
   let solution = [
      2,1,2, 1,1,1, 2,1,2,
      1,1,1, 1,0,1, 1,1,1,
      2,1,2, 1,1,1, 2,1,2,
   ];
   for (let n = 0 ; n < puzzle.length ; n++)
      if (puzzle[n] != solution[n])
         return false;
   return true;
}

// FIND THE INDEX WHERE THE 0 (EMPTY SLOT) IS

let find0 = () => {
   for (let n = 0 ; n < 27 ; n++)
      if (puzzle[n] == 0)
         return n;
   return 0;
}

// CREATE A NEW RANDOM PUZZLE

let createNewPuzzle = () => {
   for (let k = 0 ; k < 100 ; k++)
      swap(26.9 * Math.random() >> 0,
           26.9 * Math.random() >> 0);
   swap(find0(), 13);
}

// SWAP THE CONTENTS OF TWO INDICES OF THE PUZZLE

let swap = (a,b) => {
   let tmp = puzzle[a];
   puzzle[a] = puzzle[b];
   puzzle[b] = tmp;
}

// CONVERT INDEX TO I,J,K COORDINATES

let i = n => n % 3 - 1;
let j = n => (n/3>>0) % 3 - 1;
let k = n => (n/9>>0) - 1;

// MAINTAIN STATE FOR EACH HAND: WHICH INDEX IS IT CURRENTLY LOCATED AT?
// -1 MEANS NO INDEX.

let nh = {left: -1, right: -1};

// PRECOMPUTE THE XYZ COORDINATES OF EACH BOX OF THE 27 BOXES OF THE PUZZLE

let B = [];
for (let n = 0 ; n < 27 ; n++)
   B.push([.1 * i(n), .1 * j(n) + 1, .1 * k(n)]);

// INITIALIZ THE MODEL

export const init = async model => {

   // PLACE A SPHERE IN EVERY BOX

   for (let n = 0 ; n < 27 ; n++)
      model.add('sphere');

   let g2help = new G2();
   let g2done = new G2();

   g2help.setColor('#ffffff');
   g2help.fillRect(0,0,1,.7);
   g2help.setFont('helvetica');
   g2help.setColor('#000000');
   g2help.textHeight(.075);
   g2help.fillText(
`Goal: Move the 8 red balls
into the corners, with the
empty space in the middle.

To play: Click on a ball
to move it into an
empty space next to it.
`, .5, .58, 'center');

   model.txtrSrc(3, g2help.getCanvas());

   // CREATE THE HELP MENU CARD

   let helpMenu = model.add();
   helpMenu.add('cube'  ).move(0,1.47,0).scale(.0999,.07,.0999);
   helpMenu.add('cubeXZ').move(0,1.5 ,0).scale(.1).txtr(3);

   // CREATE THE "CONGRATS YOU ARE DONE" MENU CARD

   g2done.setColor('#ffffff');
   g2done.fillRect(0,.04,1,.7);
   g2done.setColor('#000000');
   g2done.textHeight(.075);
   g2done.fillText(
`CONGRATULATIONS!!!

YOU SOLVED IT!


Click anywhere to
start a new game.
`, .5, .625, 'center');

   model.txtrSrc(4, g2done);

   let doneMenu = model.add();
   doneMenu.add('cube'  ).move(0,1.47,0).scale(.0999,.07,.0999);
   doneMenu.add('cubeXZ').move(0,1.5 ,0).scale(.1).txtr(4);

   // FIND AT WHICH BOX A PARTICULAR HAND ('left' OR 'right') IS POSITIONED

   let findBox = hand => {
      for (let n = 0 ; n < 27 ; n++) {
         let p = cg.subtract(inputEvents.pos(hand), B[n]);
	 if (Math.min(p[0],p[1],p[2]) > -.05 && Math.max(p[0],p[1],p[2]) < .05)
	    return n;
      }
      return -1;
   }

   // ON TRIGGER-RELEASE OR UNPINCH, DO SOMETHING

   inputEvents.onRelease = hand => {

      // IF THE PUZZLE WAS ALREADY SOLVED, CREATE A NEW PUZZLE

      if (isSolved()) {
         createNewPuzzle();
         server.broadcastGlobal('puzzle');
         return;
      }

      // OTHERWISE, IF THE HAND IS AT A BOX ADJACENT TO THE
      // EMPTY BOX, THEN SWAP THE CONTENTS OF THE TWO BOXES

      let N = find0();
      let n = findBox(hand);
      if (n >= 0) {
         let a = i(n)-i(N), b = j(n)-j(N), c = k(n)-k(N);
         if (a*a + b*b + c*c == 1) {
            let handPosition = cg.roundVec(4, inputEvents.pos(hand)); // Use the hand's position
            let emptyObj = model.add().move(handPosition);
            let objPos = emptyObj.getGlobalMatrix();
            playSoundAtPosition(moveSoundBuffer, [objPos[12], objPos[13], objPos[14]]);

            model.remove(emptyObj);
            swap(n, N);
            server.broadcastGlobal('puzzle');
         }
      }
   }

   inputEvents.onDrag = hand => nh[hand] = findBox(hand); // KEEP TRACK OF WHICH BOX EACH HAND
   inputEvents.onMove = hand => nh[hand] = findBox(hand); // IS IN AS IT MOVES OR DRAGS AROUND

   // WHAT TO DO AT EACH ANIMATION FRAME

   model.animate(() => {

      // SYNCRHONIZE WITH ALL THE OTHER CLIENTS

      puzzle = server.synchronize('puzzle');

      // DISPLAY ONE OF THE TWO MENU CARDS

      helpMenu.identity().scale(isSolved() ? 0 : 1);
      doneMenu.identity().scale(isSolved() ? 1 : 0);

      // RENDER THE SPHERES

      for (let n = 0 ; n < 27 ; n++)
         model.child(n).identity().move(B[n]).scale(puzzle[n]==0 ? 0 : .03)
	                                     .color(nh.left==n || nh.right==n ? puzzle[n]==2 ? [1,.5,.5] : [.5,.75,1]
	                                                                      : puzzle[n]==2 ? [.5,0,0] : [0,.25,.5]);
   });
}


