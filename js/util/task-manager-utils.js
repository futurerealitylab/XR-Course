import * as cg from "../render/core/cg.js";
import { lcb, rcb } from '../handle_scenes.js';
import { matchCurves } from "../render/core/matchCurves3D.js";
import { buttonState } from "../render/core/controllerInput.js";
import * as sr from "../util/sync_receiver_utils.js";

// const strokeWidth = 0.007;
const strokeWidth = 0.02;

//Check if the controller is inside the object 
export let inObject = (p, object) => {
    
    
    // FIRST TRANSFORM THE POINT BY THE INVERSE OF THE BOX'S MATRIX.
    let q = cg.mTransform(cg.mInverse(object.getMatrix()), p);
    
    //double check with the actual distance from ythe object 
    var obj_coo = object.getMatrix().slice(12,15);
   

    // THEN WE JUST NEED TO SEE IF THE RESULT IS INSIDE A UNIT CUBE.
    return q[0] >= -1 & q[0] <= 1 &&
           q[1] >= -1 & q[1] <= 1 &&
           q[2] >= -1 & q[2] <= 1 ;
 }

export function check_user_object_distance(mr, obj_pos, thr)
{
  
    var p_mr = mr.slice(12,15);
    
    //check if one of the user hand is respecting the minimum disatnce
    
    var dx = p_mr[0] - obj_pos[0];
    var dy = p_mr[1] - obj_pos[1];
    var dz = p_mr[2] - obj_pos[2]; 
    var distance_mr = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    console.log("distance_mr: " + distance_mr );
    if ( distance_mr < thr)
       return true 
    return false //otyherwise


}
//Check the distance of the user hand from the waypoints already placed
export function check_user_waypoint_distance(ml, mr, waypoint_list, is_a_list)
{
   
    console.log("is_a_list: " + is_a_list);
    let index = 0; 
    let flag_interaction = false;
    //iterate along all the possible hand position to get the closer one to the waypoint
    let w_list_length = waypoint_list.length;
    if (is_a_list){
        for (let n = 0 ; n < w_list_length ; n++){
            let isLeftInObj = false;
            let isRightInObj = false;
            isLeftInObj  = inObject(ml.slice(12,15), waypoint_list[n]);
            isRightInObj = inObject(mr.slice(12,15), waypoint_list[n]);
            //let distance = cg.space_distance(waypoint_list_pos[n], user_hand_pos);
             if (isLeftInObj ||  isRightInObj)
            {
            //Waypoint is clearly in manipulation from the user, who want to cheange its position 
            index = n;
            flag_interaction = true;
            console.log("return index: " + index);
            return [index, flag_interaction];
             }
        }
    }
    else
    {
        //Passing the sphere obj and visualizing the distance from the user hand 
        let isLeftInObj = false;
        let isRightInObj = false;
        
        isLeftInObj  = inObject(ml.slice(12,15), waypoint_list);
        isRightInObj = inObject(mr.slice(12,15), waypoint_list);
        
        //let distance = cg.space_distance(waypoint_list_pos[n], user_hand_pos);
        if (isLeftInObj ||  isRightInObj)
        {
            //Waypoint is clearly in manipulation from the user, who want to cheange its position 
            index = 0;
            flag_interaction = false;
            console.log("return index: " + index);
            return [index, flag_interaction];
        }
    
    }
 

    
    return [index, flag_interaction];
}


//Check if the user is interacting with theobject through the laser beam 
export let check_laser_beam_interaction = (w_pos_list, radius, is_a_list)  => {
    
    let hit = false;
    let point = [0.0, 0.0, 0.0];
    if (is_a_list){
        let w_list_length = w_pos_list.length;
        for (let n = 0 ; n < w_list_length ; n++){
            point = rcb.projectOntoBeam(w_pos_list[n]);
            let diff = cg.subtract(point, w_pos_list[n]);
            hit = cg.norm(diff) < (radius + 0.08);
            if (hit)
                return [n, hit, point];
        }
    }
    else
    {
        
        point = rcb.projectOntoBeam(w_pos_list);
        let diff = cg.subtract(point, w_pos_list);
        
        hit = cg.norm(diff) < (radius + 0.08);
        let n = 0;
        if (hit)
            return [n, hit, point];
    
    }
    
    return [0, false, point];
}
let resampleColors = (originalPositions, originalColors, resampledPositions) => {
    let resampledColors = [];
    for (let i = 0; i < resampledPositions.length; i++) {
        let pos = resampledPositions[i]; //Position resampled of the joystic 
        let t = findClosestT(originalPositions, pos);
        let color = sampleColor(originalColors, t);
        resampledColors.push(color);
    }
    return resampledColors;
}

let findClosestT = (positions, targetPos) => {
    let closestT = 0;
    let closestDist = Infinity;
    for (let i = 0; i < positions.length; i++) {

        let dist = cg.distVec3(positions[i], targetPos);
        //Find the closest distance between the sample posed of the curve and the pos recorded of the hand
        if (dist < closestDist) {
            closestDist = dist;
            closestT = i / (positions.length - 1);
        }
    }

    return closestT;
}

let sampleColor = (colors, t) => {
    let n = colors.length;
    if (n == 1)
        return colors[0];
    if (t > 1) {
        let i = n - 2;
        return cg.mixSimple(colors[i], colors[n-1], (t - i/(n-1)) / (1 - i/(n-1)));
    }
    t = Math.max(0, Math.min(0.999, t));
    let i = Math.floor((n-1) * t);
    let f = (n-1) * t - i;
    return cg.mixSimple(colors[i], colors[i+1], f);
}

export let buildWires = (strokes, curves,wires, colors)  => {
    //check if color is full or empty, to decide if to call animateWire or animateWireColor
    while (wires.nChildren() > 0)
        wires.remove(0);
    for (let n = 0; n < curves.length; n++)
        if (curves[n].length > 1) {
            if (colors.length < 1){
            let outer = wires.add(clay.wire(curves[n].length, 6, n));
            //let inner = wires.add(clay.wire(curves[n].length, 6, n + 10000));
            clay.animateWire(outer, .014, t => cg.sample(curves[n], t));
            //clay.animateWire(inner, .007, t => cg.sample(curves[n], t));
            }
            else {
                let resampledCurve = matchCurves.resample(strokes[n], 100);
   
                let resampledColors = resampleColors(strokes[n], colors[n], resampledCurve);
                let wire = wires.add(clay.wire(curves[n].length, 6, n));
                clay.animateWireColor(wire, strokeWidth, t => cg.sample(curves[n], t), resampledColors);
            }
        }
}

export let clearWires = (wires) =>{
   
    while (wires.nChildren() > 0)
        wires.remove(0);
   
}

export let get_Rot_from_T = (T) =>
{
    //Obtain a rotation matrix from T
    let first_col = T.slice(0,2);
    let second_col = T.slice(4,6);
    let third_col = T.slice(8,10);
    let matrix = new Array(3).fill(0).map(() => new Array(3).fill(0)); //first is the number of rows and second is the numbe rof coulmns
    matrix[0][0] = first_col[0];
    matrix[1][0] = first_col[1];
    matrix[2][0] = T[2];
    matrix[0][1] = second_col[0];
    matrix[1][1] = second_col[1];
    matrix[2][1] = T[6];
    matrix[0][2] = third_col[0];
    matrix[1][2] = third_col[1];
    matrix[2][2] =  T[10];

    return  matrix; 
    
}

export function rotationMatrixToQuaternion(matrix) {
    var qw, qx, qy, qz;
    var tr = matrix[0][0] + matrix[1][1] + matrix[2][2];
    if (tr > 0) {
        var S = Math.sqrt(tr + 1.0) * 2;
        qw = 0.25 * S;
        qx = (matrix[2][1] - matrix[1][2]) / S;
        qy = (matrix[0][2] - matrix[2][0]) / S;
        qz = (matrix[1][0] - matrix[0][1]) / S;
    } else if ((matrix[0][0] > matrix[1][1]) && (matrix[0][0] > matrix[2][2])) {
        var S = Math.sqrt(1.0 + matrix[0][0] - matrix[1][1] - matrix[2][2]) * 2;
        qw = (matrix[2][1] - matrix[1][2]) / S;
        qx = 0.25 * S;
        qy = (matrix[0][1] + matrix[1][0]) / S;
        qz = (matrix[0][2] + matrix[2][0]) / S;
    } else if (matrix[1][1] > matrix[2][2]) {
        var S = Math.sqrt(1.0 + matrix[1][1] - matrix[0][0] - matrix[2][2]) * 2;
        qw = (matrix[0][2] - matrix[2][0]) / S;
        qx = (matrix[0][1] + matrix[1][0]) / S;
        qy = 0.25 * S;
        qz = (matrix[1][2] + matrix[2][1]) / S;
    } else {
        var S = Math.sqrt(1.0 + matrix[2][2] - matrix[0][0] - matrix[1][1]) * 2;
        qw = (matrix[1][0] - matrix[0][1]) / S;
        qx = (matrix[0][2] + matrix[2][0]) / S;
        qy = (matrix[1][2] + matrix[2][1]) / S;
        qz = 0.25 * S;
    }
    return {w: qw, x: qx, y: qy, z: qz};
}




export let change_robot_color = (robot_pose, robot_cube) =>
{
    let vel_magn = Math.sqrt( robot_pose.velocity[0]* robot_pose.velocity[0] + robot_pose.velocity[1]* robot_pose.velocity[1] + robot_pose.velocity[2]* robot_pose.velocity[2]);
    //console.log("Vel Magnitude: " + vel_magn);
    if (vel_magn > 0.3){
        //Turn Yellow the cube 
        robot_cube.color(1, 0.64, 0);
    }
    else if(vel_magn > 0.5){
        //Turn Red 
        robot_cube.color(0.8, 0, 0);
    }
    else
    {
        //Keep it green 
        robot_cube.color(0, 1, 0);
    }
};



//This function set up the tie ad the actions (flags that have to be changed ) at the end of the timer itself 
export let task_timer_setup = (flags, timer, time) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
        flags[0] = false;
        flags[1] = false;
        // this.task_button_is_pressed = false;
        // this.task_sync_.switch_detected = false; //this to avoid that the task is detected and it is changed 
        console.log('Button pressed flag set to:', flags[0]);
    }, time);

}

//This is for the users that receives a waypoint elimination 
export let delete_single_waypoint_as_client = (waypoints, waypoint_object, waypoints_sync_) => {
      let index = waypoints_sync_.index; //Waypoint index to eliminate 
      waypoint_object.remove(index);
      waypoints.w_pos.splice(index, 1);
      waypoints.w_quat.splice(index,1);
      waypoints.waypoints_list.splice(index,1);
      waypoints.T_Wayp_list.splice(index,1);


}
//This is for the user that actively delete one waypoint
export let detect_waypoints_elimination = (waypoints, waypoint_object, waypoints_sync_) => {
    //Look if the user is pointing at one of the waypoint with his right controller
    let waypoints_in_list = waypoints.w_counter; 
    let active_user_deleting_w = false;
   
    for (let ii = 0; ii < waypoints_in_list; ii++)
    {
        //Consider the waypoints poistion 
        //Check if the user is hitting the object as well with the laser beam 
        let radius = 0.1;
        let is_a_list = false;
        let w_position = waypoints.w_pos[ii];
        let return_values_beam = check_laser_beam_interaction(w_position, radius, is_a_list);
        if (return_values_beam[1]){
            //Check if butto A is pressed 
            let b_A_pressed = buttonState.right[4].pressed;
            if (b_A_pressed)
            {
                waypoint_object.remove(ii);

                //Remove the waypoint from the list 
                waypoints.w_pos.splice(ii, 1);
                waypoints.w_quat.splice(ii,1);
                waypoints.waypoints_list.splice(ii,1);
                waypoints.T_Wayp_list.splice(ii,1);
                waypoints.w_counter = waypoints.w_counter - 1;
                waypoints_sync_.index = ii; 
                waypoints_sync_.w_counter = waypoints.w_counter;
                waypoints_sync_.w_counter_received = waypoints.w_counter;
                waypoints_sync_.manipulate = false;
                waypoints_sync_.generate = false;
                waypoints_sync_.delete = true; //if delete yes, the w_counter decrease of 1 element
               
                //Broadcast to everyone the new data related to waypoinst  
                sr.sync_waypoints(waypoints_sync_);

                active_user_deleting_w = true;
                break;

            }
        }
            //console.log("Waypoint ii: " + ii + "is intersecting the laser  beam");
        // this.user_waypoints.in_manipulation_beam = return_values_beam[1];
        // this.user_waypoints.beam_point = return_values_beam[2]; //get the point of intersection between the beam and the object 
    }
    return active_user_deleting_w;
}
 
