
export function EditText() {

   // DECLARE VARIABLES

   let callback = () => {};
   let col = 0;
   let index = 0;
   let isCommand = false;
   let isControl = false;
   let isDown = false;
   let isOption = false;
   let isShift = false;
   let isSpace = false;
   let lines = [];
   let row = 0;
   let text = '';

   // MODIFY OR QUERY TEXT

   this.setCallback = f => callback = f;
   this.setText = str => lines = (text = str).split('\n');
   this.getText = ()  => text;
   this.setCol  = c   => col = c;
   this.getCol  = ()  => Math.min(col, rowLength(row));
   this.setRow  = r   => row = r;
   this.getRow  = ()  => Math.min(row, lines.length);

   // HANDLING KEYBOARD INPUT

   this.keydown = e => {

      switch (e.key) {
      case ' '      : isSpace   = true; break;
      case 'Alt'    : isOption  = true; break;
      case 'Control': isControl = true; break;
      case 'Meta'   : isCommand = true; break;
      case 'Shift'  : isShift   = true; break;
      }

      if (isCommand && e.key == 'z')
         if (isShift)
	    redo();
	 else
	    undo();

      if (isCommand) {
         if (e.code >= 'KeyA' && e.code < 'KeyZ') {
	    callback(e.code);
	    return;
	 }

         switch (e.code) {
         case 'ArrowLeft' : col = 0; break;
         case 'ArrowRight': col = rowLength(row); break;
         case 'ArrowUp'   : row = 0; break;
         case 'ArrowDown' : row = lines.length-1; break;
         default          : return;
         }
         computeIndex();
      }
   }

   this.keyup = e => {

      switch (e.key) {
      case ' '      : isSpace   = false; break;
      case 'Alt'    : isOption  = false; return;
      case 'Control': isControl = false; return;
      case 'Meta'   : isCommand = false; return;
      case 'Shift'  : isShift   = false; return;
      }

      if (isControl || isOption || isCommand)
         return;

      let deleteChar = () => {
         if (row > 0 || col > 0) {
            text = text.substring(0, index-1) + text.substring(index, text.length);
            if (col == 0)
	       col = rowLength(--row);
            else
	       col--;
         }
	 else
	    text = text.substring(1, text.length);
         lines = text.split('\n');
         computeIndex();
      }

      let insertChar = ch => {
         text = text.substring(0, index) + ch + text.substring(index, text.length);
	 if (ch == '\n') {
	    row++;
	    col = 0;
	 }
	 else
	    col++;
         lines = text.split('\n');
         computeIndex();
      }

      saveForUndo();

      switch (e.keyCode) {
      case  8: deleteChar()    ; return;
      case 13: insertChar('\n'); return;
      case 32: insertChar(' ') ; return;
      }

      switch (e.code) {
      case 'ArrowLeft' : col = Math.max(col-1,  0); break;
      case 'ArrowRight': col = Math.min(col+1, 80); break;
      case 'ArrowUp'   : row = Math.max(row-1,  0); break;
      case 'ArrowDown' : row = Math.min(row+1, lines.length-1); break;
      default          : insertChar(e.key); return;
      }

      computeIndex();
   }

   // INTERNAL FUNCTIONS

   let rowLength = row => row < 0 || row >= lines.length ? 0 : lines[row].length;

   let computeIndex = () => {
      index = 0;
      let r = Math.min(row, lines.length);
      for (let n = 0 ; n < r ; n++)
         index += lines[n].length + 1;
      index += Math.min(col, lines[r].length);
   }

   // HANDLE UNDO AND REDO

   let stack = [], stackPointer = -1;

   let saveForUndo = () => stack[++stackPointer] = text;

   let undo = () => {
      if (stackPointer >= 0)
         this.setText(stack[stackPointer--])
   }

   let redo = () => {
      if (stackPointer < stack.length - 1)
         this.setText(stack[++stackPointer]);
   }
}

