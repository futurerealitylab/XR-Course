import * as cg from "../render/core/cg.js";

window.quaternion = {x:0, y:0, z:0, w:1};

export const init = async model => {

   let s = 0.2;
   let y = 1.2;

   let cursor = model.add('sphere').color('yellow');
   let arc  = model.add();
   arc.add();
   arc.add('tubeX').color('yellow');
   arc.add('tubeX');
   let axis = model.add('tubeZ').color('yellow');
   let axes = model.add();
   let ball = model.add('sphere').move(0,y,0).scale(s).opacity(.5);
   let info = model.add().move(0,y+s+.05,0).scale(.2);

   let al = 1.3;
   axes.createAxes(al, .025);
   axes.child(0).child(0).color('red');
   axes.child(0).child(1).color('green');
   axes.child(0).child(2).color('blue');
   axes.child(0).child(3).color('red');
   axes.child(0).child(4).color('green');
   axes.child(0).child(5).color('blue');

   let m = cg.mIdentity();
   m[13] = y;

   let compute = p => {
      p[1] -= y;
      p = cg.scale(p, 1/s);
      if (cg.norm(p) > .9999)
         p = cg.scale(cg.normalize(p), .9999);
      quaternion.x = p[0];
      quaternion.y = p[1];
      quaternion.z = p[2];
      quaternion.w = Math.sqrt(1 - cg.dot(p,p));
      server.broadcastGlobal('quaternion');
   }


   inputEvents.onPress = hand => compute(inputEvents.pos(hand));
   inputEvents.onDrag  = hand => compute(inputEvents.pos(hand));

   let fixedWidth = t => {
      let s = '' + (100 * t + .5*Math.sign(t) >> 0) / 100;
      if (s.indexOf('.') == -1)
         s = s + '.';
      while (s.charAt(s.length-3) != '.')
           s = s + '0';
      if (s.substring(0,1) != '-')
         s = ' ' + s;
      return s;
   }

   model.animate(() => {
      quaternion = server.synchronize('quaternion');
      let p = [quaternion.x,quaternion.y,quaternion.z];
      m = cg.mFromQuaternion(quaternion);
      m[13] = y;

      arc.identity().move(0,y,0).aimZ(p).scale(s);
      while (arc.child(0).nChildren())
         arc.child(0).remove(0);
      let wire = arc.child(0).add(clay.wire(20, 6, 'q'));
      let angle = 2 * Math.acos(quaternion.w);
      clay.animateWire(wire, .003, t => [Math.cos(angle*t), Math.sin(angle*t), 0]);
      arc.child(1).identity().move(.5,0,0).scale(.5,.003,.003);
      arc.child(2).identity().turnZ(angle).move(.5,0,0).scale(.5,.003,.003);

      let sin = Math.sin(angle/2);
      axis.identity().move(0,y,0).aimZ(p).move(0,0,.5*s*sin).scale(.01*s,.01*s,.5*s*sin);
      axes.setMatrix(m).scale(s * .7);
      cursor.identity().move(0,y,0).scale(s).move(p).scale(.05);
      let text = 'x ' + fixedWidth(quaternion.x) + '\n'
               + 'y ' + fixedWidth(quaternion.y) + '\n'
               + 'z ' + fixedWidth(quaternion.z) + '\n'
               + 'w ' + fixedWidth(quaternion.w) + '\n'
               + 'θ ' + fixedWidth(angle) ;
      info.text(text, .05);
   });
}

