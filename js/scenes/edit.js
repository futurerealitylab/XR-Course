import * as cg from "../render/core/cg.js";
import { Structure } from "../render/core/structure.js";
import { texts } from "../util/texts.js";

const NCOLS = 20, NROWS = 10;
let newTextLine = () => {
   let s = '';
   for (let col = 0 ; col < NCOLS ; col++)
      s += ' ';
   return s;
}
let text = [];
for (let row = 0 ; row < NROWS ; row++) {
   text.push(newTextLine());
}

export const init = async model => {
   let S = new Structure();
   S.textHeight(.05);
   let textID = S.text('', [0,1,0], NCOLS, NROWS);
   S.build(model);
   let row = 0, col = 0;
   let unhighlight = () => S.setTextColor(textID, col, row, [1,1,1])
   let highlight   = () => S.setTextColor(textID, col, row, [.7,.7,.7])
   highlight();
   model.animate(() => {
      let cursorRight = () => {
         if (++col == NCOLS) {
	    if (++row == NROWS) {
	       --col;
	       --row;
            }
            else
               col = 0;
         }
      }
      let cursorLeft = () => {
         if (--col < 0)
	    if (--row < 0) {
	       ++col;
	       ++row;
            }
            else
               col = NCOLS -1;
      }
      let cursorUp = () => {
         if (--row < 0)
	    ++row;
      }
      let cursorDown = () => {
         if (++row == NROWS)
	    --row;
      }
      let findEndOfRow = () => {
	 for ( ; col > 0 ; col--)
	    if (text[row].charAt(col-1) != ' ')
               break;
      }
      for (let i = 0 ; i < clients.length ; i++) {
         let id = clients[i], event;
	 while ((event = clientState.event(id)) !== undefined) {
	    if (event.type == 'keyup') {
	       unhighlight();
	       if (event.key == 'Backspace') {
	          if (col > 0 || row > 0) {
	             if (col == 0) {
			--row;
			col = NCOLS-1;
			findEndOfRow();
		        text[row] = text[row].substring(0,col) + text[row+1];
			for (let r = row+1 ; r < NROWS-1 ; r++)
			   text[r] = text[r+1];
			text[NROWS-1] = '';
		     }
		     else {
	                cursorLeft();
	                text[row] = text[row].substring(0, col) + text[row].substring(col+1) + ' ';
                     }
                  }
               }
	       else if (event.key == 'Enter') {
	          for (let r = NROWS-2 ; r > row ; r--)
		     text[r+1] = text[r];
	          text[row+1] = text[row].substring(col);
	          text[row] = text[row].substring(0, col);
		  row++;
		  col = 0;
               }
	       else if (event.key == 'ArrowUp') {
	          cursorUp();
		  findEndOfRow();
               }
	       else if (event.key == 'ArrowDown') {
	          cursorDown();
		  findEndOfRow();
               }
	       else if (event.key == 'ArrowLeft') {
	          cursorLeft();
               }
	       else if (event.key == 'ArrowRight') {
	          cursorRight();
               }
	       else if (event.key.length == 1) {
	          text[row] = text[row].substring(0, col) + event.key + text[row].substring(col);
		  cursorRight();
               }
	       highlight();
	    }
	 }
	 for (let r = 0 ; r < NROWS ; r++) {
	    while (text[r].length < NCOLS)
	       text[r] += ' ';
            text[r] = text[r].substring(0, NCOLS);
	    S.setText(textID, 0, r, text[r]);
         }
      }
      S.update();
   });
}

