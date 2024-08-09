import * as cg from "./cg.js";
export function Anidraw(canvas) {

// DECLARE VARIABLES

let clockStartTime;
let codeText = '';
let codeTextIndex = codeText.length-1;
let codeTextIndexWithinLine = 0;
let colorIndex = 0;
let colors = ['black','red','orange','yellow','green','blue','magenta'];
let context = canvas.getContext('2d');
let data = [];
let dataIndex = 0;
let e_x;
let e_y;
let fontHeight = canvas.width / 16;
let height = canvas.height;
let clearImage = new ImageData(canvas.width, canvas.height);
let isCodeText = false;
let isControl = false;
let isDown = false;
let isDrawingMode = true;
let isInCodeText = false;
let isInTimeline = false;
let isMeta = false;
let isPlaying = false;
let isShift = false;
let isShowTimeline = false;
let isSlanted = false;
let isSpace = false;
let isSpaceKeyCombo = false;
let isTimelineInteractive = true;
let motionStartTime;
let nActive = -1;
let playEndTime = 0;
let shapes = [];
let slant = 0;
let text = null;
let th = fontHeight / 2;
let time;
let timeBegin = 0;
let timeEnd = 20;
let timeNow = 0;
let ty = fontHeight * 3 / 4;
let width = canvas.width;
let x;
let y;

// WRITE THE DATA DESCRIBING THE DRAWING TO THE CONSOLE

let save = () => {
   let round = t => (100 * t >> 0) / 100;
   let s = copyShapes(shapes);
   for (let n = 0 ; n < s.length ; n++) {
      for (let i = 0 ; i < s[n].draw.length ; i++) {
         s[n].draw[i].x = round(s[n].draw[i].x);
         s[n].draw[i].y = round(s[n].draw[i].y);
      }
      for (let i = 0 ; i < s[n].move.length ; i++) {
         s[n].move[i].x    = round(s[n].move[i].x);
         s[n].move[i].y    = round(s[n].move[i].y);
         s[n].move[i].time = round(s[n].move[i].time);
      }
   }
   console.log('data.push('+JSON.stringify(s).replace(/\n/g,'<br>')+');');
}

// THIS NEXT LINE IS FOR TESTING (UNCOMMENT TO LOAD TEST CONTENT)

//data.push([{"timeBegin":0,"timeEnd":20,"draw":[{"x":228,"y":173,"type":"text","text":"Hello"}],"move":[]}]);

// LOAD DATA DESCRIBING A DRAWING

let load = () => {
   shapes = data[dataIndex];
   for (let n = 0 ; n < shapes.length ; n++)
   for (let i = 0 ; i < shapes[n].draw.length ; i++)
      if (shapes[n].draw[i].type == 'text')
         shapes[n].draw[i].text = shapes[n].draw[i].text.replace(/<br>/g,'\n');
}

if (data.length > 0)
   load();

// SET DEFAULT DRAWING PARAMETERS

context.lineCap = "round";

////////////////// HANDLE UNDO AND REDO //////////////////

let backup = [], backupIndex = -1;

let copyPath = src => {
   let dst = [];
   for (let i = 0 ; i < src.length ; i++) {
      let item = {};
      for (let key in src[i])
         item[key] = src[i][key];
      dst.push(item);
   }
   return dst;
}

let copyPaths = src => {
   let dst = [];
   for (let n = 0 ; n < src.length ; n++)
      dst.push(copyPath(src[n]));
   return dst;
}

let copyShape = src => {
   return {
      timeBegin: src.timeBegin,
      timeEnd  : src.timeEnd,
      draw     : copyPath(src.draw),
      move     : copyPath(src.move),
   };
}

let copyShapes = src => {
   let dst = [];
   for (let n = 0 ; n < src.length ; n++)
      dst.push(copyShape(src[n]));
   return dst;
};

let saveForUndo = () => {
   backup[++backupIndex] = {
      timeNow : timeNow,
      nActive : nActive,
      shapes  : copyShapes(shapes),
   };
}

let undo = () => {
   if (backupIndex >= 0) {
      backup[backupIndex+1] = {
         nActive : nActive,
         shapes  : shapes,
      };
      let snapshot = backup[backupIndex--];
      timeNow = snapshot.timeNow;
      nActive = snapshot.nActive;
      shapes  = snapshot.shapes;
   }
}

let redo = () => {
   if (backupIndex < 0)
      backupIndex++;
   if (backup[backupIndex+1]) {
      let snapshot = backup[++backupIndex];
      timeNow = snapshot.timeNow;
      nActive = snapshot.nActive;
      shapes  = snapshot.shapes;
   }
   if (! backup[backupIndex+1])
      backupIndex--;
}

//////////////////////////////////////////////////////////

// CONVERSIONS BETWEEN TIME AND X COORDINATE

let timeToX = time => width * (time - timeBegin) / (timeEnd - timeBegin);
let xToTime = x => 100 * timeBegin + x * (timeEnd - timeBegin) / width;

// HELPER FUNCTIONS

let timeOffset = shape => {
   let p = shape.move;
   if (p.length < 2)
      return {x:0, y:0};

   let t = timeNow, x = 0, y= 0, i0, i1;
   for (i1 = 0 ; i1 < p.length-1 && p[i1+1].time < t ; i1++)
      ;
   for (i0 = i1 ; i0 > 0 ; ) {
      i1 = i0 - 1;
      for (i0 = i1 ; p[i0].type == 'draw' ; i0--)
         ;
      x += p[i1].x - p[i0].x;
      y += p[i1].y - p[i0].y;
   }
   if (shape.parent) {
      let parentOffset = timeOffset(shape.parent);
      x += parentOffset.x;
      y += parentOffset.y;
   }
   return { x: x, y: y };
}

let isNear = (a,b) => {
   let dx = a.x - b.x;
   let dy = a.y - b.y;
   return dx * dx + dy * dy < 10 * 10;
}

let isPathIntersection = (nA,nB) => {
   if ( shapes[nA].timeBegin > timeNow || shapes[nA].timeEnd < timeNow ||
        shapes[nB].timeBegin > timeNow || shapes[nB].timeEnd < timeNow )
      return false;

   let dA = timeOffset(shapes[nA]);
   let dB = timeOffset(shapes[nB]);
   let A = shapes[nA].draw;
   let B = shapes[nB].draw;

   // PATHS INTERSECT IF ANY LINES TOUCH

   for (let i = 0 ; i < A.length ; i++)
   for (let j = 0 ; j < B.length ; j++)
      if (A[i].type != 'text' && B[j].type != 'text')
         if (isNear( { x: A[i].x + dA.x, y: A[i].y + dA.y },
                     { x: B[j].x + dB.x, y: B[j].y + dB.y } ))
            return true;

   // PATHS INTERSECT IF ONE COMPLETELY CONTAINS THE OTHER

   let bounds = (path, d) => {
      let xlo = 1000, xhi = -1000, ylo = 1000, yhi = -1000;
      for (let i = 0 ; i < path.length ; i++) {
         let b = path[i].type == 'text'
               ? textBounds(path[i].text, path[i].x + d.x, path[i].y + d.y)
               : { xlo: path[i].x + d.x, xhi: path[i].x + d.x,
                   ylo: path[i].y + d.y, yhi: path[i].y + d.y };
         xlo = Math.min(xlo, b.xlo);
         xhi = Math.max(xhi, b.xhi);
         ylo = Math.min(ylo, b.ylo);
         yhi = Math.max(yhi, b.yhi);
      }
      return { xlo:xlo, xhi:xhi, ylo:ylo, yhi:yhi };
   }
   let contains = (A,B) => A.xlo < B.xlo && A.xhi > B.xhi &&
                           A.ylo < B.ylo && A.yhi > B.yhi ;
   let bA = bounds(A, dA);
   let bB = bounds(B, dB);
   return contains(bA, bB) || contains(bB, bA);
}

let isPointOnPath = (p, n) => {
   if (shapes[n].timeBegin > timeNow || shapes[n].timeEnd < timeNow)
       return false;

   let P = shapes[n].draw;
   let d = timeOffset(shapes[n]);
   for (let i = 0 ; i < P.length ; i++)
      if (P[i].type == 'text') {
         let b = textBounds(P[i].text, P[i].x + d.x, P[i].y + d.y);
         if (b.xlo < p.x && b.xhi > p.x && b.ylo < p.y && b.yhi > p.y)
            return true;
      }
      else if (isNear(p, { x: P[i].x + d.x, y: P[i].y + d.y }))
         return true;
   return false;
}

let findMotionPathInTimeline = time => {
   for (let n = shapes.length - 1 ; n >= 0 ; n--) {
      let P = shapes[n].move;
      for (let i = 0 ; i < P.length-1 ; i++)
         if (P[i+1].type == 'draw' && P[i].time <= time && P[i+1].time > time)
            return n;
   }
   return -1;
}

// INTERFACE FOR HANDLING EXTERNAL DRAW FUNCTIONS

let drawFunction = null;

this.setDrawFunction = value => drawFunction = value;

this.textLabel = (context,data) => {
   let def = (arg,dflt) => arg !== undefined ? arg : dflt;

   let bgColor = def(data.bgColor, 'white');
   let color   = def(data.color  , 'black');
   let font    = def(data.font   , 'courier');
   let hAlign  = def(data.hAlign , 0.0);
   let height  = def(data.height , 30);
   let pad     = def(data.pad    , 5);
   let text    = def(data.text   , '');
   let vAlign  = def(data.vAlign , 0.5);
   let x       = def(data.x      , 0);
   let y       = def(data.y      , 0);

   context.font = height + 'px ' + font;
   let width = context.measureText(text).width;

   x += width  * (1 - hAlign);
   y += height * (0.5 - vAlign);

   context.fillStyle = bgColor;
   context.fillRect(x - pad, y - height*7/10 - pad, width + 2 * pad, height + 2 * pad);
   context.fillStyle = color;
   context.fillText(text, x, y);
}

// INTERFACE FOR HANDLING CODE TEXT

this.getIsCodeText = () => isCodeText;
this.setIsCodeText = state => isCodeText = state;
this.setCodeText = str => codeText = str;
this.getCodeText = () => codeText;

// INTERFACE FOR HANDLING TIMELINE

this.setTimelineInteractive = state => isTimelineInteractive = state;
this.showTimeline = state => isShowTimeline = state;

// INTERFACE FOR HANDLING EVENTS

this.keydown = e => {
   switch (e.key) {
   case 'Alt'    : this.mousedown({x:eventUntransformX(x), y:eventUntransformY(y)});
                                                       break;
   case ' '      : isSpace   = true;                   break;
   case 'Control': isControl = true;                   break;
   case 'Meta'   : isMeta    = true;                   break;
   case 'Shift'  : isShift   = true; e_x = x; e_y = y; break;
   }
}

let codeTextKeyup = e => {
   if (isControl) {
      switch (e.key) {
      case 't': isCodeText = false; break;
      }
      return;
   }

   let deleteChar = () => {
      codeText = codeText.substring(0, codeTextIndex) +
                 codeText.substring(codeTextIndex+1, codeText.length);
      codeTextIndex = Math.max(codeTextIndex-1, 0);
   }

   let insertChar = ch => {
      codeText = codeText.substring(0, codeTextIndex+1) +
                 ch +
                 codeText.substring(codeTextIndex+1, codeText.length);
      codeTextIndex = Math.min(codeTextIndex+1, codeText.length-1);
   }

   switch (e.keyCode) {
   case  8:
      deleteChar();
      return;
   case 13:
      insertChar('\n');
      return;
   case 32:
      insertChar(' ');
      return;
   }

   switch (e.code) {
   case 'ArrowLeft':
      codeTextIndex = Math.max(0, codeTextIndex-1);
      return;
   case 'ArrowRight':
      codeTextIndex = Math.min(codeText.length, codeTextIndex+1);
      return;
   case 'ArrowUp':
      {
         if (codeTextIndexWithinLine == codeTextIndex)
            return;
         let i0, i1 = codeTextIndex;
         for ( ; i1 > 0 && codeText.charAt(i1) != '\n' ; i1--)
            ;
         for (i0 = i1 ; i0 > 0 && codeText.charAt(i0-1) != '\n' ; i0--)
            ;
         codeTextIndex = Math.min(i0 + codeTextIndexWithinLine, i1-1);
         return;
      }
   case 'ArrowDown':
      {
         if (codeText.lastIndexOf('\n') < codeTextIndex+1)
            return;
         if (codeText.charAt(codeTextIndex) == '\n') {
            codeTextIndex++;
            if (codeText.charAt(codeTextIndex) == '\n')
               return;
         }
         let i0 = codeTextIndex+1, i1;
         for ( ; i0 < codeText.length && codeText.charAt(i0-1) != '\n' ; i0++)
            ;
         for (i1 = i0 ; i1 < codeText.length && codeText.charAt(i1) != '\n' ; i1++)
            ;
         codeTextIndex = Math.min(i0 + codeTextIndexWithinLine, i1-1);
         return;
      }
   }

   insertChar(e.key);
}

this.keyup = e => {

   // IF SPACE WAS USED AS A CONTROL KEY, THEN IGNORE THE KEY-UP FOR THE SPACE KEY.

   if (e.key == ' ') {
      isSpace = false;
      if (isSpaceKeyCombo)
         return;
   }

   // CASES WHERE SPACE IS BEING USED AS A CONTROL KEY.

   if (isSpace) {
      isSpaceKeyCombo = true;
      switch (e.key) {
      case 'h': toggleHeader(); return;
      case 'j': shapes[shapes.length-1].parent = shapes[shapes.length-2]; return;
      case 'v': window.isVideo = ! window.isVideo; return;
      }
      isSpaceKeyCombo = false;
   }

   // HANDLE META/SHIFT/CONTROL UP THE SAME WAY IN ALL MODES

   switch (e.key) {
   case 'Meta'   : isMeta    = false; return;
   case 'Shift'  : isShift   = false; return;
   case 'Control': isControl = false; return;
   }

   // CONTROL KEYS FOR CURRENT DEMO OVERRIDE THE DEFAULT CNTRL-key BEHAVIOR

   if (isControl && window.controlAction(e.key))
      return;

   // IF IN CODETEXT MODE, THEN USE THE CODETEXT TEXT EDITOR.

   if (isCodeText)
      return codeTextKeyup(e);

   // RESPOND TO ANIDRAW KEY EVENTS

   switch (e.code) {
   case 'Backslash'  : // CLEAR EVERYTHING
      saveForUndo();
      isDrawingMode = true;
      isPlaying = false;
      nActive = -1;
      shapes = [];
      text = null;
      timeNow = 0;
      timeBegin = 0;
      timeEnd = 20;
      return;
   case 'AltLeft'    : case 'AltRight'    : this.mouseup({x:x,y:y}); return;
   case 'Backspace'  : if (text != null) text = text.substring(0, text.length-1); return;
   case 'ArrowLeft'  : timeNow = timeBegin; time = undefined; isPlaying = false; return;
   case 'ArrowRight' :
      isPlaying = ! isPlaying;
      if (isPlaying) {
         playEndTime = -1000;
         for (let n = 0 ; n < shapes.length ; n++)
            for (let i = 0 ; i < shapes[n].move.length ; i++)
               playEndTime = Math.max(playEndTime, shapes[n].move[i].time);
      }
      else
         time = undefined;
      return;
   case 'ArrowUp'   : // SET TIME-BEGIN OR DUPLICATE
      if (nActive >= 0) {
         saveForUndo();
         if (isPointOnPath({x:x, y:y}, nActive)) {
            let n = shapes.length;
            shapes[n] = {
               timeBegin: timeNow,
               timeEnd  : timeEnd,
               draw     : copyPath(shapes[nActive].draw),
               move     : copyPath(shapes[nActive].move),
            };
            nActive = n;
         }
         else
            shapes[nActive].timeBegin = timeNow;
      }
      return;
   case 'ArrowDown' : // SET TIME-END
      if (nActive >= 0) {
         saveForUndo();
         shapes[nActive].timeEnd = timeNow;
         if (shapes[nActive].timeEnd <= shapes[nActive].timeBegin) {
            shapes.splice(nActive, 1);
            nActive = -1;
         }
      }
      return;
   }

   // TYPE A CHARACTER ONTO THE NEW TEXT OBJECT

   if (! isMeta && ! isControl && (e.keyCode >= 32 || e.keyCode == 13)) {
      if (text == null) {
         saveForUndo();
         nActive = -1;
         text = '';
      }
      text += e.keyCode == 13 ? '\n' : e.key;
      return;
   }

   // CONTROL KEYS: PRINT, REDO, UNDO

   switch (e.key) {
   case 'c': colorIndex = (colorIndex + 1) % colors.length; break;
   case 'l': if (isControl) load(); break; // CONTROL-L TO LOAD EVERYTHING
   case 's': if (isControl) save(); break; // CONTROL-S TO SAVE EVERYTHING
   case 't': if (isControl) isCodeText = ! isCodeText; isControl = false; break;
   case '/': if (isControl) isSlanted = ! isSlanted; break;
   case 'y': if (isControl) redo(); break;  // CONTROL-Y TO REDO
   case 'z': if (isControl) undo(); break;  // CONTROL-Z TO UNDO
   }
}

let eventTransformX = x => x;
let eventTransformY = y => y * 1.05 + 60;
let eventUntransformX = x => x;
let eventUntransformY = y => (y - 60) / 1.05;

this.mousedown = e => {

   isDown = true;

   let ex = eventTransformX(e.x);
   let ey = eventTransformY(e.y);

   // IF CLICKING DOWN INTO CODETEXT, SET THE TEXT CURSOR POSITION

   isInCodeText = false;
   let index = 0;
   for (let n = 0 ; n < codeTextRegion.length ; n++) {
      let R = codeTextRegion[n];
      if (ex >= R.x && ey >= R.y && ex < R.x + R.w && ey < R.y + R.h) {
         let i = (ex - R.x + 27) / 18 >> 0;
         isInCodeText = true;
         codeTextIndex = index + i;
         codeTextIndexWithinLine = i;
         e_x = ex;
         return;
      }
      index += R.w / 18 >> 0;
   }

   saveForUndo();

   // PREPARE TO SHIFT A SEGMENT OF A MOTION PATH IN TIME

   if (isInTimeline = ey >= ty && ey < ty + th) {
      nActive = findMotionPathInTimeline(xToTime(ex));
      e_x = ex;
      return;
   }

   // PREPARE TO DRAW A SEGMENT OF A DRAWING PATH

   else if (isDrawingMode) {
      nActive = shapes.length;
      shapes.push({
         timeBegin: timeNow,
         timeEnd  : timeEnd,
         draw     : [ { x:ex, y:ey, type:'move' } ],
         move     : [],
      });
   }

   // PREPARE TO DRAW A SEGMENT OF A MOTION PATH

   else if (nActive >= 0) {
      motionStartTime = timeNow;
      clockStartTime = Date.now() / 1000;
      shapes[nActive].move.push({ x:ex, y:ey, type:'move', time:motionStartTime });
   }

};

window.parseCodeText = {};

this.mousemove = e => {

   // ON CODETEXT

   if (isInCodeText) {
      if (isDown) {
         let isNumeric = ch => '0' <= ch && ch <= '9' || ch == '.' || ch == '-';
	 let isNumChar = i => isNumeric(codeText.charAt(i));
	 if (isNumChar(codeTextIndex)) {
            let ex = eventTransformX(e.x);
	    let dx = ex - e_x;
	    e_x = ex;

	    let i0, i1;
	    for (i0 = codeTextIndex ; isNumChar(i0-1) ; i0--) ;
	    for (i1 = codeTextIndex ; isNumChar(i1+1) ; i1++) ;
	    let str0 = codeText.substring(i0, i1+1);
	    let value = parseFloat(codeText.substring(i0, i1+1));
	    value += dx < 0 ? -.01 : dx > 0 ? .01 : 0;
	    let str1 = cg.round(value);
	    codeTextIndex += str1.length - str0.length;
	    codeText = codeText.substring(0, i0) + str1 + codeText.substring(i1+1, codeText.length);
            parseCodeText();
	 }
      }
      return;
   }

   let ex = eventTransformX(e.x);
   let ey = eventTransformY(e.y);

   // IF USER WAS TYPING TEXT, INCORPORATE IT INTO A DRAWING PATH

   if (text != null) {
      nActive = shapes.length;
      shapes.push({
         timeBegin: timeNow,
         timeEnd  : timeEnd,
         draw     : [{ x:x, y:y, type:'text', text:text }],
         move     : [],
      });
      text = null;
      return;
   }

   // REMEMBER THE CURRENT CURSOR POSITION

   x = ex;
   y = ey;

   // IF MOUSE IS UP AND IN TIMELINE, SET CURRENT TIME

   if (isTimelineInteractive && ! isDown && y < ty + th)
      timeNow = xToTime(x);

   if (isInTimeline) {
      timeNow = xToTime(x);
      if (isDown) {
         isPlaying = false;

         // SLIDE THE RANGE OF THE TIMELINE

         if (isShift) {
            let dx = ex - e_x;
            e_x = ex;
            let dt = dx * (timeEnd - timeBegin) / width;
            timeBegin -= dt;
            timeEnd -= dt;
            if (timeBegin < 0) {
               timeEnd += 0 - timeBegin;
               timeBegin = 0;
            }
            if (timeEnd > 60) {
               timeBegin += 60 - timeEnd;
               timeEnd = 60;
            }
         }

         // SHIFT A SEGMENT OF A MOTION PATH IN TIME

         else if (nActive >= 0) {
            let time = timeNow;
            let P = shapes[nActive].move;
            let i, i0, i1;
            for (i = 1 ; i < P.length ; i++)
               if (P[i].type == 'draw' && P[i-1].time <= time && P[i].time > time)
                  break;
            for (i0 = i ; P[i0].type == 'draw' ; i0--)
               ;
            for (i1 = i ; i1 < P.length-1 && P[i1+1].type == 'draw' ; i1++)
               ;
            let dt = xToTime(ex) - xToTime(e_x);
            for (let i = i0 ; i <= i1 ; i++)
               P[i].time += dt;
            e_x = ex;
         }
      }
      return;
   }

   // WHILE SHIFT KEY IS DOWN, MOVE TO REPOSITION A SHAPE

   if (isShift) {
      if (nActive >= 0) {
         let dx = ex - e_x;
         let dy = ey - e_y;
         e_x = ex;
         e_y = ey;
         let d = shapes[nActive].draw;
         for (let i = 0 ; i < d.length ; i++) {
            d[i].x += dx;
            d[i].y += dy;
         }
         let m = shapes[nActive].move;
         for (let i = 0 ; i < m.length ; i++) {
            m[i].x += dx;
            m[i].y += dy;
         }
      }
   }

   else if (isDown) {

      // APPEND TO THE DRAWING PATH

      if (isDrawingMode) {
         shapes[nActive].draw.push({ x:x, y:y, type:'draw' });
      }

      // APPEND TO THE MOTION PATH

      else if (nActive >= 0) {
         let time = motionStartTime + Date.now() / 1000 - clockStartTime;
         timeNow = time;
         shapes[nActive].move.push({ x:x, y:y, type:'draw', time:time });
      }
   }
   else {

      // IF MOUSE IS UP, MAKE THE PATH AT THE CURSOR (IF ANY) THE ACTIVE PATH

      let p = { x: ex, y: ey };
      for (let n = 0 ; n < shapes.length ; n++)
         if (isPointOnPath(p, n))
            nActive = n;
   }
};

this.mouseup = e => {

   isDown = false;

   // FINISHED CLICKING ON CODETEXT

   if (isInCodeText) {
      isInCodeText = false;
      return;
   }

   // FINISHED ACTION IN TIMELINE

   if (isInTimeline) {
      isInTimeline = false;
      return;
   }

   let ex = eventTransformX(e.x);
   let ey = eventTransformY(e.y);

   if (isDrawingMode) {

      // WHEN IN DRAWING MODE, A CLICK SWITCHES TO MOTION MODE

      let n1 = shapes.length - 1;
      if (shapes[n1].draw.length < 10) {
         shapes.pop();
         isDrawingMode = false;
         nActive = -1;
         backupIndex--;
      }

      // IF THE JUST-DRAWN STROKE INTERSECTS ANOTHER PATH, MERGE THIS STROKE INTO THAT PATH

      else {
         for (let n = 0 ; n < n1 ; n++)
            if (isPathIntersection(n, n1)) {
               let d = timeOffset(shapes[n]);
               let P = shapes[n1].draw;
               for (let i = 0 ; i < P.length ; i++)
                  shapes[n].draw.push({ x: P[i].x - d.x, y: P[i].y - d.y, type: P[i].type });
               shapes.pop();
               nActive = n;
               break;
            }
      }
   }
   else {

      // WHEN IN MOTION MODE, A CLICK SWITCHES TO DRAWING MODE

      if (nActive >= 0) {
         let p = shapes[nActive].move;
         for (let i = p.length-1 ; i > 0 ; i--)
            if (p[i].type != 'draw')
               if (p.length - i < 10) {
                  p = p.slice(0, i);
                  isDrawingMode = true;
                  nActive = -1;
                  backupIndex--;
                  break;
               }
      }
      else
         isDrawingMode = true;
   }
};

// COMPUTE BOUNDS AROUND TEXT

let textBounds = (text, x, y) => {
   context.font = fontHeight + 'px serif';
   let lines = text.split('\n');
   let xlo = 1000, xhi = -1000, ylo = 1000, yhi = -1000;
   for (let i = 0 ; i < lines.length ; i++) {
      let w = context.measureText(lines[i]).width;
      let yy = y + fontHeight * (i+(1-lines.length)/2);
      xlo = Math.min(xlo, x-w/2);
      xhi = Math.max(xhi, x+w/2);
      ylo = Math.min(ylo, yy-fontHeight*1/3);
      yhi = Math.max(yhi, yy+fontHeight*5/9);
   }
   return { xlo:xlo, xhi:xhi, ylo:ylo, yhi:yhi };
}

// DISPLAY TEXT

let drawText = (text, x, y) => {
   context.fillStyle = colors[colorIndex];
   let lines = text.split('\n');
   for (let i = 0 ; i < lines.length ; i++) {
      let w = context.measureText(lines[i]).width;
      let yy = y + fontHeight * (i+(1-lines.length)/2);
      context.fillText(lines[i], x-w/2, yy + fontHeight/3);
   }
}

// DISPLAY EVERYTHING AT EACH ANIMATION FRAME

let sCurve = t => t * t * (3 - t - t);

let codeTextRegion = [];

const timeStepMS = 1000/30;
let timeAccumulator = 0;
let timePrev = 0;
this.needsDisplayUpdate = true;
let display = (t) => {
   requestAnimationFrame(display);

   const dt = Math.min(60, t - timePrev);
   timePrev = t;
   timeAccumulator += dt;
   if (timeAccumulator >= timeStepMS) {
      this.needsDisplayUpdate = true;
      do {
         timeAccumulator -= timeStepMS;
      } while (timeAccumulator > timeStepMS);
   } else {
      this.needsDisplayUpdate = false;
      return;
   }

   slant = Math.max(0, Math.min(1, slant + (isSlanted ? .03 : -.03)));
   clay.setAnidrawSlant(sCurve(slant));

   // IF IS PLAYING, ADVANCE TIME BY ONE SECOND EACH SECOND

   if (isPlaying) {
      if (time === undefined)
         time = Date.now() / 1000;
      let deltaTime = Date.now() / 1000 - time;
      timeNow += deltaTime;
      time += deltaTime;
      if (timeNow >= playEndTime)
         isPlaying = false;
   }

   // CLEAR THE CANVAS

   context.putImageData(clearImage, 0, 0);

   // EXECUTE ANY EXTERNAL DRAW FUNCTIONS

   context.width = canvas.width;
   context.height = canvas.height;
   if (drawFunction)
      drawFunction(context);

   // DRAW ANY CODETEXT

   if (isCodeText) {
      let s = codeText.split('\n');
      context.font = '30px monospace';
      let offset = 0;
      codeTextRegion = [];
      for (let n = 0 ; n < s.length ; n++) {
         let y = 100 + 30 * n;
         context.fillStyle = '#ffffff40';
         let R = { x:20, y:y-22, w:s[n].length * 18, h:30 };
         codeTextRegion.push(R);
         context.fillRect(R.x, R.y, R.w, R.h);
         context.fillStyle = 'black';
         context.fillText(s[n], R.x, y);
         if (codeTextIndex >= offset-1 && codeTextIndex < offset + s[n].length) {
            codeTextIndexWithinLine = codeTextIndex - offset;
            let x = R.x + (codeTextIndex-offset+1) * 18;
            context.fillStyle = 'blue';
            context.fillRect(x - 7, R.y -  1, 15,  2);
            context.fillRect(x - 1, R.y     ,  2, 30);
            context.fillRect(x - 7, R.y + 30, 15,  2);
            context.fillStyle = 'black';
         }
         offset += s[n].length + 1;
      }
      return;
   }

   // DRAW ALL PATHS

   let drawPath = (path, offset) => {
      let textObects = [];
      context.beginPath();
      for (let i = 0 ; i < path.length ; i++) {
         let p = path[i];
         if (p.type == 'text')
            textObects.push({x:offset.x+p.x, y:offset.y+p.y, text:p.text});
         else if (path[i].type == 'move')
            context.moveTo(offset.x+p.x, offset.y+p.y);
         else
            context.lineTo(offset.x+p.x, offset.y+p.y);
      }
      context.stroke();
      for (let i = 0 ; i < textObects.length ; i++) {
         let p = textObects[i];
         drawText(p.text, p.x, p.y);
      }
   }

   // (1) DRAW THE MOTION PATHS FOR THE ACTIVE DRAWING PATH

   if (! isDrawingMode && isShowTimeline && nActive >= 0) {
      context.strokeStyle = colors[colorIndex];
      context.lineWidth = "" + (fontHeight/40);
      context.setLineDash([10, 10]);
      drawPath(shapes[nActive].move, {x:0,y:0});
      context.setLineDash([]);
   }

   // (2) DRAW ALL DRAWING PATHS

   context.strokeStyle = colors[colorIndex];
   for (let n = 0 ; n < shapes.length ; n++) {
      context.lineWidth = n == nActive ? '' + fontHeight*6/40 : '' + fontHeight*3/40;
      context.font = (n == nActive ? 'bold ' : '') + fontHeight + 'px serif';
      if (shapes[n].timeBegin <= timeNow && shapes[n].timeEnd > timeNow)
         drawPath(shapes[n].draw, timeOffset(shapes[n]));
   }

   // IF THE USER IS CURRENTLY TYPING TEXT, DISPLAY IT.

   if (text) {
      context.strokeStyle = colors[colorIndex];
      context.font = 'bold ' + fontHeight + 'px serif';
      drawText(text, x, y);
   }

   // DRAW THE TIMELINE

   if (! isShowTimeline)
      return;

   // (1) DRAW THE TIMELINE, SHOWING CURRENT TIME

   let xNow = timeToX(timeNow);
   context.fillStyle = isDrawingMode ? '#c0c0c080' : '#c0c0c0';
   context.fillRect(0,ty, xNow,fontHeight/2);
   context.fillStyle = isDrawingMode ? '#e0e0e080' : '#e0e0e0';
   context.fillRect(xNow,ty, width-xNow,fontHeight/2);

   // (2) DRAW A TICK MARK FOR EACH SECOND OF TIME

   context.fillStyle = isDrawingMode ? '#20202080' : '#202020';
   context.font = (fontHeight * 15 / 40) + 'px san-serif';
   for (let time = 0 ; time <= 60 ; time++) {
      let w = time == 0 ? 2 : 1;
      let h = time % 5 == 0 ? fontHeight/4 : fontHeight/8;
      let x = timeToX(time)+1-w,
          y = ty+fontHeight/4-h;
      context.fillRect(x,y,w,2*h);
      if (time % 5 == 0)
         context.fillText(time, x+3, y+fontHeight*15/40);
   }

   // (3) SHOW TOTAL TIME EXTENT OF THE ACTIVE SHAPE

   if (nActive >= 0) {
      context.fillStyle = isDrawingMode ? '#00000080' : '#000000';
      let s = shapes[nActive];
      let xlo = timeToX(s.timeBegin);
      let xhi = timeToX(s.timeEnd);
      context.fillRect(xlo, ty, xhi-xlo, fontHeight*3/40);
   }

   // (4) DRAW THE TIME SIGNATURES OF ALL MOTION STROKES

   context.fillStyle = 'black';
   for (let n = 0 ; n < shapes.length ; n++) {
      let P = shapes[n].move;
      let h = n == nActive ? 4 : 2;
      let i0 = 0;
      for (let i1 = 1 ; i1 < P.length ; i1++)
         if (i1+1 == P.length || P[i1+1].type != 'draw') {
            let x0 = timeToX(P[i0].time);
            let x1 = timeToX(P[i1].time) - 1;
            context.fillRect(x0>>0, ty+fontHeight/4-h, x1-x0>>0, 2*h);
            i0 = i1+1;
            i1 = i0+1;
         }
   }
}

requestAnimationFrame(display)
}

