import * as aiobject from "/js/util/aiobject.js";

export const init = async model => {
    let obj1 = aiobject.addObject(model);
    obj1.move(0,0,-5);
    let obj2 = aiobject.addObject(model);
    obj2.move(0,2,-5);

    model.animate(() => {
        
    });
}