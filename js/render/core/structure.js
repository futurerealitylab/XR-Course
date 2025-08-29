import * as cg from "./cg.js";
import { EditText } from "./editText.js";

export function Structure(name) {

   if (name === undefined)
      name = 'structure';
   let myState = name + 'State';
   let myMsgs  = name + 'Msgs';
   let myForm  = name + 'Form';

   server.init(myState, { offset: [0,0,0], theta:0, sizeIndex: 0 });
   server.init(myMsgs, { });

   let stack = [];
   let data = [];

   let color       = [1,1,1];
   let flatShading = false;
   let orient      = null;
   let lineCap     = null;
   let lineWidth   = .1;
   let nSides      = 6;
   let taper       = 0;
   let textHeight  = 1;

   this.color       = arg => { color       = arg; return this; }
   this.flatShading = arg => { flatShading = arg; return this; }
   this.orient      = arg => { orient      = arg; return this; }
   this.lineCap     = arg => { lineCap     = arg; return this; }
   this.lineWidth   = arg => { lineWidth   = arg; return this; }
   this.nSides      = arg => { nSides      = arg; return this; }
   this.taper       = arg => { taper       = arg; return this; }
   this.textHeight  = arg => { textHeight  = arg; return this; }

   this.save = () => {
      stack.push({
         color:       color,
         flatShading: flatShading,
         orient:      orient,
         lineCap:     lineCap,
         lineWidth:   lineWidth,
         nSides:      nSides,
         taper:       taper,
         textHeight:  textHeight,
      });
      return this;
   }

   this.restore = () => {
      let top = stack.pop();
      color       = top.color      ;
      flatShading = top.flatShading;
      orient      = top.orient     ;
      lineCap     = top.lineCap    ;
      lineWidth   = top.lineWidth  ;
      nSides      = top.nSides     ;
      taper       = top.taper      ;
      textHeight  = top.textHeight ;
      return this;
   }

   let textData = {};

   this.setText = (textID, col, row, text) => {
      if (textData[textID] && text != textData[textID][row].text) {
         textData[textID][row].text = text;
         let id = textData[textID][row].id;
         clay.setDataMeshText(myForm, id, text, col);
      }
   }

   this.setTextColor = (textID, col, row, rgb) => {
      if (textData[textID]) {
         let id = textData[textID][row].id;
         clay.setDataMeshTextColor(myForm, id, col, rgb);
      }
   }

   this.getTextColor = (textID, col, row) => {
      if (textData[textID]) {
         let id = textData[textID][row].id;
         return clay.getDataMeshTextColor(myForm, id, col);
      }
   }

   this.setTextOrient = (textID, orient) => {
      if (textData[textID])
         for (let row = 0 ; row < textData[textID].length ; row++) {
            let id = textData[textID][row].id;
            clay.setDataMeshTextOrient(myForm, id, orient);
         }
   }

   this.getTextOrient = (textID, orient) => {
      if (textData[textID])
         for (let row = 0 ; row < textData[textID].length ; row++) {
            let id = textData[textID][row].id;
            return clay.getDataMeshTextOrient(myForm, id);
         }
   }


   let textIDs = 0;

   this.text = (text, at, nCols, nRows) => {
      if (nCols === undefined) {
         let lines = text.split('\n');
         nRows = lines.length;
         nCols = 0;
         for (let n = 0 ; n < nRows ; n++)
            nCols = Math.max(nCols, lines[n].length);
      }
      let textID = 'TEXT_ID' + textIDs++;
      textData[textID] = [];
      textData[textID].text = text;
      textData[textID].nCols = nCols ?? text.length;
      textData[textID].nRows = nRows ?? 1;
      let item = (text, at, nCols) => {
         for (let i = text.length ; i < nCols ; i++)
            text += ' ';
         let id = cg.uniqueID();
         data.push({
            type: 'text',
            text: text,
            at: at,
            height: textHeight,
            rgb: color,
            orient: orient,
            id: id,
         });
         textData[textID].push({id:id, text:text});
      }
      if (nRows === undefined)
         item(text, at, nCols ?? text.length);
      else {
         let lines = text.split('\n');
         for (let row = 0 ; row < nRows ; row++)
            item(lines[row] ?? '', cg.add(at, [0,-row*textHeight,0]), nCols);
      }
      return textID;
   }

   this.curve = P => {
      let computeDir = n => {
         let a = cg.subtract(P[n  ], P[n-1]), aN = cg.dot(a,a);
         let b = cg.subtract(P[n+1], P[n  ]), bN = cg.dot(b,b);
	 return aN + bN == 0 ? null : aN == 0 ? b : bN == 0 ? a : cg.add(a, b);
      }
      for (let n = 0 ; n < P.length-1 ; n++)
         this.line(P[n], P[n+1], n==0          ? null : computeDir(n  ),
	                         n==P.length-2 ? null : computeDir(n+1));
   }

   this.line = (a,b, aDir, bDir) => {
      data.push({
         type: 'rod',
         a:a,
         b:b,
         width:lineWidth,
         rgb: color,
         aLineCap: aDir ? null : lineCap,
         bLineCap: bDir ? null : lineCap,
	 aDir: aDir,
	 bDir: bDir,
         flatShading: flatShading,
         taper: taper,
         nSides: nSides,
      });
      return this;
   }

   this.path = p => {
      for (let n = 0 ; n < p.length-1 ; n++)
         this.line(p[n], p[n+1]);
      return this;
   }

   this.poly = (p, e) => {
      for (let i = 0 ; i < e.length ; i++)
         this.line(p[e[i][0]], p[e[i][1]]);
      return this;
   }

   let boxEdges = [ [0,1],[2,3],[4,5],[6,7], [0,2],[1,3],[4,6],[5,7], [0,4],[1,5],[2,6],[3,7] ];
   let rectEdges = [ [0,1],[1,2],[2,3],[3,0] ];

   this.walls = (yLo, yHi, path) => {
      for (let n = 0 ; n < path.length - 1 ; n++) {
         let a = path[n], b = path[n+1];
         this.box([a[0],yLo,a[1]], [b[0],yHi,b[1]]);
      }
      return this;
   }

   this.box = (a, b) => {
      let ax = a[0], ay = a[1], az = a[2];
      let bx = b[0], by = b[1], bz = b[2];
      if (ax == bx || ay == by || az == bz)
         rect(a, b);
      else
         this.poly( [ [ax,ay,az], [bx,ay,az], [ax,by,az], [bx,by,az],
                      [ax,ay,bz], [bx,ay,bz], [ax,by,bz], [bx,by,bz] ], boxEdges);
      return this;
   }

   let rect = (a, b) => {
      let ax = a[0], ay = a[1], az = a[2];
      let bx = b[0], by = b[1], bz = b[2];
      if (ay == by && az == bz)
         this.line(a, [bx,ay,az]);
      else if (ax == bx && az == bz)
         this.line(a, [ax,by,az]);
      else if (ax == bx && ay == by)
         this.line(a, [ax,ay,bz]);
      else if (ax == bx)
         this.poly([ a, [ax,by,az], [ax,by,bz], [ax,ay,bz], a ], rectEdges);
      else if (ay == by)
         this.poly([ a, [bx,ay,az], [bx,ay,bz], [ax,ay,bz], a ], rectEdges);
      else
         this.poly([ a, [bx,ay,az], [bx,by,az], [ax,by,az], a ], rectEdges);
   }

   this.sizes = arg => size = arg;

   let model, obj;

   let size = [ 1 ];
   let p0 = [0,0,0], a0 = 0, P0 = {left:[], right:[]};

   let controllerHelpTextLeft = `
   Press trigger
  and drag to spin
 ------------------
 Click side trigger
  to toggle scale
`;
   let controllerHelpTextRight = `
   Press trigger    
  and drag to move  
 ------------------ 
  Use side trigger  
   to move slowly   
`;

   let object, leftHelp, rightHelp;

   this.build = (_model, defaults) => {
      model = _model;
      clay.defineDataMesh(myForm, data, defaults);
      object = model.add(myForm).txtr(15);

      this.textHeight(.01).color([1,1,1]);

      data = [];
      this.text(controllerHelpTextLeft, [0,.08,0], 20, 7);
      clay.defineDataMesh('leftHelp', data, defaults);

      data = [];
      this.text(controllerHelpTextRight, [0,.08,0], 20, 7);
      clay.defineDataMesh('rightHelp', data, defaults);

      leftHelp  = model.add('leftHelp' ).txtr(15).opacity(.8);
      rightHelp = model.add('rightHelp').txtr(15).opacity(.8);
   }

   let editTextID = null, editText;
   let unhighlight = (textID,col,row) => this.setTextColor(textID, col, row, [1,1,1])
   let highlight   = (textID,col,row) => this.setTextColor(textID, col, row, [0,.5,1])

   this.edit = (textID, callback) => {
      editTextID = textID;
      if (editTextID && ! editText) {
         editText = new EditText();
         editText.setText(textData[textID].text);
      }
      if (editText && callback)
         editText.setCallback(callback);
      highlight(textID, 0, 0);
   }

   this.isModifierKey = key => editText && editText.isModifier(key);

   this.getObject = () => object;

   let col = 0, row = 0;
   let setText = (textID, text) => {
      let nCols = textData[textID].nCols;
      let nRows = textData[textID].nRows;
      let lines = text.split('\n');
      for (let n = 0 ; n < nRows ; n++) {
         let line = n < lines.length ? lines[n] : '';
         while (line.length < nCols)
            line += ' ';
         this.setText(textID, 0, n, line.substring(0, nCols));
      }
      textData[textID].text = text;
   }

   this.getText = textID => textData[textID].text;

   this.update = () => {

      let m = cg.mInverse(model.getMatrix());
      leftHelp .setMatrix(m).move(clientState.finger(clientID, 'left' , 1) ?? [0,0,0]);
      rightHelp.setMatrix(m).move(clientState.finger(clientID, 'right', 1) ?? [0,0,0]);

      window[myState] = server.synchronize(myState);

      server.sync(myMsgs, msgs => {
         for (let id in msgs) {
	    let msg = msgs[id];
	    unhighlight(msg.textID, col, row);
            setText    (msg.textID, msg.text);
	    highlight  (msg.textID, col = msg.col, row = msg.row);
         }
       });

      if (isMasterClient()) {

         // DETERMINE CURRENT PINCH STATE FOR EACH FINGER OF EACH HAND

         let P1 = {left:[], right:[]};
         for (let hand in {left:0,right:0})
            for (let f = 0 ; f < 5 ; f++)
               P1[hand][f] = clientState.pinch(clientID, hand, f);

         // IF DRAGGING WITH RIGHT TRIGGER, MOVE THE OBJECT

         if (P1.right[1])
            if (! P0.right[1])
               p0 = clientState.finger(clientID, 'right', 1);
            else {
               let p = clientState.finger(clientID, 'right', 1);
               if (p && p0) {
                  window[myState].offset = cg.add(window[myState].offset, cg.subtract(p, p0));
                  p0 = p;
               }
            }

         // IF DRAGGING WITH RIGHT SIDE TRIGGER, MOVE THE OBJECT SLOWLY

         if (P1.right[2])
            if (! P0.right[2])
               p0 = clientState.finger(clientID, 'right', 2);
            else { 
               let p = clientState.finger(clientID, 'right', 2);
               if (p && p0) {
                  window[myState].offset = cg.add(window[myState].offset, cg.scale(cg.subtract(p, p0), 0.1));
                  p0 = p;
               }
            }         

         // IF DRAGGING WITH LEFT TRIGGER, ROTATE THE OBJECT
                      
         if (P1.left[1])
            if (! P0.left[1])
               a0 = clientState.finger(clientID, 'left', 1)[0];
            else {
               let p = clientState.finger(clientID, 'left', 1);
               if (p) {
                  window[myState].theta += p[0] - a0;
                  a0 = p[0];
               }
            }

         // IF CLICKING WITH LEFT SIDE TRIGGER, CHANGE SCALE

         if (P0.left[2] && ! P1.left[2])
            window[myState].sizeIndex = (window[myState].sizeIndex + 1) % size.length;

         // MAKE THE CURRENT PINCH STATE THE NEW PREVIOUS PINCH STATE

         P0 = P1;

         server.broadcastGlobal(myState);

         // EDIT TEXT

         if (editTextID) {
            let isChanged = false, event;
            for (let i = 0 ; i < clients.length ; i++)
               while (event = clientState.event(clients[i]))
                  if (event.type == 'keydown' || event.type == 'keyup') {
                     if (! isChanged)
                        unhighlight(editTextID, editText.getCol(), editText.getRow());
                     editText[event.type](event);
                     isChanged = true;
                  }
            if (isChanged) {
               highlight(editTextID, editText.getCol(), editText.getRow());
	       server.send(myMsgs, {
	          textID: editTextID,
		  text: editText.getText(),
		  col: editText.getCol(),
		  row: editText.getRow(),
	       });
            }
         }
      }

      // RENDER THE OBJECT

      object.identity().move(window[myState].offset)
                       .turnY(window[myState].theta)
                       .scale(size[window[myState].sizeIndex]);
   }
}

