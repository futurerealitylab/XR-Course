import * as cg from "../render/core/cg.js";
window.drag_objects2 = {                        // This is the state object.
   vera  : [-.2,1.5,0],
   chuck : [  0,1.5,0],
   dave  : [ .2,1.5,0]
};
export const init = async model => {
   let obj = {};
   for (let n in drag_objects2) {               // Build all renderables.
      obj[n] = model.add();
      switch (n) {
      case 'vera' : obj[n].add('sphere').scale(.07).color(1, 0, 0); break;
      case 'chuck': obj[n].add('sphere').scale(.07).color(0, 1, 0); break;
      case 'dave' : obj[n].add('sphere').scale(.07).color(0, 0, 1); break;
      }
   }
   model.animate(() => {                       // At each animation frame:
      for (let n in drag_objects2)             //    place all renderables.
         obj[n].identity().move(drag_objects2[n]);
   });
   let nFor = {};    // An object name can be specified for each controller.
   let cFor = {};    // A controller can be specified for each object name.
   model.update(input => {                     // In the wizard client:
      for (let id of clients)                  //   Loop over all clients
         for (let hand in {left:0, right:1}) { //     and their controllers.
            let c = id + hand;                            // controller index
            let controller = input[id].controller(hand);  // controller object
            let p = controller.matrix().slice(12,15);     // controller xyz
            if (controller.isPress(0))         // On any trigger press:
               for (let n in drag_objects2)
                  if (! cFor[n] && cg.distance(p, drag_objects2[n]) < .07) {
                     nFor[c] = n;              //   If a free object touches
                     cFor[n] = c;              //   the controller, grab it.
                  }
            if (controller.isDown(0))          // On any trigger drag:
               if (nFor[c])                    //   Drag any grabbed object.
                  drag_objects2[nFor[c]] = cg.roundVec(3, p);
            if (controller.isRelease(0)) {     // On any trigger release:
               delete cFor[nFor[c]];           //   Ungrab any grabbed object.
               delete nFor[c];
            }
         }
      server.synchronize('drag_objects2');
   });
}

