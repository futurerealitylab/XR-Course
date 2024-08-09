import * as cg from "../render/core/cg.js";
import { Diagram } from "../render/core/diagram.js";

// PERSISTENT STATE

window.chessA = { wl: { i: -1, p: [0,0,0] }, // WHITE PLAYER LEFT  HAND TOUCH STATE
                  wr: { i: -1, p: [0,0,0] }, // WHITE PLAYER RIGHT HAND TOUCH STATE
                  bl: { i: -1, p: [0,0,0] }, // BLACK PLAYER LEFT  HAND TOUCH STATE
                  br: { i: -1, p: [0,0,0] }, // BLACK PLAYER RIGHT HAND TOUCH STATE
                  sq: [ 11, 12, 13, 14, 15, 16, 17, 18,
                        21, 22, 23, 24, 25, 26, 27, 28,        // WHICH SQUARE EACH
                        71, 72, 73, 74, 75, 76, 77, 78,        // CHESS PIECE IS ON
                        81, 82, 83, 84, 85, 86, 87, 88 ] };

delete window.clientID; // ON CODE RELOAD, FORCE THE PERSISTENT STATE OBJECT TO RELOAD.

// CONSTANTS AND HELPER FUNCTIONS

const inch = 0.0254;      // inches per meter
const W    = 2.25 * inch; // width of one square on the board
const H    = 0.75 * inch; // height of the board

// ROWS AND COLS 1-8 ARE ON THE BOARD. ROWS AND COLS 0 AND 9 ARE OFF THE BOARD.

let pos       = (col, row) => [ W * (col-4.5), H, W * (row-4.5) ];
let isOnBoard = (col, row) => col > 0 && col < 9 && row > 0 && row < 9;

export const init = async model => {

   //////////////////// HANDLE USER INPUT ////////////////////

   // FIND WHICH SQUARE OF THE BOARD (IF ANY) THE USER IS TOUCHING

   let findSquare = hand => {
      for (let row = 0 ; row < 10 ; row++)
      for (let col = 0 ; col < 10 ; col++) {
         let n = row * 10 + col, i;
         for (i = 32 ; i >= 0 && chessA.sq[i] != n ; i--) ;
         let p = cg.subtract(inputEvents.pos(hand), pos(col,row));
         p[1] = chessA.i > -1 ? 0 : p[1] - chessSet.getMatrix()[13] - (i < 0 ? 0 : ph[i]*W);
         if (Math.min(p[0],p[1],p[2]) > -W/2 && Math.max(p[0],p[1],p[2]) < W/2)
            return n;
      }
      return -1;
   }

   // KEEP TRACK OF WHICH SQUARE IS TOUCHED BY EACH CONTROLLER/HAND

   let squareAt = {left: -1, right: -1};

   // WHILE TRIGGER/PINCH, KEEP TRACK OF SQUARE AT EACH CONTROLLER/HAND

   inputEvents.onMove = hand => squareAt[hand] = findSquare(hand);

   // THERE ARE FOUR KINDS OF TOUCH: WHITE/LEFT, WHITE/RIGHT, BLACK/LEFT, BLACK/RIGHT

   let getTouch = hand => chessA[isBlack ? hand=='left' ? 'bl' : 'br' :
                                           hand=='left' ? 'wl' : 'wr' ];

   // AT TRIGGER/PINCH ONSET, GRAB THE CHESS PIECE AT THIS CONTROLLER/HAND, IF ANY

   inputEvents.onPress = hand => {
      let touch = getTouch(hand);
      touch.i = -1;
      if (squareAt[hand] > -1)
         for (let i = 0 ; i < chessA.sq.length ; i++)
            if (chessA.sq[i] == squareAt[hand]) {
               touch.i = i;
               return;
            }
   }

   // DRAG TO MOVE THE SELECTED CHESS PIECE, AND ALSO ALERT OTHER CLIENTS

   inputEvents.onDrag = hand => {
      let touch = getTouch(hand);
      squareAt[hand] = findSquare(hand);
      if (touch.i > -1 && squareAt[hand] > -1) {
         chessA.sq[touch.i] = squareAt[hand];
         touch.p = cg.roundVec(3, inputEvents.pos(hand));
         touch.p[1] = cg.roundFloat(3, Math.max(H, touch.p[1] - chessSet.getMatrix()[13] - ph[touch.i]*W));
         server.broadcastGlobal('chessA');
      }
   }

   // RELEASE THE TRIGGER/PINCH TO UNSELECT

   inputEvents.onRelease = hand => getTouch(hand).i = -1;

   ///////////////////////////////////////////////////////////

   let chessSet = model.add().move(0,1.6,0); // PLACE THE CHESS SET AT TABLE HEIGHT.

   // BUILD THE CHESS BOARD

   let board = chessSet.add();
   for (let row = 0 ; row < 10 ; row++)
   for (let col = 0 ; col < 10 ; col++)
      board.add('cube').move(pos(col, row)).move(0,-H/2,0).scale(W/2, H/2, W/2)
                       .color(isOnBoard(col,row) ? (col+row)%2 ? [.2,.2,.2] : [.6,.6,.6] : [.2,.1,.05]);

   // RECIPE FOR CREATING EACH TYPE OF CHESS PIECE

   let P = () => chessSet.add().label('P').add('cube').move(0,W / 4,0).scale(W/6,W/4,W/6).parent();
   let N = s  => chessSet.add().label('N').add('cube').move(0,W*.39,0).scale(W/5,W*.39,W/8).parent()
                                          .add('cube').move(0,W*.66,s?-W/6:W/6).scale(W/5,W*.12,W/12).parent();
   let B = () => chessSet.add().label('B').add('cube').move(0,W*.68,0).scale(W/6,W/2.1,W/6).project(0,.3,0).parent();
   let R = () => chessSet.add().label('R').add('cube').move(0,W / 4,0).scale(W/4,W/4,W/4).parent();
   let Q = () => chessSet.add().label('Q').add('cube').move(0,W*.63,0).scale(W/4,W*.63,W/4).parent();
   let K = () => chessSet.add().label('K').add('cube').move(0,W*3/4,0).scale(W/5,W*3/4,W/5).parent()
                                          .add('cube').move(0,W*1.06,0).scale(W*.43,W/5,W/5).parent();

   let pieces  = [ R(),N(0),B(),Q(),K(),B(),N(0),R(),   // INITIAL POSITION ON THE BOARD
                   P(),P() ,P(),P(),P(),P(),P() ,P(),   // FOR EACH OF THE 32 CHESS PIECES.
                   P(),P() ,P(),P(),P(),P(),P() ,P(),
                   R(),N(1),B(),Q(),K(),B(),N(1),R() ];

   let ph = [.5,.8,1 ,1.25,1.5,1 ,.8,.5,
             .5,.5,.5, .5 , .5,.5,.5,.5,
             .5,.5,.5, .5 , .5,.5,.5,.5,
             .5,.8,1 ,1.25,1.5,1 ,.8,.5];

   for (let i = 0 ; i < chessA.sq.length ; i++)          // THE FIRST 16 CHESS PIECES ARE BLACK.
      pieces[i].color(i < 16 ? 'black' : 'white');      // THE LAST 16 CHESS PIECES  ARE WHITE.

   let isBlack = false;

   model.animate(() => {
      chessA = server.synchronize('chessA');             // SYNCHRONIZE WITH THE OTHER PLAYERS.
      isBlack = clientID != clients[0];
      inputEvents.flip(isBlack);
      for (let i = 0 ; i < chessA.sq.length ; i++) {
         let col = chessA.sq[i] % 10;                   // POSITION ALL THE PIECES FOR RENDERING.
         let row = chessA.sq[i] / 10 >> 0;
         let p = pos(col, row);
         let lt = getTouch('left' ); if (i == lt.i) p = lt.p;
         let rt = getTouch('right'); if (i == rt.i) p = rt.p;
         pieces[i].identity().move(p).opacity(isOnBoard(col, row) ? 1 : .7);
      }
   });
}

