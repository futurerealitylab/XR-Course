export let update_task_receiver = (ts, task_sync) => {
    if (ts.task_button_is_pressed == false){
        for (let task in task_sync){
            //Enters only if the button flag is false for this client. 
            if (task == 'task_1_selected'){
                ts.task_sync_.task1_selected = task_sync[task];
                //Check if a switch is detected 
                if (ts.task_sync_.task1_selected_pr != task_sync[task]){
                    ts.task_sync_.task1_selected_pr = task_sync[task];
                    ts.task_sync_.switch_detected = true;
                }
                
            }
            else{
                ts.task_sync_.task2_selected = task_sync[task];
                if (ts.task_sync_.task2_selected_pr != task_sync[task]){
                    ts.task_sync_.task2_selected_pr = task_sync[task];
                    ts.task_sync_.switch_detected = true;
                }
                //console.log("task_2_selected: "+task_sync[task]);
            }
        }


    }
   
return;
}

// Upldate the ball position in task 2 if it is move by one of the client 
export let update_ball_sync_receiver = (ts, ball_pose_sync) => {
    for (let pose in ball_pose_sync){
        
        let diff_x =  ts.user_hand.p_prev[0] - ball_pose_sync[pose][0];
        let diff_y =  ts.user_hand.p_prev[1] - ball_pose_sync[pose][1];
        let diff_z =  ts.user_hand.p_prev[2] - ball_pose_sync[pose][2];
        let distance = Math.sqrt(diff_x*diff_x + diff_y*diff_y + diff_z*diff_z);
        
        if (distance > 0){
            ts.isDrawing_on_cloud = true;
        }
        ts.user_hand.p = ball_pose_sync[pose];
        ts.user_hand.p_prev = ts.user_hand.p;
    
    }
}

function isObject(obj) {
    return obj !== null && typeof obj === 'object';
}
// To sync all the waypoints between the clients 
export let update_waypoints_sync_receiver = (ts, waypoint_sync) => {
    for (let waypoint in waypoint_sync){

        if (waypoint == "counter")
        {

            //check if the counter is already updated for the client who actually generate a new waypoint 
            ts.waypoints_sync_.w_counter_received = waypoint_sync[waypoint]; //update teh counter 
        }
        if (waypoint == "index"){
            ts.waypoints_sync_.index =  waypoint_sync[waypoint];
        }

        if (waypoint == "generate"){
            ts.waypoints_sync_.generate = waypoint_sync[waypoint]; 
        }
        if (waypoint == "manipulate"){
            ts.waypoints_sync_.manipulate = waypoint_sync[waypoint]; 
        }
        if (waypoint == "delete"){
            ts.waypoints_sync_.delete = waypoint_sync[waypoint]; 
        }
        if (waypoint == "position"){
            ts.waypoints_sync_.position = waypoint_sync[waypoint]; 
        }
        if (waypoint == "transform_matrix"){
            if (isObject(waypoint_sync[waypoint])){
            ts.waypoints_sync_.transform_matrix = JSON.stringify(waypoint_sync[waypoint]);
            }
            else
            {
                ts.waypoints_sync_.transform_matrix = waypoint_sync[waypoint];
            }
        }
        
        
       

       //The main loop is goin to check if a new waypoints needs to be genrated 
    }
}

export let update_client_action = (ts, client_action_sync) => {
    
    for (let action in client_action_sync){
        
        if (action == "on_click"){
            
            ts.client_action_sync_.on_click = client_action_sync[action];
            if (client_action_sync[action] == true)
                console.log("[SYNC] ts.client_action_sync_.on_click: " + ts.client_action_sync_.on_click);
        }
        if (action == "on_release"){
            
            ts.client_action_sync_.on_release = client_action_sync[action];
            if (client_action_sync[action] == true)
                console.log("[SYNC] ts.client_action_sync_.on_release: " + ts.client_action_sync_.on_release);
        }
    }
}

//Function related to sync and boradcaster syncronization betwene multiple clients 
export let sync_task = (task_sync) =>
{
    let broadcaster = task_sync.task_broadcaster;
    let task0 = 'task_1_selected';
    let task1 = 'task_2_selected';
    broadcaster[task0] = task_sync.task1_selected;
    broadcaster[task1] = task_sync.task2_selected;
    console.log("[sync_task] task_sync.task1_selected: " + task_sync.task1_selected);
    console.log("[sync_task] task_sync.task2_selected: " + task_sync.task2_selected);
    server.broadcastGlobal('task_sync');
}

export let sync_ball = (ball_sync_ ) =>
{

    let broadcaster = ball_sync_.sync_broadcaster;
    let p = 'position';
    broadcaster[p] = ball_sync_.ball_position;
    server.broadcastGlobal('user_ball_sync');
}

export let sync_waypoints = (waypoints_sync_ ) => {
    let broadcaster = waypoints_sync_.sync_broadcaster;
    let counter = 'counter';
    broadcaster[counter] = waypoints_sync_.w_counter;
    let generate = 'generate';
    broadcaster[generate] = waypoints_sync_.generate;
    let delete_ = 'delete';
    broadcaster[delete_] = waypoints_sync_.delete;
    let position = 'position';
    broadcaster[position] = waypoints_sync_.position;
    let tr_matrix = 'transform_matrix';
    broadcaster[tr_matrix] = waypoints_sync_.transform_matrix;
    let manipulate = 'manipulate';
    broadcaster[manipulate] = waypoints_sync_.manipulate;
    let index = 'index';
    broadcaster[index] = waypoints_sync_.index;
    server.broadcastGlobal('waypoint_sync');
    
}




//Utils functions 
export let update_button_status = (button_status, client_action_sync_) => {
    let broadcaster = client_action_sync_.sync_broadcaster;
    let onclick = 'on_click';
    broadcaster[onclick] = button_status.on_click;
    let onrelease = 'on_release';
    broadcaster[onrelease] = button_status.on_release;
    for (let ii = 0; ii < 80; ii++)
        server.broadcastGlobal('client_action');
    console.log("[update_button_status] " + button_status.on_release);
    client_action_sync_.on_click = false;
    client_action_sync_.on_release = false;
    button_status.on_click = false; 
    button_status.on_release = false; 
    button_status.on_drag = false; 
    button_status.on_press = false; 
    //To put it false
    broadcaster[onclick] = button_status.on_click;
    broadcaster[onrelease] = button_status.on_release;
    server.broadcastGlobal('client_action');
    
}