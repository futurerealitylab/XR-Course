   let def3 = (a,b,c) => a && a[b] ? a[b] : c;
   let isInt = i => ! isNaN(parseInt(i));
   let packMatrix = m => { // PACK A ROTATION+TRANSLATION MATRIX
      let I = t => 1000 * t >> 0, sqrt = Math.sqrt, sign = Math.sign, max = Math.max;
      let x = sqrt(max(0, 1 + m[0] - m[5] - m[10])) * sign(m[6] - m[9]) / 2,
          y = sqrt(max(0, 1 - m[0] + m[5] - m[10])) * sign(m[8] - m[2]) / 2,
          z = sqrt(max(0, 1 - m[0] - m[5] + m[10])) * sign(m[1] - m[4]) / 2;
      let Q = { x: x, y: y, z: z, w: Math.sqrt(1 - x*x - y*y - z*z) };
      return [ I(Q.x), I(Q.y), I(Q.z), I(Q.w), I(m[12]), I(m[13]), I(m[14]) ];
   }
   let unpackMatrix = P => { // UNPACK A ROTATION+TRANSLATION MATRIX
      let F = i => i / 1000, x = F(P[0]), y = F(P[1]), z = F(P[2]), w = F(P[3]);
      return [ 1 - 2 * (y * y + z * z),     2 * (z * w + x * y),     2 * (x * z - y * w), 0,
                   2 * (y * x - z * w), 1 - 2 * (z * z + x * x),     2 * (x * w + y * z), 0,
                   2 * (y * w + z * x),     2 * (z * y - x * w), 1 - 2 * (x * x + y * y), 0,
	           F(P[4])            ,     F(P[5])            ,     F(P[6])            , 1 ];
   }
   let sampleStroke = (stroke, t) => {
      let dist = (ax,ay,bx,by) => Math.sqrt((bx-ax)*(bx-ax) + (by-ay)*(by-ay));
      let fraction = [0];
      for (let n = 1 ; n < stroke.length/2-1 ; n++)
         fraction.push(fraction[n-1] + dist(stroke[2*n  ],stroke[2*n+1],
                                            stroke[2*n+2],stroke[2*n+3]));
      for (let n = 1 ; n < fraction.length ; n++)
         fraction[n] /= fraction[fraction.length-1];
      for (let n = 0 ; n < fraction.length-1 ; n++)
         if (t >= fraction[n] && t < fraction[n+1]) {
            let f = (t - fraction[n]) / (fraction[n+1] - fraction[n]);
            return { x: stroke[2*n  ] + f * (stroke[2*n+2] - stroke[2*n  ]),
                     y: stroke[2*n+1] + f * (stroke[2*n+3] - stroke[2*n+1]) };
         }
      return { x: stroke[stroke.length-2], y: stroke[stroke.length-1] };
   }
   let canvasWidth = 700;
   let thingsScale = 1/10;
   let tableHeight = 30.5 * .0254;
   let things = {};
   let groups = {};
   let defineThing = (name, proc) => {
      let i = name.indexOf(':');
      if (i > 0) {
         let groupNames = name.substring(i+1).split(',');
         name = name.substring(0,i);
	 for (let i in groupNames) {
	    let groupName = groupNames[i];
	    if (groups[groupName] === undefined)
	       groups[groupName] = {};
	    groups[groupName][name] = 1;
         }
      }
      things[name] = proc();
   }
   function Form(type) {
      this.type = type;
      this.m = [0,0,0];
      this.s = [1,1,1];
      this.c = null;
      this.move  = (x,y,z) => { this.m = [x,y,z]; return this; }
      this.scale = (x,y,z) => { if (y===undefined) y = z = x;
                                this.s = [x,y,z]; return this; }
      this.color = (r,g,b) => { this.c = [r,g,b]; return this; }
   }
   let BALL = () => new Form('sphere');
   let CONE = () => new Form('coneY');
   let CUBE = () => new Form('cube');
   let PYRA = () => new Form('pyramidY');
   let TUBE = () => new Form('tubeY');
   function Shape(items) { this.items = items; }
   defineThings();

