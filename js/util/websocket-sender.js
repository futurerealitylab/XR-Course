
/*
This class manage to send a JSON message through websocket to a client who is listeing
*/
export class WS_Sender {
    constructor(ip, port, ws, send_type) {
        this.ip = ip;
        this.port = port;
        
        this.robot_odom = {ts: 0.0, frame_id: "world", name: "quadrotor", position: [0.0, 0.0, 0.0], orientation: [0.0, 0.0, 0.0, 0.0], velocity: [0.0, 0.0, 0.0]};
        this.robot_odom2_1 = {ts: 0.0, frame_id: "world", name: "voxl2_1", position: [0.0, 0.0, 0.0], orientation: [0.0, 0.0, 0.0, 0.0], velocity: [0.0, 0.0, 0.0]};
        this.robot_odom2_5 = {ts: 0.0, frame_id: "world", name: "voxl2_5", position: [0.0, 0.0, 0.0], orientation: [0.0, 0.0, 0.0, 0.0], velocity: [0.0, 0.0, 0.0]};
        this.robot_odom2_8 = {ts: 0.0, frame_id: "world", name: "voxl2_8", position: [0.0, 0.0, 0.0], orientation: [0.0, 0.0, 0.0, 0.0], velocity: [0.0, 0.0, 0.0]};
        this.robot_odom2_9 = {ts: 0.0, frame_id: "world", name: "voxl2_9", position: [0.0, 0.0, 0.0], orientation: [0.0, 0.0, 0.0, 0.0], velocity: [0.0, 0.0, 0.0]};
        
        this.desired_traj_pos = {ts: 0.0, frame_id: "world", des_pos: [], des_vel: [], des_acc: [], des_vel_magnitude: [], min_vel: 0.0, max_vel: 0.0};
        
        // for static occupancy
        this.static_occupancy = {ts: 0.0, frame_id: "world", points: []};
        // for final goal
        this.final_goal = {ts: 0.0, frame_id: "world", location: null};
        // for mpl path
        this.mpl_path = {ts: 0.0, frame_id: "world", path_points: []};
      
        // this.string = "ws://" + this.ip + ":" + this.port;
        // this.ws = new WebSocket(this.string);
        // try {
        //     this.ws.onopen = () => {
        //         console.log("websocket is connected ...");
        //     };
        // }
        // catch (err) {
        // console.error("Couldn't load websocket", err);
        // }


        //Immediately send the message to subscribe to robot odom 
        if (send_type == "odom"){
            let odom_message = {
                request: 'SUBSCRIBE',
                type: "webxr_robot_pos",
                channel: "robot_odom",
                ts: Date.now(),
                frame_id: "world",
            };
            this.subscribe_robot_odom(ws, odom_message);
        }
        if (send_type == "odom2_1"){
            let odom_message2_1 = {
                request: 'SUBSCRIBE',
                type: "webxr_robot_pos2_1",
                channel: "robot_odom2_1",
                ts: Date.now(),
                frame_id: "world",
            };
            this.subscribe_robot_odom2_1(ws, odom_message2_1);
        }
        if (send_type == "odom2_5"){
            let odom_message2_5 = {
                request: 'SUBSCRIBE',
                type: "webxr_robot_pos2_5",
                channel: "robot_odom2_5",
                ts: Date.now(),
                frame_id: "world",
            };
            this.subscribe_robot_odom2_5(ws, odom_message2_5);
        }
        if (send_type == "odom2_8"){
            let odom_message2_8 = {
                request: 'SUBSCRIBE',
                type: "webxr_robot_pos2_8",
                channel: "robot_odom2_8",
                ts: Date.now(),
                frame_id: "world",
            };
            this.subscribe_robot_odom2_8(ws, odom_message2_8);
        }
        if (send_type == "odom2_9"){
            let odom_message2_9 = {
                request: 'SUBSCRIBE',
                type: "webxr_robot_pos2_9",
                channel: "robot_odom2_9",
                ts: Date.now(),
                frame_id: "world",
            };
            this.subscribe_robot_odom2_9(ws, odom_message2_9);
        }

        // subscription for trajectories
        if (send_type == "traj"){
            let traj_message = {
                request: 'SUBSCRIBE',
                type: "webxr_traj",
                channel: "desired_traj",
                ts: Date.now(),
                frame_id: "world",
            };
            this.subscribe_robot_des_traj(ws, traj_message);
        }
        // Add subscription for static occupancy
        if (send_type == "occupancy"){
            let occupancy_message = {
                request: 'SUBSCRIBE',
                type: "webxr_static_occupancy",
                channel: "static_occupancy",
                ts: Date.now(),
                frame_id: "world",
            };
            this.subscribe_robot_static_occupancy(ws, occupancy_message);
        }

        // Add subscription for the final goal
        
        if (send_type == "goal"){

            let goal_message = {
                request: 'SUBSCRIBE',
                type: "webxr_final_goal",
                channel: "final_goal",
                ts: Date.now(),
                frame_id: "world",
            };
            this.subscribe_robot_final_goal(ws, goal_message);
        }

        // Add subscription for the mpl path
        if (send_type == "mplpath"){
            let mplpath_message = {
                request: 'SUBSCRIBE',
                type: "webxr_mpl_path",
                channel: "mpl_path",
                ts: Date.now(),
                frame_id: "world",
            };
            this.subscribe_robot_mpl_path(ws, mplpath_message);
        }


        console.log("[WS_Sender] the class have been initialized successfully" );
        
    }
    
    //better if data is a struct containing all the information that we desired to send to ROS client
    send(ws, message) {
        this.string = "ws://" + this.ip + ":" + this.port;
        var ws_ = new WebSocket(this.string);
        
        //Wait for the connection to be open before sending a message 
        ws_.onopen = () => {
            ws_.send(JSON.stringify(message));
            ws_.close();
            //console.log("Publishing: " + message);
        };
    
    }

    async subscribe_robot_odom(ws, message)
    {
        // this.string = "ws://" + this.ip + ":" + this.port;
        // var ws_ = new WebSocket(this.string);

       //Send the subscriber request to the Middleware
       //if (this.counter_sub_odom < 3){
        ws.onopen = () => {
        ws.send(JSON.stringify(message));
        console.log("Subscribe robot odom Message sent")
       
        //}
    };
    
    ws.onmessage = (event) => {
        try {
            let data = JSON.parse(event.data);
            message.innerHTML = data;
            this.robot_odom.position = data.position_msg;
            this.robot_odom.orientation = data.orientation_msg;
            this.robot_odom.linear_vel = data.velocity_msg;
            this.robot_odom.ts = data.ts;
            this.robot_odom.frame_id = data.frame_id;
            this.robot_odom.name = data.name;
            //console.log("Receiving ROBOT ODOM")
           

        } catch (err) {
            // console.log("bad json:", json);
            console.error(err);
        }
    };
    
   
    }


    async subscribe_robot_odom2_1(ws, message)
    {
        // this.string = "ws://" + this.ip + ":" + this.port;
        // var ws_ = new WebSocket(this.string);

       //Send the subscriber request to the Middleware
       //if (this.counter_sub_odom < 3){
        ws.onopen = () => {
        ws.send(JSON.stringify(message));
        console.log("Subscribe robot odom2_1 Message sent")
       
        //}
    };
    
    ws.onmessage = (event) => {
        try {
            let data = JSON.parse(event.data);
            message.innerHTML = data;
            this.robot_odom2_1.position = data.position_msg;
            this.robot_odom2_1.orientation = data.orientation_msg;
            this.robot_odom2_1.linear_vel = data.velocity_msg;
            this.robot_odom2_1.ts = data.ts;
            this.robot_odom2_1.frame_id = data.frame_id;
            this.robot_odom2_1.name = data.name;
            //console.log("Receiving ROBOT ODOM")
           

        } catch (err) {
            // console.log("bad json:", json);
            console.error(err);
        }
    };
    
   
    }

    async subscribe_robot_odom2_5(ws, message)
    {
        // this.string = "ws://" + this.ip + ":" + this.port;
        // var ws_ = new WebSocket(this.string);

       //Send the subscriber request to the Middleware
       //if (this.counter_sub_odom < 3){
        ws.onopen = () => {
        ws.send(JSON.stringify(message));
        console.log("Subscribe robot odom2_5 Message sent")
       
        //}
    };
    
    ws.onmessage = (event) => {
        try {
            let data = JSON.parse(event.data);
            message.innerHTML = data;
            this.robot_odom2_5.position = data.position_msg;
            this.robot_odom2_5.orientation = data.orientation_msg;
            this.robot_odom2_5.linear_vel = data.velocity_msg;
            this.robot_odom2_5.ts = data.ts;
            this.robot_odom2_5.frame_id = data.frame_id;
            this.robot_odom2_5.name = data.name;
            //console.log("Receiving ROBOT ODOM")
           

        } catch (err) {
            // console.log("bad json:", json);
            console.error(err);
        }
    };
    
   
    }

    async subscribe_robot_odom2_8(ws, message)
    {
        // this.string = "ws://" + this.ip + ":" + this.port;
        // var ws_ = new WebSocket(this.string);

       //Send the subscriber request to the Middleware
       //if (this.counter_sub_odom < 3){
        ws.onopen = () => {
        ws.send(JSON.stringify(message));
        console.log("Subscribe robot odom2_8 Message sent")
       
        //}
    };
    
    ws.onmessage = (event) => {
        try {
            let data = JSON.parse(event.data);
            message.innerHTML = data;
            this.robot_odom2_8.position = data.position_msg;
            this.robot_odom2_8.orientation = data.orientation_msg;
            this.robot_odom2_8.linear_vel = data.velocity_msg;
            this.robot_odom2_8.ts = data.ts;
            this.robot_odom2_8.frame_id = data.frame_id;
            this.robot_odom2_8.name = data.name;
            //console.log("Receiving ROBOT ODOM")
           

        } catch (err) {
            // console.log("bad json:", json);
            console.error(err);
        }
    };
    
   
    }


    async subscribe_robot_odom2_9(ws, message)
    {
        // this.string = "ws://" + this.ip + ":" + this.port;
        // var ws_ = new WebSocket(this.string);

       //Send the subscriber request to the Middleware
       //if (this.counter_sub_odom < 3){
        ws.onopen = () => {
        ws.send(JSON.stringify(message));
        console.log("Subscribe robot odom2_9 Message sent")
       
        //}
    };
    
    ws.onmessage = (event) => {
        try {
            let data = JSON.parse(event.data);
            message.innerHTML = data;
            this.robot_odom2_9.position = data.position_msg;
            this.robot_odom2_9.orientation = data.orientation_msg;
            this.robot_odom2_9.linear_vel = data.velocity_msg;
            this.robot_odom2_9.ts = data.ts;
            this.robot_odom2_9.frame_id = data.frame_id;
            this.robot_odom2_9.name = data.name;
            //console.log("Receiving ROBOT ODOM")
           

        } catch (err) {
            // console.log("bad json:", json);
            console.error(err);
        }
    };
    
   
    }

    async subscribe_robot_des_traj(ws, message)
    {
        // this.string = "ws://" + this.ip + ":" + this.port;
        // var ws_ = new WebSocket(this.string);

       //Send the subscriber request to the Middleware
       //if (this.counter_sub_odom < 3){
        ws.onopen = () => {
        ws.send(JSON.stringify(message));
        console.log("Subsribe robot traj Message sent")
        //}
    };
    // Temporarily comment out this onmessage event call for viewing static occupancy visibility
    
    ws.onmessage = (event) => {
        try {
            this.desired_traj_pos.des_pos = [];
            let data = JSON.parse(event.data);
            message.innerHTML = data;
            let des_positions_msg_ = JSON.parse(data.des_position_msg);
            let des_vel_msg_ = JSON.parse(data.des_velocity_msg);
           
            let des_position_list = [];
            let des_vel_list = [];
            let des_vel_list_magnitude = [];
            for (var i = 0; i < des_positions_msg_.length; i++){
                //Parse the positions 
                let pose = [des_positions_msg_[i][0], des_positions_msg_[i][1], des_positions_msg_[i][2]];
                des_position_list.push(pose);
                
                //parse the velocities 
                let vel = [];
                let vel_magn = 0.0;
                if (des_vel_msg_.length > 0){
                     let vel = [des_vel_msg_[i][0], des_vel_msg_[i][1], des_vel_msg_[i][2]];
                     vel_magn = Math.sqrt(des_vel_msg_[i][0]*des_vel_msg_[i][0] + des_vel_msg_[i][1]*des_vel_msg_[i][1] + des_vel_msg_[i][1]*des_vel_msg_[i][1]);
                }else
                {
                    let vel = [0.0, 0.0, 0.0];
                    vel_magn = 0.0;
                }
                //Compute the magnitude of the velocity
                
                des_vel_list.push(vel);
                des_vel_list_magnitude.push(vel_magn);
                
            }
            //Look for the lowest and the higher velocity in the traj 
            this.desired_traj_pos.min_vel = Math.min(...des_vel_list_magnitude);
            this.desired_traj_pos.max_vel = Math.max(...des_vel_list_magnitude);
            
            this.desired_traj_pos.des_pos = des_position_list;
            this.desired_traj_pos.des_vel = des_vel_list;
            this.desired_traj_pos.des_vel_magnitude = des_vel_list_magnitude;
            this.desired_traj_pos.ts = data.ts;
            this.desired_traj_pos.frame_id = data.frame_id;
            //console.log("Trajectory Received: " +  this.desired_traj_pos.des_pos.length)
         

        } catch (err) {
            // console.log("bad json:", json);
            console.error(err);
        }
          
    };
    
   
    }
    
    
    async subscribe_robot_static_occupancy(ws, message) {
        ws.onopen = () => {
            ws.send(JSON.stringify(message));
        };
        
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
        
        ws.onmessage = (event) => {
            try {
                if (!event.data || event.data === 'undefined') {
                    return;
                }

                let data = JSON.parse(event.data);
                let payload = null;
                
                // Handle wrapped format
                if (data.type === 'webxr_static_occupancy') {
                    payload = data.message;
                // Handle direct format
                } else if (data.points && Array.isArray(data.points)) {
                    payload = data;
                } else {
                    return;
                }
                
                // Process the point cloud data
                if (payload && payload.points && Array.isArray(payload.points)) {
                    let points_list = [];
                    for (let i = 0; i < payload.points.length; i++) {
                        let point = payload.points[i];
                        points_list.push([point[0], point[1], point[2]]);
                    }
                    
                    this.static_occupancy.points = points_list;
                    this.static_occupancy.ts = payload.ts;
                    this.static_occupancy.frame_id = payload.frame_id;
                }

            } catch (err) {
                // Silent error handling
            }
        };
    }

    
    async subscribe_robot_final_goal(ws, message) {
        ws.onopen = () => {
            ws.send(JSON.stringify(message));
            console.log("Subscribe robot final goal Message sent");
        };
        ws.onmessage = (event) => {

            try {
                let data = JSON.parse(event.data);

                message.innerHTML = data;

                this.final_goal.location = data.goal_location;
                this.final_goal.ts = data.ts;
                this.final_goal.frame_id = data.frame_id;

            } catch (err) {
                console.error("Error parsing final goal message:", err);
            }
        };
    }
    
    async subscribe_robot_mpl_path(ws, message) {
        ws.onopen = () => {
            ws.send(JSON.stringify(message));
            console.log("Subscribe robot MPL path Message sent");
        };
        ws.onmessage = (event) => {
            try{
                let data = JSON.parse(event.data);
                message.innerHTML = data;
                
                this.mpl_path.path_points = JSON.parse(data.des_position_msg);
                this.mpl_path.ts = data.ts;
                this.mpl_path.frame_id = data.frame_id;
                

                
            } catch (err) {
                // console.error("Error parsing mpl path message:", err);
                this.mpl_path.path_points = [];
            }
        }
    }
    

    

    //Function Connect 
    connect() {
        try {
            this.ws.onopen = () => {
                console.log("websocket is connected ...");
            };



            this.ws.onmessage = (ev) => {
                try {
                    let json = JSON.parse(ev.data);
                    window.EventBus.publish(json["type"], json);
                } catch (err) {
                    // console.log("bad json:", json);
                    console.error(err);
                }
            };

            this.ws.onclose = (event) => {
                switch (event.code) {
                    // CLOSE_NORMAL
                    case 1000:
                        console.log("WebSocket: closed");
                        break;
                    // Abnormal closure
                    default:
                        console.log("reconnecting...");
                        break;
                }
                console.log("disconnected");
                clearTimeout(this.pingTimeout);
            };

            this.ws.onerror = (e) => {
                switch (e.code) {
                    case "ECONNREFUSED":
                        console.error(e);
                        // reconnect(e);
                        this.ws.close();
                        break;
                    default:
                        // this.onerror(e);
                        break;
                }
            };


        } catch (err) {
            console.error("Couldn't load websocket", err);
            return false;
        }
    return true;
    }
}