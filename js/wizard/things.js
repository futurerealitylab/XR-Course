
defineThings = () => {

   defineThing('armoire:object', args => {
      return new Shape([
         CUBE().move(   0,3.16,   0).scale(0.96,0.04,.32),
         CUBE().move(   0,1.6 ,-.36).scale(1   ,1.6 ,.04),
         CUBE().move(   0,1.6 , .36).scale(1   ,1.6 ,.04),
         CUBE().move(-.96,1.6 ,   0).scale(0.04,1.6 ,.32),
         CUBE().move( .96,1.6 ,   0).scale(0.04,1.6 ,.32),

	 CUBE().move(-.49,1.6 , .44).scale( .46,1.54,.04),
	 CUBE().move( .49,1.6 , .44).scale( .46,1.54,.04),

         CUBE().move(-.15,1.6,.48).scale(.04),
         CUBE().move( .15,1.6,.48).scale(.04),
      ]);
   });

   defineThing('bench:object', args => {
      return new Shape([
         CUBE().move(-1.05, .33,-.35).scale( .05,.33,.05),
         CUBE().move( 1.05, .33,-.35).scale( .05,.33,.05),
         CUBE().move(-1.05, .33, .35).scale( .05,.33,.05),
         CUBE().move( 1.05, .33, .35).scale( .05,.33,.05),
         CUBE().move(  .00, .72, .00).scale(1.10,.08,.40),
         CUBE().move(  .00,1.05,-.35).scale(1.10,.25,.05),
      ]);
   });

   defineThing('chair:object', args => {
      return new Shape([
         CUBE().move(-.35, .33,-.35).scale(.05,.33,.05),
         CUBE().move( .35, .33,-.35).scale(.05,.33,.05),
         CUBE().move(-.35, .33, .35).scale(.05,.33,.05),
         CUBE().move( .35, .33, .35).scale(.05,.33,.05),
         CUBE().move( .00, .72, .00).scale(.40,.08,.40),
         CUBE().move( .00,1.15,-.35).scale(.40,.35,.05),
      ]);
   });

   defineThing('chest:object', args => {
      return new Shape([
         CUBE().move(0,1.96,0).scale(.66,.04,.32),
         CUBE().move(0,1,-.36).scale(.7,1,.04),
         CUBE().move(0,1, .36).scale(.7,1,.04),
         CUBE().move(-.66,1,0).scale(.04,1,.32),
         CUBE().move( .66,1,0).scale(.04,1,.32),

         CUBE().move(0,0.2,.44).scale(.04),
         CUBE().move(0,0.6,.44).scale(.04),
         CUBE().move(0,1.0,.44).scale(.04),
         CUBE().move(0,1.4,.44).scale(.04),
         CUBE().move(0,1.8,.44).scale(.04),

         CUBE().move(0,0.2,.4).scale(.68,.18,.04),
         CUBE().move(0,0.6,.4).scale(.68,.18,.04),
         CUBE().move(0,1.0,.4).scale(.68,.18,.04),
         CUBE().move(0,1.4,.4).scale(.68,.18,.04),
         CUBE().move(0,1.8,.4).scale(.68,.18,.04),
      ]);
   });

   defineThing('coffee table:table,object', args => {
      return new Shape([
         CUBE().move(-.80, .36,-.40).scale(.05,.36,.05),
         CUBE().move( .80, .36,-.40).scale(.05,.36,.05),
         CUBE().move(-.80, .36, .40).scale(.05,.36,.05),
         CUBE().move( .80, .36, .40).scale(.05,.36,.05),
         CUBE().move( .00, .80, .00).scale(.85,.08,.45),
         CUBE().move( .00, .18, .00).scale(.85,.04,.45),
      ]);
   });

   defineThing('desk:object', args => {
      return new Shape([
         CUBE().move(-1.08, .55,-.38).scale( .07,.55,.07),
         CUBE().move(-1.08, .55, .38).scale( .07,.55,.07),
         CUBE().move( 0.00,1.18, .00).scale(1.15,.08,.45),

         CUBE().move(  .00, .55, .00).scale( .04,.55,.45),
         CUBE().move( 1.11, .55, .00).scale( .04,.55,.45),
         CUBE().move( 0.555,.55,-.41).scale( .52,.55,.04),
         CUBE().move( 0.555,.55, .41).scale( .52,.55,.04),
      ]);
   });

   defineThing('end table:table,object', args => {
      return new Shape([
         CUBE().move(-.40, .36,-.40).scale(.05,.36,.05),
         CUBE().move( .40, .36,-.40).scale(.05,.36,.05),
         CUBE().move(-.40, .36, .40).scale(.05,.36,.05),
         CUBE().move( .40, .36, .40).scale(.05,.36,.05),
         CUBE().move( .00, .80, .00).scale(.45,.08,.45),
      ]);
   });

   defineThing('gal:person', args => {
      return new Shape([
         CUBE().move(-.14, .60,  0).scale(.10,.60,.10).color(0,0,0),
         CUBE().move( .14, .60,  0).scale(.10,.60,.10).color(0,0,0),
         CUBE().move(   0,1.35,  0).scale(.24,.15,.10).color(0,0,0),

         CUBE().move(   0,1.85,  0).scale(.18,.35,.10),
         CUBE().move(-.32,1.71,  0).scale(.06,.43,.06),
         CUBE().move( .32,1.71,  0).scale(.06,.43,.06),

         CUBE().move(   0,2.52,  0).scale(.19,.22,.10).color(.2,.1,.1),
         CUBE().move(   0,2.48,.01).scale(.14,.19,.10).color( 1,.5,.5),
      ]);
   });

   defineThing('guy:person', args => {
      return new Shape([
         CUBE().move(-.16, .60,  0).scale(.12,.60,.10).color(0,0,0),
         CUBE().move( .16, .60,  0).scale(.12,.60,.10).color(0,0,0),
         CUBE().move(   0,1.30,  0).scale(.30,.10,.10).color(0,0,0),
      
         CUBE().move(-.38,1.82,  0).scale(.09,.47,.09),
         CUBE().move( .38,1.82,  0).scale(.09,.47,.09),
         CUBE().move(   0,1.87,  0).scale(.24,.47,.10),
   
         CUBE().move(   0,2.77,  0).scale(.17,.11,.10).color(.2,.1,.1),
         CUBE().move(   0,2.64,.01).scale(.16,.18,.10).color( 1,.5,.5),
      ]);
   });

   defineThing('duck:animal', args => {
      return new Shape([
         BALL().move(0,.5,0).scale(.5,.5,.75).color(1,1,0),
         BALL().move(0,1,.75).scale(.5,.5,.5).color(1,1,0),
         BALL().move(0,.95,1.15).scale(.45,.05,.6).color(1,.5,0),
         BALL().move(-.2,1.25,1.15).scale(.15,.15,.15).color(0,0,0),
         BALL().move( .2,1.25,1.15).scale(.15,.15,.15).color(0,0,0),
      ]);
   });

   defineThing('round table:table,object', args => {
      let height = def3(args, 'height', 1.25);
      let length = def3(args, 'length', 0.8);
      let width  = def3(args, 'width' , 0.8);
      
      return new Shape([
         CONE().move(0,.21,0).scale(.36,.21,.36),
         TUBE().move(0, height/2-.08, 0).scale(.10,height/2-.08,.10),
         CONE().move(0,height-.16-.21*.7,0).scale(-.36*.7,-.21*.7,.36*.7),
         TUBE().move(0,height-.08,0).scale(width,.08,length),
      ]);
   });   

   defineThing('table:table,object', args => {
      let height = def3(args, 'height', 1.25);
      let length = def3(args, 'length', 0.8);
      let width  = def3(args, 'width' , 0.8);

      return new Shape([
         PYRA().move(0,.245,0).scale(.42,.245,.42),
         CUBE().move(0, height/2-.08, 0).scale(.08,height/2-.08,.08),
         PYRA().move(0, height-.16-.245*.7,0).scale(-.42*.7,-.245*.7,.42*.7),
         CUBE().move(0,height-.08,0).scale(width,.08,length),
      ]);
   });

   defineThing('house:object', args => {
      return new Shape([
         CUBE().move( 0.0,1.0,0.0).scale(2.00,1.00,1.00),
         PYRA().move( 0.0,3.0,0.0).scale(3.00,1.00,2.00).color(.2,.2,.2),
         CUBE().move(-1.4,1.8,0.0).scale(0.30,1.80,0.30).color(.2,.2,.2),
         CUBE().move(-1.4,3.6,0.0).scale(0.20,0.01,0.20).color(.05,.05,.05),
         CUBE().move(-0.8,0.7,1.0).scale(0.50,0.70,0.01).color(.1,0,0),
         CUBE().move( 0.8,1.0,1.0).scale(0.40,0.50,0.01).color(0,0,0),
         CUBE().move( 0.8,1.0,1.0).scale(0.40,0.03,0.02),
         CUBE().move( 0.8,1.0,1.0).scale(0.03,0.50,0.02),
      ]);
   });

   defineThing('car:object', args => {
      return new Shape([
         CUBE().move( 0.00,0.80, 0.00).scale(0.40,0.25,0.40),
         CUBE().move( 0.00,0.40, 0.00).scale(1.00,0.25,0.40),
         BALL().move( 0.60,0.25, 0.40).scale(0.25,0.25,0.05).color(.1,.1,.1),
         BALL().move(-0.60,0.25, 0.40).scale(0.25,0.25,0.05).color(.1,.1,.1),
         BALL().move( 0.60,0.25,-0.40).scale(0.25,0.25,0.05).color(.1,.1,.1),
         BALL().move(-0.60,0.25,-0.40).scale(0.25,0.25,0.05).color(.1,.1,.1),
      ]);
   });

   defineThing('buckyball:molecule', args => { return new Shape([]); });
   defineThing('caffeine:molecule' , args => { return new Shape([]); });
   defineThing('ethanol:molecule'  , args => { return new Shape([]); });
   defineThing('morphine:molecule' , args => { return new Shape([]); });
   defineThing('quinine:molecule'  , args => { return new Shape([]); });
   defineThing('flower:gltf'       , args => { return new Shape([]); });
   defineThing('buddha:gltf'        , args => { return new Shape([]); });
}

