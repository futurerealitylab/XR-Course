import * as cg from "./cg.js";

export function Structure(name) {

   if (name === undefined)
      name = 'structure';
   let stateName = name + 'State';

   server.init(stateName, { offset: [0,.7,0], theta:0, sizeIndex: 0 });

   let stack = [];
   let data = [];

   let color       = [1,1,1];
   let flatShading = false;
   let lineCap     = null;
   let lineWidth   = .1;
   let nSides      = 6;
   let taper       = 0;
   let textHeight  = 1;

   this.color       = arg => { color       = arg; return this; }
   this.flatShading = arg => { flatShading = arg; return this; }
   this.lineCap     = arg => { lineCap     = arg; return this; }
   this.lineWidth   = arg => { lineWidth   = arg; return this; }
   this.nSides      = arg => { nSides      = arg; return this; }
   this.taper       = arg => { taper       = arg; return this; }
   this.textHeight  = arg => { textHeight  = arg; return this; }

   this.save = () => {
      stack.push({
         color:       color,
         flatShading: flatShading,
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
      lineCap     = top.lineCap    ;
      lineWidth   = top.lineWidth  ;
      nSides      = top.nSides     ;
      taper       = top.taper      ;
      textHeight  = top.textHeight ;
      return this;
   }

   let textData = {};

   this.setText = (textID, col, row, text) => {
      if (textData[textID]) {
         let id = textData[textID][row];
         clay.setDataMeshText(name, id, text, col);
      }
   }

   this.setTextColor = (textID, col, row, rgb) => {
      if (textData[textID]) {
         let id = textData[textID][row];
         clay.setDataMeshTextColor(name, id, col, rgb);
      }
   }

   this.text = (text, at, nCols, nRows) => {
      let textID = cg.uniqueID();
      textData[textID] = [];
      let item = (text, at, nCols) => {
         if (nCols !== undefined)
            for (let i = text.length ; i < nCols ; i++)
               text += ' ';
         let id = cg.uniqueID();
         data.push({
            type: 'text',
            text: text,
            at: at,
            height: textHeight,
            rgb: color,
            id: id,
         });
	 textData[textID].push(id);
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

   this.line = (a,b) => {
      data.push({
         type: 'rod',
         a:a,
         b:b,
         width:lineWidth,
         rgb: color,
         lineCap: lineCap,
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

   let leftHelp, rightHelp;

   this.build = (_model, defaults) => {
      model = _model;
      clay.defineDataMesh('structure', data, defaults);
      obj = model.add('structure').txtr(15);

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

   this.update = () => {

      let m = cg.mInverse(model.getMatrix());
      leftHelp .setMatrix(m).move(clientState.finger(clientID, 'left' , 1) ?? [0,0,0]);
      rightHelp.setMatrix(m).move(clientState.finger(clientID, 'right', 1) ?? [0,0,0]);

      structureState = server.synchronize(stateName);
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
                  structureState.offset = cg.add(structureState.offset, cg.subtract(p, p0));
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
                  structureState.offset = cg.add(structureState.offset, cg.scale(cg.subtract(p, p0), 0.1));
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
                  structureState.theta += p[0] - a0;
                  a0 = p[0];
               }
            }

         // IF CLICKING WITH LEFT SIDE TRIGGER, CHANGE SCALE

         if (P0.left[2] && ! P1.left[2])
            structureState.sizeIndex = (structureState.sizeIndex + 1) % size.length;

         // MAKE THE CURRENT PINCH STATE THE NEW PREVIOUS PINCH STATE

         P0 = P1;

         server.broadcastGlobal(stateName);
      }

      // RENDER THE OBJECT

      obj.identity().move(structureState.offset)
                    .turnY(structureState.theta)
                    .scale(size[structureState.sizeIndex]);
   }
}

