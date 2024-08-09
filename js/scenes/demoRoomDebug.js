import * as room_mng from "/js/util/room_manager.js";

export const init = async model => {
   let obj = model.add('sphere');

   model.animate(() => {
      if (room_mng.getRoomID() == 1)
         obj.color(1,0,0);
      else if (room_mng.getRoomID() == 2)
         obj.color(0,1,0);
      else
         obj.color(1,1,1);
   });
}

