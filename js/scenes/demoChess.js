import * as cg from "../render/core/cg.js";
import { Diagram } from "../render/core/diagram.js";

const G = true;    // IS THIS A GIANT CHESS SET?

// PERSISTENT STATE

window.chess = { i:-1,                                    // INDEX OF SELECTED CHESS PIECE
                 p: [0,0,0],                              // POSITION OF SELECTED CHESS PIECE
		 sq:[ 11, 12, 13, 14, 15, 16, 17, 18,
		      21, 22, 23, 24, 25, 26, 27, 28,     // WHICH SQUARE EACH
                      71, 72, 73, 74, 75, 76, 77, 78,     // CHESS PIECE IS ON
		      81, 82, 83, 84, 85, 86, 87, 88 ] };

//delete window.clientID; // ON CODE RELOAD, FORCE THE PERSISTENT STATE OBJECT TO RELOAD.

// CONSTANTS AND HELPER FUNCTIONS

const inch = 0.0254;                  // inches per meter

let W = (G ? 15 : 2.25) * inch; // width of one square on the board
let H = W / (G ? 100 : 3);      // height of the board

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
         for (i = 32 ; i >= 0 && chess.sq[i] != n ; i--) ;
         let p = cg.subtract(inputEvents.pos(hand), pos(col,row));
         p[1] = chess.i > -1 ? 0 : p[1] - chessSet.getMatrix()[13] - (i < 0 ? 0 : ph[i]*W);
         if (Math.min(p[0],p[1],p[2]) > -W/2 && Math.max(p[0],p[1],p[2]) < W/2)
            return n;
      }
      return -1;
   }

   // KEEP TRACK OF WHICH SQUARE IS TOUCHED BY EACH CONTROLLER

   let squareAt = {left: -1, right: -1};

   // WHILE TRIGGER IS NOT PRESSED, KEEP TRACK OF SQUARE AT EACH CONTROLLER

   inputEvents.onMove = hand => squareAt[hand] = findSquare(hand);

   // WHEN TRIGGER IS PRESSED, GRAB THE CHESS PIECE AT THIS CONTROLLER, IF ANY

   inputEvents.onPress = hand => {
      chess.i = -1;
      if (squareAt[hand] > -1)
         for (let i = 0 ; i < chess.sq.length ; i++)
            if (chess.sq[i] == squareAt[hand]) {
	       chess.i = i;
	       return;
	    }
   }

   // DRAG TO MOVE THE SELECTED CHESS PIECE, AND ALSO ALERT OTHER CLIENTS

   inputEvents.onDrag = hand => {
      squareAt[hand] = findSquare(hand);
      if (chess.i > -1 && squareAt[hand] > -1) {
         chess.sq[chess.i] = squareAt[hand];
         chess.p = cg.roundVec(3, inputEvents.pos(hand));
	 chess.p[1] = cg.roundFloat(3, Math.max(H, chess.p[1] - chessSet.getMatrix()[13] - ph[chess.i]*W));
         server.broadcastGlobal('chess');
      }
   }

   // RELEASE THE TRIGGER TO UNSELECT

   inputEvents.onRelease = hand => chess.i = -1;

   ///////////////////////////////////////////////////////////

   let chessSet = model.add();
   if (G)
      chessSet.opacity(.6);
   else
      chessSet.move(0,1,0);

   // BUILD THE CHESS BOARD

   model.txtrSrc(1, '../media/textures/chessboard.png');

   let board = chessSet.add();
   board.add('cube').move(0,H/2,0).scale(5*W,H/2,5*W).color(.2,.1,.05);
   board.add('cube').move(0,H,0).scale(4*W,.01,4*W).txtr(1);

   // RECIPE FOR CREATING EACH TYPE OF CHESS PIECE

   // 3 4 5 6 7
   // 4 4.75 5.5 6.25 7

   let P = () => chessSet.add().label('P').add('cube').move(0,W *.4  ,0).scale(W*.2 ,W*.4  ,W*.2 ).parent();
   let R = () => chessSet.add().label('R').add('cube').move(0,W *.4  ,0).scale(W/3  ,W*.4  ,W/3  ).parent();
   let N = s  => chessSet.add().label('N').add('cube').move(0,W *.475,0).scale(W/5  ,W*.475,W/8  ).parent()
                                          .add('cube').move(0,W*(G?.89:.83),s?-W/6:W/6)
					                                .scale(W/5  ,W*(G?.06:.12),
								                           W/12  ).parent();
   let B = () => chessSet.add().label('B').add('cube').move(0,W*.70,0).scale(W/6    ,W*.495,W/6  ).project(0,.3,0).parent();
   let Q = () => chessSet.add().label('Q').add('cube').move(0,W *.625,0).scale(W/4  ,W*.625,W/4  ).parent();
   let K = () => chessSet.add().label('K').add('cube').move(0,W *.7  ,0).scale(W/5  ,W*.7  ,W/5  ).parent()
                                          .add('cube').move(0,W *(G?1.2:1),0)
					                              .scale(W*.43,W/5*(G?.5:1)
								                         ,W/5 ).parent();

   let pieces  = [ R(),N(0),B(),Q(),K(),B(),N(0),R(),   // INITIAL POSITION ON THE BOARD
                   P(),P() ,P(),P(),P(),P(),P() ,P(),   // FOR EACH OF THE 32 CHESS PIECES.
                   P(),P() ,P(),P(),P(),P(),P() ,P(),
		   R(),N(1),B(),Q(),K(),B(),N(1),R() ];

   let ph = [ 0.8  , 0.95, 1.1 , 1.25, 1.4 , 1.1 , 0.95, 0.8 , 
              0.8  , 0.8 , 0.8 , 0.8 , 0.8 , 0.8 , 0.8 , 0.8 , 
	      0.8  , 0.8 , 0.8 , 0.8 , 0.8 , 0.8 , 0.8 , 0.8 , 
	      0.8  , 0.95, 1.1 , 1.25, 1.4 , 1.1 , 0.95, 0.8 ];

   if (G)
      for (let i = 0 ; i < ph.length ; i++)
         ph[i] *= 2;

   for (let i = 0 ; i < chess.sq.length ; i++)          // THE FIRST 16 CHESS PIECES ARE BLACK.
      pieces[i].color(i < 16 ? 'black' : 'white');      // THE LAST 16 CHESS PIECES  ARE WHITE.

   model.animate(() => {
      chess = server.synchronize('chess');             // SYNCHRONIZE WITH THE OTHER PLAYERS.
      //inputEvents.flip(clientID != clients[0]);
      for (let i = 0 ; i < chess.sq.length ; i++) {
	 let col = chess.sq[i] % 10;                   // POSITION ALL THE PIECES FOR RENDERING.
	 let row = chess.sq[i] / 10 >> 0;
	 let p = i == chess.i ? chess.p : pos(col, row);
	 pieces[i].identity().move(p).opacity(isOnBoard(col, row) ? .9 : G ? .7 : .6);
	 if (G)
	    pieces[i].scale(1,2,1);
      }
   });
}

