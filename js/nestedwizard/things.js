
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

   defineThing('duck:animal', args => {
      return new Shape([
         BALL().move(-.2,1.25,1.15).scale(.05,.05,.05).color(0,0,0),
         BALL().move( .2,1.25,1.15).scale(.05,.05,.05).color(0,0,0),
         BALL().move(0,.5,0).scale(.5,.5,.75).color(1,1,0),
         BALL().move(0,1,.75).scale(.5,.5,.5).color(1,1,0),
         BALL().move(0,.95,1.15).scale(.35,.05,.3).color(1,.5,0),
      ]);
   });

   defineThing('gal:person', args => {
      return new Shape([
         CUBE().move(-.14 * 1.7, .60 * 1.7,  0).scale(.10 * 1.7, .60 * 1.7, .10 * 2.5).color(0, 0, 0),
         CUBE().move( .14 * 1.7, .60 * 1.7,  0).scale(.10 * 1.7, .60 * 1.7, .10 * 2.5).color(0, 0, 0),
         CUBE().move(   0 * 1.7, 1.35 * 1.7,  0).scale(.24 * 1.7, .15 * 1.7, .10 * 2.5).color(0, 0, 0),
   
         CUBE().move(   0 * 1.7, 1.85 * 1.7,  0).scale(.18 * 1.7, .35 * 1.7, .10 * 2.5),
         CUBE().move(-.32 * 1.7, 1.71 * 1.7,  0).scale(.06 * 1.7, .43 * 1.7, .06 * 2.5),
         CUBE().move( .32 * 1.7, 1.71 * 1.7,  0).scale(.06 * 1.7, .43 * 1.7, .06 * 2.5),
   
         CUBE().move(   0 * 1.7, 2.52 * 1.7,  0).scale(.19 * 1.7, .22 * 1.7, .10 * 2.5).color(.2, .1, .1),
         CUBE().move(   0 * 1.7, 2.48 * 1.7, .01 * 2.5).scale(.14 * 1.7, .19 * 1.7, .10 * 2.5).color( 1, .5, .5),
      ]);
   });
   
   defineThing('guy:person', args => {
      return new Shape([
         CUBE().move(-.16 * 1.7, .60 * 1.7,  0).scale(.12 * 1.7, .60 * 1.7, .10 * 2.5).color(0, 0, 0),
         CUBE().move( .16 * 1.7, .60 * 1.7,  0).scale(.12 * 1.7, .60 * 1.7, .10 * 2.5).color(0, 0, 0),
         CUBE().move(   0 * 1.7, 1.30 * 1.7,  0).scale(.30 * 1.7, .10 * 1.7, .10 * 2.5).color(0, 0, 0),
      
         CUBE().move(-.38 * 1.7, 1.82 * 1.7,  0).scale(.09 * 1.7, .47 * 1.7, .09 * 2.5),
         CUBE().move( .38 * 1.7, 1.82 * 1.7,  0).scale(.09 * 1.7, .47 * 1.7, .09 * 2.5),
         CUBE().move(   0 * 1.7, 1.87 * 1.7,  0).scale(.24 * 1.7, .47 * 1.7, .10 * 2.5),
      
         CUBE().move(   0 * 1.7, 2.77 * 1.7,  0).scale(.17 * 1.7, .11 * 1.7, .10 * 2.5).color(.2, .1, .1),
         CUBE().move(   0 * 1.7, 2.64 * 1.7, .01 * 2.5).scale(.16 * 1.7, .18 * 1.7, .10 * 2.5).color( 1, .5, .5),
      ]);
   });
   
   defineThing('round table:table,object', args => {
      let height = 1.3 * def3(args, 'height', 1.25);
      let length = 1.3 * def3(args, 'length', 0.8);
      let width  = 1.3 * def3(args, 'width' , 0.8);
      
      return new Shape([
         CONE().move(0, .273, 0).scale(.468, .273, .468),
         TUBE().move(0, height/2 - .104, 0).scale(.13, height/2 - .104, .13),
         CONE().move(0, height - .208 - .273 * .7, 0).scale(-.468 * .7, - .273 * .7, .468 * .7),
         TUBE().move(0, height - .104, 0).scale(width, .104, length),
      ]);
   });   

   defineThing('square table:table,object', args => {
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
}

