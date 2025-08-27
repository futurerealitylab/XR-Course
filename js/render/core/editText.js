
export function EditText() {

   // DECLARE VARIABLES

   let callback = () => {};
   let col = 0;
   let index = 0;
   let isMeta    = false;
   let isControl = false;
   let isDown    = false;
   let isAlt     = false;
   let isShift   = false;
   let isSpace   = false;
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

   // LET CLIENT CHECK FOR MODIFIER KEYS

   this.isModifier = key => {
      switch (key) {
      case ' '      : return isSpace  ;
      case 'Alt'    : return isAlt    ;
      case 'Control': return isControl;
      case 'Meta'   : return isMeta   ;
      case 'Shift'  : return isShift  ;
      }
      return false;
   }

   // HANDLING KEYBOARD INPUT

   this.keydown = e => {
      switch (e.key) {
      case ' '      : isSpace   = true; break;
      case 'Alt'    : isAlt     = true; break;
      case 'Control': isControl = true; break;
      case 'Meta'   : isMeta    = true; break;
      case 'Shift'  : isShift   = true; break;
      }
   }

   this.keyup = e => {

      switch (e.key) {
      case ' '      : isSpace   = false; break;
      case 'Alt'    : isAlt     = false; return;
      case 'Control': isControl = false; return;
      case 'Meta'   : isMeta    = false; return;
      case 'Shift'  : isShift   = false; return;
      }

      if (isControl) {
         switch (e.key) {
	 case 'y' : redo(); return;
	 case 'z' : undo(); return;
	 }
      }

      if (callback)
         callback(e.key);

      if (isShift) {
         switch (e.key) {
         case 'ArrowLeft' : col = 0; break;
         case 'ArrowRight': col = rowLength(row); break;
         case 'ArrowUp'   : row = 0; break;
         case 'ArrowDown' : row = lines.length-1; break;
         }
         computeIndex();
      }

      if (isSpace || isAlt || isControl || isMeta)
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
	 else {
	    col++;                               // AFTER INSERT: IF THE LINE ENDS
	    let i = text.indexOf('\n', index);   // WITH A SPACE, THEN REMOVE IT.
	    if (i >= 0 && text.charAt(i-1) == ' ')
               text = text.substring(0, i-1) + text.substring(i, text.length);
         }
         lines = text.split('\n');
         computeIndex();
      }

      saveForUndo();

      switch (e.key) {
      case 'Backspace' : deleteChar()    ; return;
      case 'Enter'     : insertChar('\n'); return;
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

