import * as cg from "../render/core/cg.js";
import { controllerMatrix } from "../render/core/controllerInput.js";
import { InputEvents } from "../render/core/inputEvents.js";

const clamp = (num, min, max) => {
    return Math.max(min, Math.min(num, max));
}

export const init = async model =>{
    let balls = [[1, 1, 0], [2, 2, -2], [3, 3, -3]];
    model.add('sphere').color([1, 0, 0]).move(balls[0]).scale(0.1);
    model.add('sphere').color([1, 0, 0]).move(balls[1]).scale(0.1);
    model.add('sphere').color([1, 0, 0]).move(balls[2]).scale(0.1);
    let pos = {left: [0, 0, 0], right: [0, 0, 0]};

    let ball = -1;
    inputEvents.onRelease = hand => {

        if (hand === 'left')
        {
            ball = (ball + 1) % 3;
        }
    }

    let t = 0;

    model.animate(() => {
        pos['right'] = inputEvents.pos('right');

        for (let i = 0; i < balls.length; i++)
        {
            if (i != ball)
            {
                model.child(i).identity().move(balls[i]).scale(0.1).color([1, 0, 0]);
                continue;
            }

            if (clay.handsWidget.fist['right'])
            {
                t = clamp(t + 0.06, 0, 1);
            }
            else
            {
                t = clamp(t - 0.06, 0, 1);
            }
            console.log(t);
            let dest = [t * pos['right'][0] + (1 - t) * balls[i][0], 
                        t * pos['right'][1] + (1 - t) * balls[i][1],
                        t * pos['right'][2] + (1 - t) * balls[i][2]];
            model.child(i).identity().move(dest).scale(0.1).color([0, 1, 0]);
        }
    });
}
