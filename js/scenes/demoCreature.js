import * as cg from "../render/core/cg.js";

export const init = async model => {
   clay.defineMesh('creature1', clay.createGrid(60, 60));
   let creature = model.add().opacity(.85);
   let body = creature.add('creature1').scale(2);
   let head = creature.add('sphere').move(0,.5,0).scale(.099).color(.5,.5,.5);
   let eyes = creature.add().opacity(1);
   eyes.add('sphere').move( .05,.583,0).turnZ(-.60).scale(.02,.005,.02).color(.5,0,0);
   eyes.add('sphere').move(-.05,.583,0).turnZ( .60).scale(.02,.005,.02).color(.5,0,0);
   let eyelids = creature.add().color(.3,.3,.3).opacity(1);
   eyelids.add('sphere').move( .05,.583,0).turnZ(-.60).scale(.02,.005,.02).scale(1.01);
   eyelids.add('sphere').move(-.05,.583,0).turnZ( .60).scale(.02,.005,.02).scale(1.01);
   let blinkTime = 0;
   model.animate(() => {
      let t = model.time;
      if (t > blinkTime)
         blinkTime = t + .4 + 2 * Math.random();
      eyelids.identity().scale(blinkTime - t > .2 ? .01 : 1);
      //creature.identity().move(0,1.6,0).turnY(Math.PI/4).turnX(Math.PI/2).scale(.5);
      creature.identity().move(0,1.6,0).scale(.5);
      body.setVertices((u,v) => {
	 let s = Math.sin(2 * Math.PI * u);
	 let c = Math.cos(2 * Math.PI * u);
	 let w = .1 * v * v * Math.sin(model.time);
	 let r = (.05 + .2*v*v) * (1 + v * (.5 * cg.noise(6*s-10,3*v,6*c+10) +
	                                    .1 * Math.sin(12*v+s-3*t)));
         let C = seed => (1-v) * .4 + v * (.5 + cg.noise(s,c,4*v-seed));
         return [r*c+w, .25-.5*v, r*s, C(100), C(200), C(300)];
      });
   });
}

