
import { WS_Sender } from "../util/websocket-sender.js";
import * as cg from "../render/core/cg.js";
import * as tm_utils from "../util/task-manager-utils.js";
import * as sr from "../util/sync_receiver_utils.js";
import { controllerMatrix, buttonState, joyStickState } from "../render/core/controllerInput.js";
import { g2 } from "../util/g2.js";
import { matchCurves } from "../render/core/matchCurves3D.js";
import * as ci from "../render/core/controllerInput.js";



/*This class manage the type of task available sin demo drone*/
export class Task_Manager {
    constructor(W, H, intial_task, host_, port_) {
        //Initialize the class rectangle 
        let localhost = host_; //"128.238.47.53"; //config.host;
        let ip = localhost; //"192.168.1.39";
        let port = port_; //"8080"; //config.port;


        var string = "ws://" + ip + ":" + port;
        //For each subscriber is required to have a new websocket connection. 
        //The websocket connection stays open for the entirety of the application
        this.ws = new WebSocket(string); //subscriber odom quadrotor or voxl2_0
        this.ws2_1 = new WebSocket(string); // subscriber odem of voxl2_1
        this.ws2_5 = new WebSocket(string); // subscriber odem of voxl2_5
        this.ws2_8 = new WebSocket(string); // subscriber odem of voxl2_8
        this.ws2_9 = new WebSocket(string); // subscriber odem of voxl2_9
        this.ws_ = new WebSocket(string); //subscriber Trajectpry
        // subscriber static occupancy
        this.ws_occupancy = new WebSocket(string);

        //subscriber final goal
        this.ws_goal = new WebSocket(string); 

        //subscriber mpl path
        this.ws_mplpath = new WebSocket(string);

        //Seletc the type of subscriber: 
        //Available type: odom -> robot odom 
        //Traj-> desired computed trajectory 

        this.ws_sender = new WS_Sender(ip, port, this.ws, "odom");
        this.ws_sender2_1 = new WS_Sender(ip, port, this.ws2_1, "odom2_1");
        this.ws_sender2_5 = new WS_Sender(ip, port, this.ws2_5, "odom2_5");
        this.ws_sender2_8 = new WS_Sender(ip, port, this.ws2_8, "odom2_8");
        this.ws_sender2_9 = new WS_Sender(ip, port, this.ws2_9, "odom2_9");

        this.ws_sender_traj = new WS_Sender(ip, port, this.ws_, "traj");
        // Add WebSocket for static occupancy
        this.ws_sender_occupancy = new WS_Sender(ip, port, this.ws_occupancy, "occupancy");
        
        // Add WebSocket for final goal
        this.ws_sender_goal = new WS_Sender(ip, port, this.ws_goal, "goal");

        // Add WebSocket for mpl path
        this.ws_sender_mplpath = new WS_Sender(ip, port, this.ws_mplpath, "mplpath");

        

        this.W = W;
        this.H = H;
        this.intial_task = intial_task;
        this.task = intial_task;
        this.array_init = false;
        this.waypoint_published = false;
        this.waypoint_manipulation = false;

        this.x = 1;
        this.y = 0;
        this.z = 0;

        this.r = 0.0;
        this.g = 1.0;
        this.b = 0.0;
        //Struct for robot pose 
        this.robot_pose = {
            frame_id: '',
            ts: 0.0,
            position: [0, W * .4, 0],
            velocity: [0, 0.0, 0.0],
            orientation_quat: [0.0, 0.0, 0.0, 1.0],
            orientation_eul: [0.0, 0.0, 0.0],
        }

        this.robot_pose2_1 = {
            frame_id: '',
            ts: 0.0,
            position: [0, W * .4, 0],
            velocity: [0, 0.0, 0.0],
            orientation_quat: [0.0, 0.0, 0.0, 1.0],
            orientation_eul: [0.0, 0.0, 0.0],
        }

        this.robot_pose2_5 = {
            frame_id: '',
            ts: 0.0,
            position: [0, W * .4, 0],
            velocity: [0, 0.0, 0.0],
            orientation_quat: [0.0, 0.0, 0.0, 1.0],
            orientation_eul: [0.0, 0.0, 0.0],
        }

        this.robot_pose2_8 = {
            frame_id: '',
            ts: 0.0,
            position: [0, W * .4, 0],
            velocity: [0, 0.0, 0.0],
            orientation_quat: [0.0, 0.0, 0.0, 1.0],
            orientation_eul: [0.0, 0.0, 0.0],
        }

        this.robot_pose2_9 = {
            frame_id: '',
            ts: 0.0,
            position: [0, W * .4, 0],
            velocity: [0, 0.0, 0.0],
            orientation_quat: [0.0, 0.0, 0.0, 1.0],
            orientation_eul: [0.0, 0.0, 0.0],
        }

        //Struct for user hand pose
        this.user_hand = {
            i: -1,                                    // INDEX OF SELECTED User Object
            p: [0, this.W * .4, 0],             // POSITION OF SELECTED user object, used only in task 1 of the dragging ball
            p_prev: [0, this.W * .4, 0], 
            thr: 0.2,                         //Threshold wehre the user can actually  manipulate the ball
            T_object: [], //store the T matrix of the object
            check_on_press: false,
            in_manipulation_beam: false,    //Define if the user hit the ball with the laser beam
        };

        this.user_waypoints = {
            w_pos: [],  //store the positions of the waypoints
            w_quat: [],
            waypoints_list: [], //stor ethe waypoint object
            T_Wayp_list: [],
            beam_point: [], //when the user manipulate object with the beam, this is the intersection point between the beam and the object
            last_w: -1,
            w_counter: 0,
            w_counter_old: 0,
            in_manipulation: false,
            in_manipulation_beam: false,
            manipulation_index: 0,
            user_delete_w: false,
        };

        this.des_robot_traj = {
            des_position: [],
            des_velocity: [],
            des_acceleration: [],
            counter: 0,

        };

        //class related to the sync objects callable from demoDrone
        this.task_sync_ = {
            task_broadcaster: [],
            task1_selected: false,
            task2_selected: false,
            switch_detected: false,
            task1_selected_pr: false, 
            task2_selected_pr: false, 
            timer_task_button_flag: null,
        }

        this.user_ball_sync_ = {
            sync_broadcaster: [],
            ball_position: [],
        }

        this.waypoints_sync_ = 
        {
            sync_broadcaster: [], 
            w_counter: 0,
            w_counter_received: 0, //This is for create a difference between the clients who receive and the one who generates
            index: 0, //For the manioulation case 
            position: [0.0, 0.0, 0.0],
            transform_matrix: [],
            generate: false, // flag to inform a new waypoint with index w_counter needs to be generated 
            manipulate: false,
            delete: false,
            is_this_client_updating: false, 
        }


        this.client_action_sync_ = {
            sync_broadcaster: [], 
            on_click: false, 
        }

        this.button_status = {
            on_click: false, 
            on_press: false, 
            on_drag: false,
            on_release: false,
        }

        this.MA = cg.mIdentity();

        //variables
        this.strokes = []; //Visualize the drone desired trajectory in VR
        this.colors = []; //Array wher ethe color of the strokes are inserted 


        //Objects 
        this.model;
        this.plane;
        this.wires;
        this.board;
        this.user_sphere;


        this.robot_cube;
        this.robot_cube2_1;
        this.robot_cube2_5;
        this.robot_cube2_8;
        this.robot_cube2_9;

        this.drone;
        this.drone2_1;
        this.drone2_5;
        this.drone2_8;
        this.drone2_9;

        this.trans_robot_cube;
        this.trans_robot_cube2_1;
        this.trans_robot_cube2_5;
        this.trans_robot_cube2_8;
        this.trans_robot_cube2_9;

        this.task_button;
        this.take_control_button;
        this.waypoint_obj;

        this.drag_init = true;
        //Timers 
        this.t_now_odom = new Date().getTime() / 1000;
        this.t_past_odom = new Date().getTime() / 1000;
        this.delta_t_odom = 0.0;

        this.t_now_des_pose = new Date().getTime() / 1000;
        this.t_past_des_pose = new Date().getTime() / 1000;
        this.delta_t_des_pose = 0.0;



        //Flags 
        this.isDrawing = false;
        this.isDrawing_on_cloud = false;
        this.task_button_is_pressed = false;
        this.take_control_button_is_pressed = false;
        // this.finalGoalSubscribed = false;

        //counters 
        this.button_pressed_counter = 0;

        
       

        console.log("[TASK MANAGER] Class Initialized")
    }

    set_objects(model, plane, wires, board, user_sphere, 
        
        robot_cube, robot_cube2_1, robot_cube2_5, robot_cube2_8, robot_cube2_9,
        drone, drone2_1, drone2_5, drone2_8, drone2_9, 
        trans_robot_cube, trans_robot_cube2_1, trans_robot_cube2_5, trans_robot_cube2_8, trans_robot_cube2_9,
        
        task_button, take_control_button, waypoint_obj) {


        this.model = model;
        this.plane = plane;
        this.wires = wires;
        this.board = board;
        this.user_sphere = user_sphere;

        this.robot_cube = robot_cube;
        this.robot_cube2_1 = robot_cube2_1;
        this.robot_cube2_5 = robot_cube2_5;
        this.robot_cube2_8 = robot_cube2_8;
        this.robot_cube2_9 = robot_cube2_9;

        this.drone = drone;
        this.drone2_1 = drone2_1;
        this.drone2_5 = drone2_5;
        this.drone2_8 = drone2_8;
        this.drone2_9 = drone2_9;

        this.trans_robot_cube = trans_robot_cube;
        this.trans_robot_cube2_1 = trans_robot_cube2_1;
        this.trans_robot_cube2_5 = trans_robot_cube2_5;
        this.trans_robot_cube2_8 = trans_robot_cube2_8;
        this.trans_robot_cube2_9 = trans_robot_cube2_9;

        this.task_button = task_button;
        this.take_control_button = take_control_button;
        this.waypoint_obj = waypoint_obj;
    }
   
  
    //Update robot pose in the VR 
    update_robot_pose() {

        // show real-time drone movement position, for debugg
        // console.log("Update Robot Pose", this.robot_pose.position, this.robot_pose.orientation_quat);
      
        //Convert from quaternion to euler angles 
        let euler = cg.quat2eul(this.robot_pose.orientation_quat);
        this.robot_pose.orientation_eul = [euler.roll, euler.pitch, euler.yaw];

        this.trans_robot_cube.identity().move(this.robot_pose.position);
        this.drone.translation = [
            this.robot_pose.position[0] * 0.5,
            this.robot_pose.position[1] * 0.5, 
            this.robot_pose.position[2] * 0.5
        ];
        
        //to change the orientation 
        this.robot_cube.turnX(euler.roll);
        this.robot_cube.turnY(euler.pitch);
        this.robot_cube.turnZ(euler.yaw);

        this.drone.rotation = this.robot_pose.orientation_quat; //This ks the robot mesh
        //Add  the actual rotation as roll, pitch yaw plu the differenc ein the actial one. The mesh as default is with pitch +90 degrees 
     
       
        //console.log("Robot Odom: x " + this.robot_pose.position[0] + " y: " + this.robot_pose.position[1] + " z: " +this.robot_pose.position[2]);
    }

    update_robot_pose2_1() {
        let euler =  cg.quat2eul(this.robot_pose2_1.orientation_quat);
        this.robot_pose2_1.orientation_eul = [euler.roll, euler.pitch, euler.yaw];
        this.trans_robot_cube2_1.identity().move(this.robot_pose2_1.position);

        // this.drone2_1.translation = this.robot_pose2_1.position;
        this.drone2_1.translation = [
            this.robot_pose2_1.position[0] * 0.5,
            this.robot_pose2_1.position[1] * 0.5, 
            this.robot_pose2_1.position[2] * 0.5
        ];


        this.robot_cube2_1.turnX(euler.roll);
        this.robot_cube2_1.turnY(euler.pitch);
        this.robot_cube2_1.turnZ(euler.yaw);

        this.drone2_1.rotation = this.robot_pose2_1.orientation_quat;
    }

    update_robot_pose2_5() {
        let euler =  cg.quat2eul(this.robot_pose2_5.orientation_quat);
        this.robot_pose2_5.orientation_eul = [euler.roll, euler.pitch, euler.yaw];
        this.trans_robot_cube2_5.identity().move(this.robot_pose2_5.position);

        // this.drone2_5.translation = this.robot_pose2_5.position;
        this.drone2_5.translation = [
            this.robot_pose2_5.position[0] * 0.5,
            this.robot_pose2_5.position[1] * 0.5, 
            this.robot_pose2_5.position[2] * 0.5
        ];


        this.robot_cube2_5.turnX(euler.roll);
        this.robot_cube2_5.turnY(euler.pitch);
        this.robot_cube2_5.turnZ(euler.yaw);

        this.drone2_5.rotation = this.robot_pose2_5.orientation_quat;
    }

    update_robot_pose2_8() {
        let euler =  cg.quat2eul(this.robot_pose2_8.orientation_quat);
        this.robot_pose2_8.orientation_eul = [euler.roll, euler.pitch, euler.yaw];
        this.trans_robot_cube2_8.identity().move(this.robot_pose2_8.position);
        
        // this.drone2_8.translation = this.robot_pose2_8.position;
        this.drone2_8.translation = [
            this.robot_pose2_8.position[0] * 0.5,
            this.robot_pose2_8.position[1] * 0.5, 
            this.robot_pose2_8.position[2] * 0.5
        ];


        this.robot_cube2_8.turnX(euler.roll);
        this.robot_cube2_8.turnY(euler.pitch);
        this.robot_cube2_8.turnZ(euler.yaw);

        this.drone2_8.rotation = this.robot_pose2_8.orientation_quat;
    }

    update_robot_pose2_9() {
        let euler =  cg.quat2eul(this.robot_pose2_9.orientation_quat);
        this.robot_pose2_9.orientation_eul = [euler.roll, euler.pitch, euler.yaw];
        this.trans_robot_cube2_9.identity().move(this.robot_pose2_9.position);
        
        
        // this.drone2_9.translation = this.robot_pose2_9.position;
        this.drone2_9.translation = [
            this.robot_pose2_9.position[0] * 0.5,
            this.robot_pose2_9.position[1] * 0.5, 
            this.robot_pose2_9.position[2] * 0.5
        ];

        this.robot_cube2_9.turnX(euler.roll);
        this.robot_cube2_9.turnY(euler.pitch);
        this.robot_cube2_9.turnZ(euler.yaw);

        this.drone2_9.rotation = this.robot_pose2_9.orientation_quat;
    }

    async subcribe_robot_pose() {
        let message = {
            request: 'SUBSCRIBE',
            type: "webxr_robot_pos",
            channel: "robot_odom",
            ts: Date.now(),
            frame_id: "world",
        };

        //Call the server to ask for subscribing
        this.ws_sender.subscribe_robot_odom(this.ws, message);

        //console.log("Robot Odom: x " + this.ws_sender.robot_odom.position[0] + " y: " + this.ws_sender.robot_odom.position[1] + " z: " +this.ws_sender.robot_odom.position[2]);
        //store the data in the robot struct
        this.robot_pose.position = this.ws_sender.robot_odom.position;
        this.robot_pose.orientation_quat = this.ws_sender.robot_odom.orientation;
        this.robot_pose.velocity = this.ws_sender.robot_odom.velocity;
        this.robot_pose.frame_id = this.ws_sender.robot_odom.frame_id;
        this.robot_pose.name =  this.ws_sender.robot_odom.name;
        
        
        // console.log("robot name: " + this.ws_sender.robot_odom.name);
    };

    async subscribe_robot_pose2_1(){
        let message = {
            request: 'SUBSCRIBE',
            type: "webxr_robot_pos2_1",
            channel: "robot_odom2_1",
            ts: Date.now(),
            frame_id: "world",
        };
        this.ws_sender2_1.subscribe_robot_odom2_1(this.ws2_1, message);

        this.robot_pose2_1.position = this.ws_sender2_1.robot_odom2_1.position;
        this.robot_pose2_1.orientation_quat = this.ws_sender2_1.robot_odom2_1.orientation;
        this.robot_pose2_1.velocity = this.ws_sender2_1.robot_odom2_1.velocity;
        this.robot_pose2_1.frame_id = this.ws_sender2_1.robot_odom2_1.frame_id;
        this.robot_pose2_1.name =  this.ws_sender2_1.robot_odom2_1.name;

        // console.log("robot name: " + this.ws_sender2_1.robot_odom2_1.name);

    }

    async subscribe_robot_pose2_5(){
        let message = {
            request: 'SUBSCRIBE',
            type: "webxr_robot_pos2_5",
            channel: "robot_odom2_5",
            ts: Date.now(),
            frame_id: "world",
        };
        this.ws_sender2_5.subscribe_robot_odom2_5(this.ws2_5, message);

        this.robot_pose2_5.position = this.ws_sender2_5.robot_odom2_5.position;
        this.robot_pose2_5.orientation_quat = this.ws_sender2_5.robot_odom2_5.orientation;
        this.robot_pose2_5.velocity = this.ws_sender2_5.robot_odom2_5.velocity;
        this.robot_pose2_5.frame_id = this.ws_sender2_5.robot_odom2_5.frame_id;
        this.robot_pose2_5.name =  this.ws_sender2_5.robot_odom2_5.name;

        // console.log("robot name: " + this.ws_sender2_5.robot_odom2_5.name);

    }

    async subscribe_robot_pose2_8(){
        let message = {
            request: 'SUBSCRIBE',
            type: "webxr_robot_pos2_8",
            channel: "robot_odom2_8",
            ts: Date.now(),
            frame_id: "world",
        };
        this.ws_sender2_8.subscribe_robot_odom2_8(this.ws2_8, message);

        this.robot_pose2_8.position = this.ws_sender2_8.robot_odom2_8.position;
        this.robot_pose2_8.orientation_quat = this.ws_sender2_8.robot_odom2_8.orientation;
        this.robot_pose2_8.velocity = this.ws_sender2_8.robot_odom2_8.velocity;
        this.robot_pose2_8.frame_id = this.ws_sender2_8.robot_odom2_8.frame_id;
        this.robot_pose2_8.name =  this.ws_sender2_8.robot_odom2_8.name;

        // console.log("robot name: " + this.ws_sender2_8.robot_odom2_8.name);

    }
    
    async subscribe_robot_pose2_9(){
        let message = {
            request: 'SUBSCRIBE',
            type: "webxr_robot_pos2_9",
            channel: "robot_odom2_9",
            ts: Date.now(),
            frame_id: "world",
        };
        this.ws_sender2_9.subscribe_robot_odom2_9(this.ws2_9, message);

        this.robot_pose2_9.position = this.ws_sender2_9.robot_odom2_9.position;
        this.robot_pose2_5.orientation_quat = this.ws_sender2_9.robot_odom2_9.orientation;
        this.robot_pose2_9.velocity = this.ws_sender2_9.robot_odom2_9.velocity;
        this.robot_pose2_9.frame_id = this.ws_sender2_9.robot_odom2_9.frame_id;
        this.robot_pose2_9.name =  this.ws_sender2_9.robot_odom2_9.name;

        // console.log("robot name: " + this.ws_sender2_9.robot_odom2_9.name);

    }


    async subscribe_des_traj() {
        //Subscribe to robot trajectory
        let message = {
            request: 'SUBSCRIBE',
            type: "webxr_traj",
            channel: "desired_traj",
            ts: Date.now(),
            frame_id: "world",
        };

        //Call the server to ask for subscribing
        this.ws_sender_traj.subscribe_robot_des_traj(this.ws_, message);

        //Get the trajectory from the subscriber 
        this.des_robot_traj.des_position = this.ws_sender_traj.desired_traj_pos.des_pos;
       // console.log("this.ws_sender_traj.desired_traj_pos.des_pos: " + this.ws_sender_traj.desired_traj_pos.des_pos.length);




    }

    async subscribe_static_occupancy() {
        //Subscribe to robot trajectory
        let message = {
            request: 'SUBSCRIBE',
            type: "webxr_static_occupancy",
            channel: "static_occupancy",
            ts: Date.now(),
            frame_id: "world",
        };

        //Call the server to ask for subscribing
        this.ws_sender_occupancy.subscribe_robot_static_occupancy(this.ws_occupancy, message);

    }
    
    async subscribe_final_goal() {
        //Subscribe to final goal
        let message = {
            request: 'SUBSCRIBE',
            type: "webxr_final_goal",
            channel: "final_goal",
            ts: Date.now(),
            frame_id: "world",
        };

        //Call the server to ask for subscribing
        this.ws_sender_goal.subscribe_robot_final_goal(this.ws_goal, message);
        // this.final_goal.location = this.ws_sender_goal.final_goal.location;

    }

    async subscribe_mpl_path() {
        let message = {
            request: 'SUBSCRIBE',
            type: "webxr_mpl_path",
            channel: "mpl_path",
            ts: Date.now(),
            frame_id: "world",
        };

        this.ws_sender_mplpath.subscribe_robot_mpl_path(this.ws_mplpath, message);
    }

    
    async send_desired_position() {
        //Define the position message 
        let orientation_msg = [0.0, 0.0, 0.0, 0.0];
        let message = { "position_msg": this.user_hand.p, "orientation_msg": orientation_msg, "ts": Date.now(), "frame_id": "world" };
        let message_ = {
            request: 'PUBLISH',
            type: "webxr_des_pos",
            channel: "user_position",
            message: message,
        };
        //ws_sender.connect();
        this.ws_sender.send(this.ws, message_);

    }

    async publish_desired_waypoint() {
        //publish the desired waypoint while in task 0
        let waypoint_position_msg = this.user_waypoints.w_pos;
        let message = { "position_list_msg": waypoint_position_msg, "ts": Date.now(), "frame_id": "world" }; //to add orientation
        let message_ = {
            request: 'PUBLISH',
            type: "webxr_des_waypoints_list",
            channel: "desired_waypoints",
            message: message,
        };
        //ws_sender.connect();
        this.ws_sender.send(this.ws, message_);
        this.waypoints_published = true;
    }

    async publish_start_traj()
    {
        //publish a true flag to start the traj 
        let start_msg = "true";
        let message = { "flag": start_msg, "ts": Date.now(), "frame_id": "world" };
        let message_ = {
            request: 'PUBLISH',
            type: "webxr_start_traj",
            channel: "start_traj",
            message: message,
        };
        this.ws_sender.send(this.ws, message_);

    }

    async publish_change_of_task() {
        //publish the change of the scenario
        let task_msg = this.task;
        let message = { "task": task_msg, "ts": Date.now(), "frame_id": "world" }; //to add orientation
        let message_ = {
            request: 'PUBLISH',
            type: "webxr_current_task",
            channel: "current_task",
            message: message,
        };
        //ws_sender.connect();
        this.ws_sender.send(this.ws, message_);
    }
    
    async publish_take_control(){
        let take_control_msg = true;
        let message = { "action": take_control_msg, "ts": Date.now() }; //to add orientation
        let message_ = {
            request: 'PUBLISH',
            type: "webxr_take_control",
            channel: "take_control",
            message: message,
        };
        //ws_sender.connect();
        this.ws_sender.send(this.ws, message_);
    }
    


    // change_robot_color()
    // {
    //     let vel_magn = Math.sqrt( this.robot_pose.velocity[0]* this.robot_pose.velocity[0] + this.robot_pose.velocity[1]* this.robot_pose.velocity[1] + this.robot_pose.velocity[2]* this.robot_pose.velocity[2]);
    //     //console.log("Vel Magnitude: " + vel_magn);
    //     if (vel_magn > 0.3){
    //         //Turn Yellow the cube 
    //         this.robot_cube.color(1, 0.64, 0);
    //     }
    //     else if(vel_magn > 0.5){
    //         //Turn Red 
    //         this.robot_cube.color(0.8, 0, 0);
    //     }
    //     else
    //     {
    //         //Keep it green 
    //         this.robot_cube.color(0, 1, 0);
    //     }
    // };




    draw_trajectory() {
        
        // Handle regular trajectory data
        if (this.ws_sender_traj.desired_traj_pos.des_pos.length > 0) {
            
             
            //Iterate on the array on positions received expressed as [x, y , z]
            //let pose = this.des_robot_traj.des_position[this.des_robot_traj.counter];


            this.x = this.ws_sender_traj.desired_traj_pos.des_pos[this.des_robot_traj.counter][0];
            this.y = this.ws_sender_traj.desired_traj_pos.des_pos[this.des_robot_traj.counter][2];
            this.z = -1 * this.ws_sender_traj.desired_traj_pos.des_pos[this.des_robot_traj.counter][1];

            //The the velocities 
            let speed = this.ws_sender_traj.desired_traj_pos.des_vel_magnitude[this.des_robot_traj.counter];
            let min_speed = this.ws_sender_traj.desired_traj_pos.min_vel;
            let max_speed = this.ws_sender_traj.desired_traj_pos.max_vel;
            

            // this.x = this.x + 0.1*Math.sin(this.des_robot_traj.counter/10);
            // this.y = this.y + 0.01;
            // this.z = this.z + 0.01;
            let pose = [this.x, this.y, this.z];
            //Compute color for velocity: Blue when min vel and yellow when max vel reached 
         
            //let grey = Math.min(1, Math.max(0, speed));
            
            //let color = this.colors[this.colors.length - 1]; 
            let grey = speed/max_speed;
            
            // for(let i=0;i<10;i++) {
            //     this.strokes.push(pose);
            //     color.push([grey, grey, 1 - grey]); // faster - more yellowish; slower - more bluish

            // }
            
            
            if (this.strokes.length == 0) {
                this.strokes.push(pose);
                this.colors.push([grey, grey, 1 - grey]);
            }
            else {
                this.strokes[this.strokes.length - 1].push(pose);
                this.colors[this.colors.length - 1].push([grey, grey, 1 - grey]); 
            }
            let curves = [];
            

            for (let n = 0; n < this.strokes.length; n++) {
                curves.push(matchCurves.resample(this.strokes[n], 100));
                
            }
            
            // Here we use the buildwires as in demosimple drawing, changing the color
            tm_utils.buildWires(this.strokes, curves, this.wires, this.colors);
             

            this.des_robot_traj.counter = this.des_robot_traj.counter + 1;
        
        

         
            if (this.des_robot_traj.counter > this.ws_sender_traj.desired_traj_pos.des_pos.length - 1) {
                

                this.ws_sender_traj.desired_traj_pos.des_pos = [];
                this.des_robot_traj.des_position = [];
                this.des_robot_traj.counter = 0;
                this.array_init = false; 
                this.x = 0;
                this.y = 0;
                this.z = 0;
                this.counter = 0;
                

            }
        }

    }

    // Add this new method to the Task_Manager class for MPL path visualization
    visualize_mpl_path() {
        if (this.ws_sender_mplpath.mpl_path.path_points.length > 0){
            const path_points = this.ws_sender_mplpath.mpl_path.path_points;
            
            // Create separate arrays just for MPL path visualization
            let mpl_strokes = [];
            let mpl_colors = [];
            
            let mpl_stroke = [];
            let mpl_color_array = [];

            for (let i = 0; i < path_points.length; i++){
                let x = path_points[i][0] * 0.5;
                let y = path_points[i][2] * 0.5;
                let z = -path_points[i][1] * 0.5;

                let pose = [x, y, z];
                
                mpl_stroke.push(pose);     
                mpl_color_array.push([1, 0, 1]);
            }

            mpl_strokes.push(mpl_stroke);
            mpl_colors.push(mpl_color_array);
            

            let curves = [];
            for (let n = 0; n < mpl_strokes.length; n++) {
                curves.push(matchCurves.resample(mpl_strokes[n], 100));
            }

            tm_utils.buildWires(mpl_strokes, curves, this.wires, mpl_colors);
            
            // Clear the MPL path data
            this.ws_sender_mplpath.mpl_path.path_points = [];
        }
    }
    

    sync_new_waypoint()
    {
    
    
    if (this.client_action_sync_.on_click || this.client_action_sync_.on_release){
           this.reset_line();
           console.log("Reset the line");

           //Broadcast back that the sync has been received puuting false to the flag
           this.button_status.on_click = false;
           this.button_status.on_release = false;

           
         }

   
         
    //    console.log("this.user_waypoints.user_delete_w : " + this.user_waypoints.user_delete_w);

       if (this.waypoints_sync_.w_counter_received != this.user_waypoints.w_counter && this.waypoints_sync_.manipulate==false && this.waypoints_sync_.delete==false && this.waypoints_sync_.generate)
       {
            console.log("Generate new waypoint");
            

            let name = 'volatile_waypoint_' + this.waypoints_sync_.w_counter_received;
            let position = this.waypoints_sync_.position;
            let transform = this.waypoints_sync_.transform_matrix;
            this.user_waypoints.last_w = this.waypoint_obj.add().label(name).add('sphere').color(1, 0, 0).opacity(0.6).move(position).scale(0.1, 0.1, 0.1);
                //create the axis of he waypoint so the user know where the yawis pointing
                let w_x_bar = () => this.user_waypoints.last_w.add().label('w_x_axis').add('cube').color(1, 0, 0).move(1.0, 0.0, 0.0).scale(1.0, .2, .1).parent();
                w_x_bar().move(0.8, 0.0, 0.0);
                let w_y_bar = () => this.user_waypoints.last_w.add().label('w_y_axis').add('cube').color(0, 1, 0).move(0, 0, -1).scale(0.1, .2, 1.0).parent();
                w_y_bar().move(0.1, .2, 0.8);
                let w_z_bar = () => this.user_waypoints.last_w.add().label('w_z_axis').add('cube').color(0, 0, 1).move(0, 1, 0).scale(0.1, 1.0, 0.2).parent();
                w_z_bar().move(0.1, 0.8, 0.2);

                this.user_waypoints.waypoints_list.push(this.user_waypoints.last_w);
                this.user_waypoints.w_pos.push(position); //the poistion of the waypoint is the same of the user hand position
                this.user_waypoints.T_Wayp_list.push(transform); //initialize the transformation matrix list of the new createad object
                
                //Required for the waypoints elimination 
                this.strokes.push([]);
                this.colors.push([]);
            
            this.user_waypoints.w_counter = this.waypoints_sync_.w_counter_received;
            this.waypoints_sync_.w_counter = this.waypoints_sync_.w_counter_received;
       }
       else if (this.waypoints_sync_.w_counter_received != this.user_waypoints.w_counter && this.waypoints_sync_.manipulate==false && this.waypoints_sync_.delete && this.user_waypoints.user_delete_w == false){
        //This is the case where one of the user has deleted a waypoint 
        console.log("Delete Waypoint");
        tm_utils.delete_single_waypoint_as_client(this.user_waypoints, this.waypoint_obj,this.waypoints_sync_);
        //Once receive and with the counter updated, broadcast again with the delete flag = false
        this.waypoints_sync_.delete = false;
        sr.sync_waypoints(this.waypoints_sync_); 
        this.user_waypoints.w_counter = this.waypoints_sync_.w_counter_received;
       }

       //Case when the user is in manipoulation of a wayoint and what to change its position 
       if (this.waypoints_sync_.manipulate && this.waypoint_manipulation==false){
                
                let i = this.waypoints_sync_.index; //get the manipulayted waypoints index from the air
                let curr_T_Wayp = this.waypoints_sync_.transform_matrix; //retrieve the controller current T
               
                this.user_waypoints.T_Wayp_list[i] = curr_T_Wayp;


                // }
                // get the R matrix
                let R = tm_utils.get_Rot_from_T(curr_T_Wayp);
                let q = tm_utils.rotationMatrixToQuaternion(R); //obtain quaternion from R matrix of the waypoint
               
                // after retrieving the R and T matrix of the object, move the graphic depending if the object has been intersected 
                //by the laser beam or the user is directly manipulating it
                
                //this.user_waypoints.waypoints_list[i].setMatrix(curr_T_Wayp).scale(.1);
               
                this.user_waypoints.waypoints_list[i].identity().move(this.user_waypoints.w_pos[i]).scale(.1); //In the case the user is moving with the beam pointer
                


                this.user_waypoints.w_pos[i] =  this.waypoints_sync_.position; //add the position of the waypoint
                this.user_waypoints.w_quat[i] = q; //add the orientatiin of  the waypoints
                

                //this.MA = T_Cont;
       }
    }


    task0() {

        this.user_sphere.opacity(0.01);

    //Check if a new waypoint needs to be added into the scene from another client 
     this.sync_new_waypoint();

    //The passage to the other task is managed in on release 
    this.draw_trajectory();

    //Detect if the user press button B to eliminate one of the waypoint 
    this.user_waypoints.user_delete_w =tm_utils.detect_waypoints_elimination(this.user_waypoints, this.waypoint_obj, this.waypoints_sync_);
    

    }

    task1() {
        
        //If locally the user is in isDrawing, then the ball is moved from the onDrag function 
        //and the ball position streamed to all the clients 
        if (this.isDrawing) {
            let curves = [];
            for (let n = 0; n < this.strokes.length; n++) {
                curves.push(matchCurves.resample(this.strokes[n], 100));

            }
            this.colors = [];
            // tm_utils.buildWires(this.strokes, curves, this.wires, this.colors);
            this.isDrawing_on_cloud = false; //Don't need to sync with itself
            

        }
       
        if (this.isDrawing_on_cloud && this.isDrawing == false){
            
            this.user_sphere.identity().move(this.user_hand.p);
           
            this.isDrawing_on_cloud = false;
            
        }
        
        


    }

    /*
    visualize_point_clouds() {

        // ✅ Check the correct property: static_occupancy.points (not static_occupancy_data)
        if (this.ws_sender_occupancy && this.ws_sender_occupancy.static_occupancy && this.ws_sender_occupancy.static_occupancy.points && this.ws_sender_occupancy.static_occupancy.points.length > 0) {
            const points = this.ws_sender_occupancy.static_occupancy.points;

            
            points.forEach((point, index) => {
                if (index < 10000) { // Limit for performance
                    console.log(`Point ${index}: x=${point[0]}, y=${point[1]}, z=${point[2]}`);
                }
            });
            
        } 
    }
    
    visualize_final_goal(){
        if (this.ws_sender_goal && this.ws_sender_goal.final_goal && this.ws_sender_goal.final_goal.location) {
            const finalGoal = this.ws_sender_goal.final_goal;
            // console.log("   Location:", finalGoal.location);
        } 
    }
    
    visualize_mpl_path(){
        if (this.ws_sender_mplpath && this.ws_sender_mplpath.mpl_path && this.ws_sender_mplpath.mpl_path.path_points && this.ws_sender_mplpath.mpl_path.path_points.length > 0) {
            const pathPoints = this.ws_sender_mplpath.mpl_path.path_points;
            console.log("🛤️ Visualizing MPL path:");
            console.log("   Point length:", pathPoints.length);
            
            console.log("   All path points:");
            for (let i = 0; i < pathPoints.length; i++) {
                const point = pathPoints[i];
                console.log(`     Point ${i}: [${point[0]}, ${point[1]}, ${point[2]}]`);
            }

        }
    }
    */

    async t_odom_update() {
        this.t_now_odom = new Date().getTime() / 1000;
        let delta_t_odom = this.t_now_odom - this.t_past_odom;
        if (delta_t_odom > 0.5) {

            this.subcribe_robot_pose();
            this.subscribe_robot_pose2_1();
            this.subscribe_robot_pose2_5();
            this.subscribe_robot_pose2_8();
            this.subscribe_robot_pose2_9();

            this.update_robot_pose();
            this.update_robot_pose2_1();
            this.update_robot_pose2_5();
            this.update_robot_pose2_8();
            this.update_robot_pose2_9();

            this.subscribe_des_traj();
            this.subscribe_static_occupancy();
            
        
            this.subscribe_final_goal();
            this.subscribe_mpl_path();
            // for debugg purpose
            // this.visualize_point_clouds();
            // this.visualize_final_goal();
            this.visualize_mpl_path();

            tm_utils.change_robot_color(this.robot_pose, this.robot_cube);
            this.t_past_odom = new Date().getTime() / 1000;
        }
        
        //Check the Global Broadcast to detect a change in the task from one of the client 
       
        
        if (this.task_sync_.switch_detected && this.task_button_is_pressed==false){
            console.log("[Task-manager] change detected");
            this.change_task();
            this.task_sync_.switch_detected = false;

        }


      
        switch (this.task) {
            case 0:
                //waypoint case 
                this.task0();
                break;
            case 1:
                //dmiyttance case 
                this.task1();
            default:
                break;
        }
        
        
        //If received as true, reset to false at the next iteration 
        this.client_action_sync_.on_click = false;
        this.client_action_sync_.on_release = false;
    };


    //Input Events Methods

    find_hand_tracking(hand, rightTrigger) {
        //check if the user move his hand close to the button to change task and trigger the button 
        let task_button_W = [1.0, 2.0, -2.0];
        let take_control_button_W = [-0.2, 2.0, -2.0];

        if (rightTrigger) {

            //if the user pressed the right trigger, check if he pressed it to point the laser or he7she is touching the button 
            let isLeftInObj = tm_utils.inObject(controllerMatrix.right.slice(12, 15), this.task_button);

            //check if the user hit the button with the right laser beam as well 
            let radius = 0.3;
            let is_a_list = false;
            let return_values_beam = tm_utils.check_laser_beam_interaction(task_button_W, radius, is_a_list);
            let beam_hit = return_values_beam[1];

            if ((isLeftInObj || beam_hit) && this.button_pressed_counter == 0) {
                //change the task
                this.task_button_is_pressed = true;
                console.log("Task Change Button is pressed");
                this.button_pressed_counter = this.button_pressed_counter + 1;
            }

            //check if the other button is pressed 
            let isLeft1InObj = tm_utils.inObject(controllerMatrix.right.slice(12, 15), this.take_control_button);
             //check if the user hit the button with the right laser beam as well 
            radius = 0.3;
            is_a_list = false;
            return_values_beam = tm_utils.check_laser_beam_interaction(take_control_button_W, radius, is_a_list);
            beam_hit = return_values_beam[1];
 
             if ((isLeft1InObj || beam_hit) && this.button_pressed_counter == 0) {
                 //change the task
                 this.take_control_button_is_pressed = true;
                 console.log("Take COntrol Button is pressed");
                 this.button_pressed_counter = this.button_pressed_counter + 1;
             }


        }
        else {
            this.button_pressed_counter = 0;
        }
    }


    async on_drag(hand) {
        
        if (this.task == 0) {
            // check if the user in manipulation is active to move an existing waypoint
            if (this.user_waypoints.in_manipulation) { //the user is touching the object
                let i = this.user_waypoints.manipulation_index;
                let curr_T_Wayp = this.user_waypoints.T_Wayp_list[i]; //retrieve the controller current T
                let T_Cont = controllerMatrix.right.slice(); //Get the latest updated T matrix of the controller
                if (this.drag_init) {
                    this.MA = T_Cont;
                    this.drag_init = false;
                } else {
                    curr_T_Wayp = cg.mMultiply(cg.mMultiply(T_Cont, cg.mInverse(this.MA)), curr_T_Wayp); //get the transformation matrix of the object
                    this.user_waypoints.T_Wayp_list[i] = curr_T_Wayp; //Assign the new waypoint position 
 

 

                }
                // get the R matrix
                let R = tm_utils.get_Rot_from_T(curr_T_Wayp);
                let q = tm_utils.rotationMatrixToQuaternion(R); //obtain quaternion from R matrix of the waypoint

                // after retrieving the R and T matrix of the object, move the graphic depending if the object has been intersected 
                //by the laser beam or the user is directly manipulating it
                this.user_waypoints.waypoints_list[i].setMatrix(curr_T_Wayp).scale(.1);


                this.user_waypoints.w_pos[i] = inputEvents.pos(hand); //add the position of the waypoint
                this.user_waypoints.w_quat[i] = q; //add the orientatiin of  the waypoints
                

                this.MA = T_Cont;
                this.waypoint_manipulation = true; 

                //Sync the change in position of the waypoint with other users
                this.waypoints_sync_.w_counter = this.user_waypoints.counter;
                this.waypoints_sync_.index = this.user_waypoints.manipulation_index;
                this.waypoints_sync_.manipulate = true;
                this.waypoints_sync_.generate = false;
                this.waypoints_sync_.delete = false;
                this.waypoints_sync_.position = this.user_waypoints.w_pos[i];
                this.waypoints_sync_.transform_matrix = curr_T_Wayp;
                sr.sync_waypoints(this.waypoints_sync_);
                this.waypoints_sync_.generate = false;
                this.waypoints_sync_.manipulate = false;


            }
            else if (this.user_waypoints.in_manipulation_beam) {
                
                
                let i = this.user_waypoints.manipulation_index;
                let radius = 0.1;
                let is_a_list = true;
                let return_values_beam = tm_utils.check_laser_beam_interaction(this.user_waypoints.w_pos, radius, is_a_list);
                this.user_waypoints.beam_point = return_values_beam[2];
                this.user_waypoints.w_pos[i] = this.user_waypoints.beam_point;
                this.user_waypoints.waypoints_list[i].identity().move(this.user_waypoints.beam_point).scale(.1);


                //Store the T and R matrix to sent thriough the web once published
                let curr_T_Wayp = this.user_waypoints.T_Wayp_list[i]; //retrieve the controller current T
                let T_Cont = controllerMatrix.right.slice(); //Get the latest updated T matrix of the controller
                if (this.drag_init) {
                    this.MA = T_Cont;
                    this.drag_init = false;
                } else {
                
                    //curr_T_Wayp = cg.mMultiply(cg.mMultiply(T_Cont, cg.mInverse(this.MA)), curr_T_Wayp); //get the transformation matrix of the object
                    this.user_waypoints.T_Wayp_list[i] = curr_T_Wayp;

                }
                
                // get the R matrix
                let R = tm_utils.get_Rot_from_T(curr_T_Wayp);
                let q = tm_utils.rotationMatrixToQuaternion(R); //obtain quaternion from R matrix of the waypoint

                this.user_waypoints.w_quat[i] = q; //add the orientatiin of  the waypoints

                this.MA = T_Cont;
                this.waypoint_manipulation = true; 

                this.waypoints_sync_.w_counter = this.user_waypoints.counter;
                this.waypoints_sync_.index = this.user_waypoints.manipulation_index;
                this.waypoints_sync_.manipulate = true;
                this.waypoints_sync_.generate = false;
                this.waypoints_sync_.delete = false;
                this.waypoints_sync_.position = this.user_waypoints.w_pos[i];
                this.waypoints_sync_.transform_matrix = curr_T_Wayp;
                sr.sync_waypoints(this.waypoints_sync_);
                this.waypoints_sync_.generate = false;
                this.waypoints_sync_.manipulate = false;
                

            }


            //this.strokes[this.strokes.length - 1].push(inputEvents.pos(hand));
        }
        else {
            //Sync the ball position once in on drag 
            
            let distance = 0.0;
            this.t_now_des_pose = new Date().getTime() / 1000;
            this.delta_t_des_pose = this.t_now_des_pose - this.t_past_des_pose;
            //Before updating the position check that the user is close to the ball position where it was released previously 


            //Manage the double case if the user is moving the ball touching it or through the klaser beam 
            if (this.user_hand.check_on_press) {
                this.user_hand.p = cg.roundVec(3, inputEvents.pos(hand));
                // this.user_hand.p = inputEvents.pos(hand);
                let rawPos = inputEvents.pos(hand);
                this.user_hand.p = [rawPos[0] * 2.0, rawPos[1] * 2.0, rawPos[2] * 2.0];
                //Since the chess pieces have different height, it is looking if the height of the hand is inside the piece and not only in the xy position 
                //This is also becasue when the user is dragging the chess piece and its taking it up alomg y, to avoid the user marker is going out the height of the piece.
                this.user_hand.p[1] = cg.roundFloat(3, Math.max(this.H, this.user_hand.p[1] - this.plane.getMatrix()[13] - 0.4 * this.W));
            }
            else if (this.user_hand.in_manipulation_beam) {
                let radius = 0.1;
                let is_a_list = false;
                let return_values_beam = tm_utils.check_laser_beam_interaction(this.user_hand.p, radius, is_a_list);
                this.user_hand.p = return_values_beam[2];

                //store the T matrix 
                //Store the T and R matrix to sent thriough the web once published
                let curr_T_Wayp = this.user_hand.T_object; //retrieve the controller current T
                let T_Cont = controllerMatrix.right.slice(); //Get the latest updated T matrix of the controller
                if (this.drag_init) {
                    this.MA = T_Cont;
                    this.drag_init = false;
                } else {
                    curr_T_Wayp = cg.mMultiply(cg.mMultiply(T_Cont, cg.mInverse(this.MA)), curr_T_Wayp); //get the transformation matrix of the object
                    this.user_waypoints.T_object = curr_T_Wayp;


                }
                // get the R matrix
                let R = tm_utils.get_Rot_from_T(curr_T_Wayp);
                let q = tm_utils.rotationMatrixToQuaternion(R); //obtain quaternion from R matrix of the waypoint
                this.MA = T_Cont;
            }


            //Send the position over the air 
            if (this.delta_t_des_pose > 0.02) {
                this.send_desired_position();
                this.t_past_des_pose = new Date().getTime() / 1000;
            }
            //Move the user ball in the scene
            // this.user_hand.p = inputEvents.pos(hand);
            let rawPos = inputEvents.pos(hand);
            this.user_hand.p = [rawPos[0] * 2.0, rawPos[1] * 2.0, rawPos[2] * 2.0];
            if (!this.take_control_button_is_pressed){
            this.user_sphere.identity().move(this.user_hand.p);
            }
            //Drawing Traj
            this.strokes[this.strokes.length - 1].push(inputEvents.pos(hand));
             
            //Broadcast the change in ball position to everyone 
            
            this.user_ball_sync_.ball_position = this.user_hand.p;
            sr.sync_ball(this.user_ball_sync_);
            this.isDrawing = true;


        }
        this.button_status.on_drag = true;
    };


    async on_press(hand, H, W) {
        this.waypoint_manipulation = false; 
       
        //Make a difference between task 1 and task 2
        if (hand == 'right' && this.task == 0 && this.task_button_is_pressed == false) {

            //When the user press the button here a red sphere appear on the hand position. This is the marker taht represent a waypoint 
            //the drone has to reach. 
            // this.user_hand.p = cg.roundVec(3, inputEvents.pos(hand));
            let rawPos = inputEvents.pos(hand);
            this.user_hand.p = cg.roundVec(3, [rawPos[0] * 2.0, rawPos[1] * 2.0, rawPos[2] * 2.0]);
            //Before generating a new waypoint check if the user wants to displace an already existing one 
            let return_values = tm_utils.check_user_waypoint_distance(controllerMatrix.left, controllerMatrix.right, this.user_waypoints.waypoints_list, true);
            this.user_waypoints.in_manipulation = return_values[1];

            //Check if the user is hitting the object as well with the laser beam 
            let radius = 0.1;
            let is_a_list = true;
            let return_values_beam = tm_utils.check_laser_beam_interaction(this.user_waypoints.w_pos, radius, is_a_list);
            this.user_waypoints.in_manipulation_beam = return_values_beam[1];
            this.user_waypoints.beam_point = return_values_beam[2]; //get the point of intersection between the beam and the object 
            if (this.user_waypoints.in_manipulation || this.user_waypoints.in_manipulation_beam) {
                //Don't create new waypoints if the user intention is in the manipulation of an already existing one
                if (this.user_waypoints.in_manipulation)
                    this.user_waypoints.manipulation_index = return_values[0];
                else
                    this.user_waypoints.manipulation_index = return_values_beam[0];
                // Go to drag to move the waypoint
            }
            else { //create a new waypoint


                let name = 'volatile_waypoint_' + this.user_waypoints.w_counter;

                this.user_waypoints.last_w = this.waypoint_obj.add().label(name).add('sphere').color(1, 0, 0).opacity(0.6).move(this.user_hand.p).scale(0.1, 0.1, 0.1);
                //create the axis of he waypoint so the user know where the yawis pointing
                let w_x_bar = () => this.user_waypoints.last_w.add().label('w_x_axis').add('cube').color(1, 0, 0).move(1.0, 0.0, 0.0).scale(1.0, .2, .1).parent();
                w_x_bar().move(0.8, 0.0, 0.0);
                let w_y_bar = () => this.user_waypoints.last_w.add().label('w_y_axis').add('cube').color(0, 1, 0).move(0, 0, -1).scale(0.1, .2, 1.0).parent();
                w_y_bar().move(0.1, .2, 0.8);
                let w_z_bar = () => this.user_waypoints.last_w.add().label('w_z_axis').add('cube').color(0, 0, 1).move(0, 1, 0).scale(0.1, 1.0, 0.2).parent();
                w_z_bar().move(0.1, 0.8, 0.2);

                this.user_waypoints.waypoints_list.push(this.user_waypoints.last_w);
                this.user_waypoints.w_pos.push(this.user_hand.p); //the poistion of the waypoint is the same of the user hand position
                this.user_waypoints.w_counter = this.user_waypoints.w_counter + 1;
                this.user_waypoints.T_Wayp_list.push(controllerMatrix.right.slice()); //initialize the transformation matrix list of the new createad object
                
                //Sy nc the new generated waypoint
                this.waypoints_sync_.w_counter = this.user_waypoints.w_counter;
                this.waypoints_sync_.generate = true;
                this.waypoints_sync_.delete = false;
                this.waypoints_sync_.manipulate = false;
                this.waypoints_sync_.position = this.user_hand.p;
                this.waypoints_sync_.transform_matrix = controllerMatrix.right.slice();
                sr.sync_waypoints(this.waypoints_sync_);
                this.waypoints_sync_.generate = false;

            }
            this.isDrawing = false;
            this.MA = controllerMatrix.right.slice();
            this.strokes.push([]);
            this.colors.push([]);


        }
        else if (hand == 'right' && this.task == 1) {
            //Before generating a new waypoint check if the user wants to displace an already existing one 
            //let return_values = tm_utils.check_user_waypoint_distance(controllerMatrix.left, controllerMatrix.right, this.user_sphere, false);

            var thr = 0.2;

            let return_values = tm_utils.check_user_object_distance(controllerMatrix.right, this.user_hand.p, thr);
            this.user_hand.check_on_press = return_values;

            // //check if the same object is hit by the laser beam 
            let radius = 0.1;
            let is_a_list = false;
            let return_values_beam = tm_utils.check_laser_beam_interaction(this.user_hand.p, radius, is_a_list);
            this.user_hand.in_manipulation_beam = return_values_beam[1];

            //Before updating the position check that the user is close to the ball position where it was released previously 
            if (this.user_hand.check_on_press || this.user_hand.in_manipulation_beam) {
                //Just place the manipulation object  in the user hand here 


                // this.user_hand.p = cg.roundVec(3, inputEvents.pos(hand));
                let rawPos = inputEvents.pos(hand);
                this.user_hand.p = cg.roundVec(3, [rawPos[0] * 2.0, rawPos[1] * 2.0, rawPos[2] * 2.0]);
                this.user_hand.p[1] = cg.roundFloat(3, Math.max(H, this.user_hand.p[1] - this.plane.getMatrix()[13] - 0.4 * W)); //this avoid the ball overshoot the height of the user controller
                if (this.user_hand.in_manipulation_beam) {
                    this.user_hand.p = return_values_beam[2];
                    this.user_hand.p[1] = cg.roundFloat(3, Math.max(H, this.user_hand.p[1] - this.plane.getMatrix()[13] - 0.4 * W));
                }




                //Saving Position to draw the path on the board
                this.isDrawing = true;
                this.strokes.push([]);
                this.colors.push([]);
                if (this.user_hand.in_manipulation_beam)
                    this.user_hand.check_on_press = false;


            }
            else {
                //do nothing
                this.user_hand.check_on_press = false;
                this.user_hand.in_manipulation_beam = false;
            }

        }

        //Confirm the execution of the waypoint pressing the button on the left hand 
        if (hand == 'left' && this.task == 0) {
            //Submit the waypoints to the planner
            this.publish_start_traj();
            

            // //Initilize the array 
        }
        this.button_status.on_press = true;
    }

    on_click(hand) {
        if (hand == 'right') {
            console.log("[ON CLICK] this.wires: " + this.wires);
            this.strokes = [];
            this.colors = [];
            this.strokes.push([]);
            this.colors.push([]);
            tm_utils.buildWires(this.strokes, this.strokes, this.wires, this.colors);
            
        }
        //this.task_button_is_pressed = false;
        
        this.button_status.on_click = true;
        sr.update_button_status(this.button_status, this.client_action_sync_);
        this.button_status.on_click = false;
    }
    
    //The client can call this method to reset the line even when they are nit clicking
    reset_line(){
       
        tm_utils.clearWires(this.wires);
        this.strokes = [];
        this.colors = [];
        this.strokes.push([]);
        this.colors.push([]);
        
        tm_utils.buildWires(this.strokes, this.strokes, this.wires, this.colors);
        
    }

    take_control(){
        
        if (this.take_control_button_is_pressed){
            console.log("[Take CONTROL] Take Control of The Robot");
            this.publish_take_control();
            

        }
        this.take_control_button_is_pressed = false;
    }
    
    change_task(){
        //In the case the button is pressed, it means we are in the window where the user is actively pressing the button.
        //In this case the flag has to be broadcasted to the other client 
        if (this.task_button_is_pressed && this.task == 0) { //move to task 1
            console.log("[CHANGE TASK] Switching from TASK 0 to TASK 1");
            this.clear_all(); //clear all the waypoints
            //move the sphere in the robot position and make it opaque
            this.user_hand.p = this.robot_pose.position;
            this.user_sphere.move(this.robot_pose.position);
            this.user_sphere.opacity(1.0);
            //this.task_button_is_pressed = false;
            this.user_hand.check_on_press = false;
            this.user_hand.in_manipulation_beam = false;
            this.task = 1;
            this.task_sync_.task1_selected = false; //Waypoints
            this.task_sync_.task2_selected = true; //Admittance
            this.task_sync_.task1_selected_pr = this.task_sync_.task1_selected;
            this.task_sync_.task2_selected_pr = this.task_sync_.task2_selected;
            sr.sync_task( this.task_sync_);
            //Inform ros the task has been switched 
            this.publish_change_of_task();
            // let flags = [this.task_button_is_pressed, this.task_sync_.switch_detected];
            // tm_utils.task_timer_setup(flags, this.task_sync_.timer_task_button_flag, 3000)
            clearTimeout(this.task_sync_.timer_task_button_flag); // Clear any existing timer
            this.task_sync_.timer_task_button_flag = setTimeout(() => {
                this.task_button_is_pressed = false;
                this.task_sync_.switch_detected = false;
                console.log('Button pressed flag set to:', this.task_button_is_pressed);
            }, 3000);
            console.log("[CHANGE DETECTED] this.task_sync_.switch_detected: " + this.task_sync_.switch_detected );
            return; 
        }
        
        if (this.task_button_is_pressed && this.task == 1) { // move to task zero 
            this.clear_all();
            
            //this.task_button_is_pressed = false;
            this.user_sphere.opacity(0.001);
            this.isDrawing = false;
            this.user_hand.p = [0, this.W * .4, 0];
            this.user_sphere.identity().move(this.user_hand.p);
            this.strokes = [];
            this.colors = [];
            this.task = 0;
            this.task_sync_.task1_selected = true;
            this.task_sync_.task2_selected = false;
            this.task_sync_.task1_selected_pr = this.task_sync_.task1_selected;
            this.task_sync_.task2_selected_pr = this.task_sync_.task2_selected;

            sr.sync_task( this.task_sync_);
            //Inform ros the task has been switched 
            this.publish_change_of_task();
            clearTimeout(this.task_sync_.timer_task_button_flag); // Clear any existing timer
            this.task_sync_.timer_task_button_flag = setTimeout(() => {
                this.task_button_is_pressed = false;
                this.task_sync_.switch_detected = false;
                console.log('Button pressed flag set to:', this.task_button_is_pressed);
            }, 3000);
           
            return;

    }

    //On the reciever side, the task button is nit pressed thus we are in the switch detected case 
    if (this.task_sync_.switch_detected && this.task == 0) { // move to task one 
        this.user_hand.p = this.robot_pose.position;
        this.user_sphere.move(this.robot_pose.position);
        this.user_sphere.opacity(1.0);
        this.task_sync_.switch_detected = false;
        this.task_button_is_pressed = false;
        this.user_hand.check_on_press = false;
        this.user_hand.in_manipulation_beam = false;
        this.clear_all();
        this.task = 1;
        this.task_sync_.switch_detected = false; //The clients received the change of tasks
        this.task_sync_.task1_selected = false;
        this.task_sync_.task2_selected = true; //task2 -> task 1
        this.task_sync_.task1_selected_pr = this.task_sync_.task1_selected;
        this.task_sync_.task2_selected_pr = this.task_sync_.task2_selected;
        
        //no need to publish
        return;
    }



    if (this.task_sync_.switch_detected && this.task == 1) { // move to task one 
        this.clear_all();
        this.task_sync_.switch_detected = false;
            this.task_button_is_pressed = false;
            this.user_sphere.opacity(0.001);
            this.isDrawing = false;
            this.user_hand.p = [0, this.W * .4, 0];
            this.user_sphere.identity().move(this.user_hand.p);
            this.strokes = [];
            this.colors = [];
            this.task = 0;
            this.task_sync_.switch_detected = false; //The clients received the change of tasks
        this.task_sync_.task1_selected = true; //task1 -> task 0
        this.task_sync_.task2_selected = false; 
        this.task_sync_.task1_selected_pr = this.task_sync_.task1_selected;
        this.task_sync_.task2_selected_pr = this.task_sync_.task2_selected;
            return;
    }
}


    on_release(hand) {
        if (hand == 'right') {
            //This function is made to make possible also for another client to properly reload and change the task
            //if an user press the button 
            
            this.change_task();

            this.take_control();
              
            //Publish the waypoint once it is released to immediately visualize the trajectory from the server
            if (this.task == 0 && this.user_waypoints.w_counter > 0) {
                if (this.waypoint_manipulation){
                    this.strokes = [];
                    this.colors = [];
                    this.strokes.push([]);
                    this.colors.push([]);
                    tm_utils.buildWires(this.strokes, this.strokes, this.wires, this.colors);
                    this.waypoint_manipulation = false;
                }
                //Publish the entire list of waypints 
                this.publish_desired_waypoint();

                //Initilize the array 
           
                if (this.array_init == false) {
                    this.array_init = true;
                //     //Be ready to visualize the traj
                    //this.strokes.push([]);
                    
                }
                this.user_waypoints.w_counter_old = this.user_waypoints.w_counter;
            }

            if (hand == 'left') {
                this.clear_all();
            }

           
            
            this.isDrawing = false;
            this.drag_init = true;
            this.user_hand.check_on_press = false;
            this.user_hand.in_manipulation_beam = false;
            this.user_waypoints.in_manipulation = false;
            this.user_waypoints.in_manipulation_beam = false;

            //The waypoints need to be synchronized since the user needs to inform the clients that the drag action is ended.
            if (this.waypoints_sync_.manipulate){
            this.waypoints_sync_.w_counter = this.user_waypoints.counter;
                this.waypoints_sync_.index = this.user_waypoints.manipulation_index;
                this.waypoints_sync_.manipulate = false;
                this.waypoints_sync_.generate = false;
                this.waypoints_sync_.delete = false;
                this.waypoints_sync_.position = this.user_waypoints.w_pos[this.waypoints_sync_.index];
                sr.sync_waypoints(this.waypoints_sync_);
                this.waypoints_sync_.generate = false;
                this.waypoints_sync_.manipulate = false;
            }
            
        }
        
        this.button_status.on_release = true; 
        sr.update_button_status(this.button_status, this.client_action_sync_);
        this.button_status.on_release = false;


        
    }


 
 

    //clear all the waypoints when switching between a case and another
    //iterate through the children of waypoint_obj and remove all of them through the id.  
    //To remove object the na,e should have attached an id as number to easily find them in the three 
    clear_all() {

        if (this.task == 0) {
            let n_child = this.waypoint_obj.nChildren();
            console.log("n_child: " + n_child);
            for (let n = n_child; n >= 0; n--) {
                let name = 'volatile_waypoint_' + n;
                this.waypoint_obj.remove(n);
                //this.user_waypoints.waypoints_list[n].delete();
            }
            this.user_waypoints.waypoints_list = [];
            this.user_waypoints.w_pos = [];
            this.user_waypoints.T_Wayp_list = [];
            //tm_utils.clearWires(this.wires);
            this.strokes = [];
            this.colors = [];
            this.array_init = false;
            this.user_waypoints.w_counter = 0;
            this.user_waypoints.w_counter_old = 0;

             //Sync that the waypoints have been deleted between the server and the cliemts 
             this.waypoints_sync_.w_counter = this.user_waypoints.w_counter;
             this.waypoints_sync_.generate = false;
             this.waypoints_sync_.delete = false;
             this.waypoints_sync_.manipulate = false;
             this.waypoints_sync_.position = [];
             this.waypoints_sync_.transform_matrix =[];
             sr.sync_waypoints(this.waypoints_sync_);



        } else {
            tm_utils.clearWires(this.wires);
        }
        //Sync that the waypoints have been deleted between the server and the cliemts 
       
       
        
                //Sy nc the new generated waypoint
        this.waypoints_sync_.w_counter = this.user_waypoints.w_counter;
        this.waypoints_sync_.generate = false;
        this.waypoints_sync_.delete = false;
        this.waypoints_sync_.manipulate = false;
        this.waypoints_sync_.position = this.user_hand.p;
        this.waypoints_sync_.transform_matrix = controllerMatrix.right.slice();
        sr.sync_waypoints(this.waypoints_sync_);
        this.waypoints_sync_.generate = false;

    }
    //Get Methods 

}