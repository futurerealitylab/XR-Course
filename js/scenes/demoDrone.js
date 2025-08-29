import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';
import * as cg from "../render/core/cg.js";
import { G2 } from "../util/g2.js";
import { matchCurves } from "../render/core/matchCurves3D.js";
import { controllerMatrix, buttonState, joyStickState } from "../render/core/controllerInput.js";
import { WS_Sender } from "../util/websocket-sender.js";
import { Task_Manager } from "../util/task-manager.js";
import * as sr from "../util/sync_receiver_utils.js";
import * as ci from "../render/core/controllerInput.js";
import { Gltf2Node } from "../render/nodes/gltf2.js";
import * as global from "../global.js";

// this should be adjusted according to the local ip configuration
// let host = "172.20.10.10";  
let host = "10.20.111.254";
let port = "8080";


let drone = new Gltf2Node({ url: './media/gltf/demoDrone/race_S.gltf' });
let drone2_1 = new Gltf2Node({ url: './media/gltf/demoDrone/race_S.gltf' });
let drone2_5 = new Gltf2Node({ url: './media/gltf/demoDrone/race_S.gltf' });
let drone2_8 = new Gltf2Node({ url: './media/gltf/demoDrone/race_S.gltf' });
let drone2_9 = new Gltf2Node({ url: './media/gltf/demoDrone/race_S.gltf' });



const inch = 0.0254;                  // inches per meter
let W = (15) * inch; // width of one square on the board
let H = W / (100);      // height of the board

// maximum number of the point cloud array
const MAX_Points = 1000; // This can be adjusted to avoid network bandwidth issue

//Define a struct data with all the informatin that the user wish to send over the web
window.task_sync = {
    task_1_selected: false, //the default task is the ball drag
    task_2_selected: false
};
//To broadcast the position of the user ball in Task 0
window.user_ball_sync = {
    position: [0.0, 0.0, 0.0],
}

//To sync the waypoints between multiple users 
window.waypoint_sync = {
    counter: 0,
    index: 0, //Index can be the index related to the new waypoint or the one to delete of delete flag is true
    position: [0.0, 0.0, 0.0],
    transform_matrix: [0.0, 0.0, 0.0],
    generate: false,
    manipulate: false,
    delete: false,
    
}

window.client_action = {
    on_click: false,
    on_release: false, 
    
}




let strokes = []; //Visualize the drone desired trajectory in VR
let isDrawing = false;

//Initialize the class rectangle 
// let localhost = '127.0.0.1';
// let ip = localhost; //"192.168.1.39";
// let port = 8080;


// const ws_sender = new WS_Sender(ip, port);
// //start ws
// var string = "ws://" + ip + ":" + port;
// var ws = new WebSocket(string);
// let connection = false;
//connection = ws_sender.connect();

//Tasks 
//get the Localhost and the port 

let initial_task = 1; // 0 is the drag task. If the user press the butto it switch to task 1 waypoint assignment
//let initial_task = 0; // temporary for debugg purpose
const ts = new Task_Manager(W,H, initial_task, host, port);
let task_button_obj = null;
let task_button = null;
let take_control_button = null;
let take_control_button_obj = null;
let final_goal = null;

export const init = async model => {
    let setSession = false;
    
    const threeRenderer = new THREE.WebGLRenderer({
    canvas: window.canvas,
    context: window.gl,
    alpha: true,
    premultipliedAlpha: false,
    depth: true,
    antialias: true
    });

    threeRenderer.autoClear = false;
    threeRenderer.setClearAlpha(0.0);
    threeRenderer.setClearColor(0x000000, 0);

    const camera = new THREE.PerspectiveCamera();
    const camera2D = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
    model.threeCamera = camera;
    model.threeCamera2D = camera2D;

    // ===== SCENE SETUP =====
    const scene = new THREE.Scene();
    scene.background = null;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(-3, 5, 2);
    scene.add(directionalLight);

    // Test cube — will stay in front of user
    const testBox = new THREE.Mesh(
    new THREE.BoxGeometry(0, 0, 0),
    new THREE.MeshStandardMaterial({ color: 0xff0000 })
    );
    scene.add(testBox);

    const N = 1200;

    // ===== CREATE INSTANCED MESH WITH COLOR =====
    const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0xffffff,
        transparent: true,
        opacity: 1.0 });
    const instancedMesh = new THREE.InstancedMesh(geometry, material, N);
    instancedMesh.frustumCulled = false;
    
    const dummy = new THREE.Object3D();
    const minY = 0;
    const maxY = 3;
    
    // for (let i = 0; i < N; i++) {
    //     const color = new THREE.Color().setHSL(hue, 1.0, 0.5);
    
    //     // colors.push(1, 0, 0); // All red for debug
    //     dummy.position.set(...data[i].p);
    //     dummy.scale.setScalar(data[i].s);
    //     dummy.updateMatrix();
    //     instancedMesh.setMatrixAt(i, dummy.matrix);
    //     instancedMesh.setColorAt(i, color);
    // }
    
    // instancedMesh.instanceMatrix.needsUpdate = true;
    // instancedMesh.instanceColor.needsUpdate = true;
    
    scene.add(instancedMesh);
    instancedMesh.scale.setScalar(0.5);
    //Build the scene
    let plane = model.add();
    plane.opacity(.7).scale(0.5);

    //Texture for traj
    let wires = model.add();
    wires.flag('uWireTexture');

    // Add point cloud container
    let pointCloudContainer = plane.add().label('point_cloud_container');

    //Build a Button to witch between the waypoint task and the drag and place task 
    task_button = new G2(true);
    model.txtrSrc(1, task_button.getCanvas());
    task_button_obj = model.add('cube').txtr(1);

         
    //Build a Button to witch between the waypoint task and the drag and place task 
    
    take_control_button = new G2(true);
    model.txtrSrc(2, take_control_button.getCanvas());
    take_control_button_obj = model.add('cube').txtr(2);
        
    

    // BUILD THE plane where to move the sphere 
    let board = plane.add();
    board.add('cube').move(0, -0.2, 0).scale(5 * W, H / 2, 5 * W).color(.2, .1, .05);
    board.add('cube').move(0, -0.2, 0).scale(4 * W, .01, 4 * W);

    //Let's add the ball marker as parent of the plane 
    let user_sphere = () => plane.add().label('sphere_user').add('sphere').color(1, 0, 0).move(0, 0, 0).scale(W * .2, W * .4, W * .2).parent();
    let user_sphere_ = user_sphere();
    user_sphere_.move(0.0, 0.0, 0.0);
    if (initial_task == 0)
    {
        // the ball should be transparent 
        user_sphere_.opacity(0.001);
    }
    
    //Let's add a cube to represent the robot pose 
    let transparent_robot_cube_model = plane.add().label('robot_cube_anchor').add('cube').opacity(0.001).move(0, 0, 0).scale(0.01, 0.01, 0.01).parent();
    let robot_cube_ =  transparent_robot_cube_model.add().label('robot_cube').add('cube').color(0, 1, 0).move(0, 0, 0).scale(W * .2, W * .2, W * .2).opacity(0.5); // green cube
    let robot_cube = robot_cube_;
    //A sequence of rotation and translation in robot cube results of  sequence of roattion in Body frame. To have 
    //a motion in the world frame the translation needs to be applied to the transparent robot cube, who moves respect the worl frame 
    //robot_cube.turnY(1);
    // drone.translation = [0, 0, -1];

    // Add drone cube for voxl2_1
    let transparent_robot_cube_model2_1 = plane.add().label('robot_cube2_1_anchor').add('cube').opacity(0.001).move(0, 0, 0).scale(0.01, 0.01, 0.01).parent();
    let robot_cube2_1_ = transparent_robot_cube_model2_1.add().label('robot_cube2_1').add('cube').color(0, 0, 1).move(0, 0, 0).scale(W * .2, W * .2, W * .2).opacity(0.5); // Blue cube
    let robot_cube2_1 = robot_cube2_1_;

    // Add drone cube for voxl2_5
    let transparent_robot_cube_model2_5 = plane.add().label('robot_cube2_5_anchor').add('cube').opacity(0.001).move(0, 0, 0).scale(0.01, 0.01, 0.01).parent();
    let robot_cube2_5_ = transparent_robot_cube_model2_5.add().label('robot_cube2_5').add('cube').color(1, 0, 0).move(0, 0, 0).scale(W * .2, W * .2, W * .2).opacity(0.5); // Red cube
    let robot_cube2_5 = robot_cube2_5_;

    // Add drone cube for voxl2_8
    let transparent_robot_cube_model2_8 = plane.add().label('robot_cube2_8_anchor').add('cube').opacity(0.001).move(0, 0, 0).scale(0.01, 0.01, 0.01).parent();
    let robot_cube2_8_ = transparent_robot_cube_model2_8.add().label('robot_cube2_8').add('cube').color(1, 0, 1).move(0, 0, 0).scale(W * .2, W * .2, W * .2).opacity(0.5); // purple cube
    let robot_cube2_8 = robot_cube2_8_;
    
    // Add drone cube for voxl2_9
    let transparent_robot_cube_model2_9 = plane.add().label('robot_cube2_9_anchor').add('cube').opacity(0.001).move(0, 0, 0).scale(0.01, 0.01, 0.01).parent();
    let robot_cube2_9_ = transparent_robot_cube_model2_9.add().label('robot_cube2_9').add('cube').color(0, 1, 1).move(0, 0, 0).scale(W * .2, W * .2, W * .2).opacity(0.5); // cyan cube
    let robot_cube2_9 = robot_cube2_9_;

    // scale the drone glb model
    drone.scale = [0.5, 0.5, 0.5];
    global.gltfRoot.addNode(drone);
 
    drone2_1.scale = [0.5, 0.5, 0.5];
    global.gltfRoot.addNode(drone2_1);

    drone2_5.scale = [0.5, 0.5, 0.5];
    global.gltfRoot.addNode(drone2_5);

    drone2_8.scale = [0.5, 0.5, 0.5];
    global.gltfRoot.addNode(drone2_8);

    drone2_9.scale = [0.5, 0.5, 0.5];
    global.gltfRoot.addNode(drone2_9);
    

    //Represent the axis on the board and on the cube to give the user information about the robot pose 
    let world_x_bar = () => plane.add().label('world_x_axis').add('cube').color(1, 0, 0).move(0.3, 0, 0).scale( .3, .02, .02).parent();
    let x_world_bar = world_x_bar();
    x_world_bar.move(0.0, 0.0, 0.0);
    
    let world_y_bar = () => plane.add().label('world_y_axis').add('cube').color(0, 1, 0).move(0.0, 0, -0.3).scale( .02, .02, .3).parent();
    let y_world_bar = world_y_bar();
    y_world_bar.move(0.0, 0.0, 0.0);

        
    let world_z_bar = () => plane.add().label('world_z_axis').add('cube').color(0, 0, 1).move(0.0, .45, -0.0).scale( .02, .3, .02).parent();
    let z_world_bar = world_z_bar();
    z_world_bar.move(0.0, 0.0, 0.0);
    // console.log("plane.getLabel() " + world_z_bar().getLabel());
    // plane.remove(1);
    //The frames are rigidly attached to the green cube representing the robot as a solid object. The frame follows rigidly the rotation of the cube. 
    //The green cube perform rotation on itself since parent to a transparent object who is parent of the main frame. In this case the green cube can move around the main frame
    //in position still visualizing the euler angles of roll pitch and yaw of the real robot. 

    // //Create robot frame attached to the cube
    let robot_x_bar  = () => robot_cube_.add().label('robot_x_axis').add('cube').color(1, 0, 0).move(1, 0, 0).scale( 1.0, .2, .1).parent();
    let x_robot_bar = robot_x_bar();
    x_robot_bar.move(0.0, 0.0, 0.0);
    x_robot_bar.turnX(0);
    //x_robot_bar.turnZ(10);

    let robot_y_bar = () => robot_cube_.add().label('robot_y_axis').add('cube').color(0, 1, 0).move(0, 0, -1).scale(  0.1, .2, 1.0).parent();
    let y_robot_bar = robot_y_bar();
    y_robot_bar.move(0.0, 0.0, 0.0);

    let robot_z_bar = () => robot_cube_.add().label('robot_z_axis').add('cube').color(0, 0, 1).move(0, 1, 0).scale( 0.1, 1.0, 0.2).parent();
    let z_robot_bar = robot_z_bar();
    z_robot_bar.move(0.0, 0.0, 0.0);
    
    let waypoint_obj = model.add();

    // Function to create/update point cloud visualization
    function updatePointCloudVisualization() {

        if (ts.ws_sender_occupancy && 
            ts.ws_sender_occupancy.static_occupancy && 
            ts.ws_sender_occupancy.static_occupancy.points && 
            ts.ws_sender_occupancy.static_occupancy.points.length > 0) {
            
            const glLayer = window.session?.renderState.layers?.[0] || null;

            if (!setSession && window.session) {
            setSession = true;
            }

            // Save old GL state
            const oldFBO = gl.getParameter(gl.FRAMEBUFFER_BINDING);
            const oldVAO = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
            const oldProgram = gl.getParameter(gl.CURRENT_PROGRAM);
            const oldActiveTexture = gl.getParameter(gl.ACTIVE_TEXTURE);
            const oldArrayBuffer = gl.getParameter(gl.ARRAY_BUFFER_BINDING);

            const points = ts.ws_sender_occupancy.static_occupancy.points; 

            // Algorithm to remove the point if the array size outweights limit
            let limitedPoints = points;
            if (points.length > MAX_Points){
                const pointsToRemove = points.length - MAX_Points;
                limitedPoints = points.slice(pointsToRemove);
            }
            
            // First pass: find height range for color mapping
            let minHeight = Infinity;
            let maxHeight = -Infinity;
            
            for (let i = 0; i < limitedPoints.length; i++) {
                const point = limitedPoints[i];
                const y = point[1];  // Height

                minHeight = Math.min(minHeight, y);
                maxHeight = Math.max(maxHeight, y);
            }
            
            
            function heightToRainbowColor(height, minH, maxH) {
                // Normalize height to 0-1 range
                let normalizedHeight;
                if (maxH === minH) {
                    normalizedHeight = 0.5;
                } else {
                    normalizedHeight = (height - minH) / (maxH - minH);
                }
                
                // Map to hue (RViz rainbow: violet -> blue -> green -> yellow -> red)
                const hue = (1.0 - normalizedHeight) * 0.83; // Reverse and scale
                
                // Simplified HSV to RGB with maximum saturation and brightness
                let r, g, b;
                const i = Math.floor(hue * 6);
                const f = hue * 6 - i;
                const q = 1 - f;
                
                switch (i % 6) {
                    case 0: [r, g, b] = [1, f, 0]; break;      // Red to Yellow
                    case 1: [r, g, b] = [q, 1, 0]; break;      // Yellow to Green  
                    case 2: [r, g, b] = [0, 1, f]; break;      // Green to Cyan
                    case 3: [r, g, b] = [0, q, 1]; break;      // Cyan to Blue
                    case 4: [r, g, b] = [f, 0, 1]; break;      // Blue to Magenta
                    case 5: [r, g, b] = [1, 0, q]; break;      // Magenta to Red
                }
                
                const brightness = 1.2;  
                const saturation = 1.1; 
                
                r = Math.min(1.0, r * brightness * saturation);
                g = Math.min(1.0, g * brightness * saturation);
                b = Math.min(1.0, b * brightness * saturation);
                
                return [r, g, b];
            }


            
            
            for (let i = 0; i < N; i ++) {
                if(i < limitedPoints.length) {
                    const point = limitedPoints[i];
                    const x = point[0];
                    const y = point[1]; 
                    const z = point[2]; 
                    
                    // Calculate rainbow color based on height
                    const color = heightToRainbowColor(y, minHeight, maxHeight);

                    // // Create small voxels for each point with rainbow color
                    // pointCloudContainer.add('cube')
                    //     .move(x, y, z)
                    //     .scale(0.1, 0.1, 0.1)  
                    //     .color(color[0], color[1], color[2])  // Rainbow color based on height
                    //     .opacity(1);
                    const threeColor = new THREE.Color().setRGB(...color);
                    dummy.position.set(x, y, z);
                    dummy.updateMatrix();
                    instancedMesh.setMatrixAt(i, dummy.matrix);
                    instancedMesh.setColorAt(i, threeColor);
                    
                } else {
                    dummy.position.set(9999, 9999, 9999);
                    dummy.updateMatrix();
                    instancedMesh.setMatrixAt(i, dummy.matrix);
                }
 
            }
            instancedMesh.instanceMatrix.needsUpdate = true;
            instancedMesh.instanceColor.needsUpdate = true;
            // ===== IMMERSIVE MODE =====
            if (setSession && glLayer && window._latestXRFrame && window._latestXRRefSpace) {
                const frame = window._latestXRFrame;
                const refSpace = window._latestXRRefSpace;
                const pose = frame.getViewerPose(refSpace);
                if (!pose) return;
        
                gl.bindFramebuffer(gl.FRAMEBUFFER, glLayer.framebuffer);
                threeRenderer.clearDepth();
        
                for (const view of pose.views) {
                const viewport = glLayer.getViewport(view);
                threeRenderer.setViewport(viewport.x, viewport.y, viewport.width, viewport.height);
        
                // Update camera for this eye
                camera.projectionMatrix.fromArray(view.projectionMatrix);
                const viewMatrix = new THREE.Matrix4().fromArray(view.transform.inverse.matrix);
                const worldMatrix = new THREE.Matrix4().copy(viewMatrix).invert();
                camera.matrix.fromArray(worldMatrix.elements);
                camera.matrix.decompose(camera.position, camera.quaternion, camera.scale);
        
                // Keep cube in front of camera
                const forward = new THREE.Vector3(0, 0, -1.5);
                forward.applyQuaternion(camera.quaternion);
                testBox.position.copy(camera.position).add(forward);
        
                // Render this eye
                threeRenderer.render(scene, camera);
                }
            }
        
            // ===== NON-IMMERSIVE MODE =====
            else {
                const xrBaseLayer = window.session?.renderState.baseLayer;
                if (xrBaseLayer) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, xrBaseLayer.framebuffer);
                }
                if (gl.bindVertexArray) gl.bindVertexArray(null);
                gl.useProgram(null);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);
                threeRenderer.clearDepth();
        
                // Camera from Clay
                const viewMatrix = clay.root().viewMatrix(0);
                const view = new THREE.Matrix4().fromArray(viewMatrix);
                const world = new THREE.Matrix4().copy(view).invert();
                model.threeCamera2D.matrix.fromArray(world.elements);
                model.threeCamera2D.matrix.decompose(
                model.threeCamera2D.position,
                model.threeCamera2D.quaternion,
                model.threeCamera2D.scale
                );
        
                // Keep cube in front of camera
                const forward = new THREE.Vector3(0, 0, -1.5);
                forward.applyQuaternion(model.threeCamera2D.quaternion);
                testBox.position.copy(model.threeCamera2D.position).add(forward);
        
                threeRenderer.render(scene, camera2D);
            }
        
            // Restore old GL state
            gl.useProgram(oldProgram);
            gl.bindFramebuffer(gl.FRAMEBUFFER, oldFBO);
            gl.bindBuffer(gl.ARRAY_BUFFER, oldArrayBuffer);
            if (gl.bindVertexArray && oldVAO) gl.bindVertexArray(oldVAO);
            gl.activeTexture(oldActiveTexture);
            // console.log(`Point cloud updated: ${Math.floor(points.length / skipPoints)} points visualized`);
            // console.log(`Height range: ${minHeight.toFixed(2)} to ${maxHeight.toFixed(2)}`);
        }
    }


    // Function to visualize the final goal
    
    function updateFinalGoalVisualization() {
        if (ts.ws_sender_goal && 
            ts.ws_sender_goal.final_goal && 
            ts.ws_sender_goal.final_goal.location) {
            
            // const finalGoalPosition = ts.ws_sender_goal.final_goal.location;
            const finalGoalPosition = [ts.ws_sender_goal.final_goal.location[0] * 0.5,
                ts.ws_sender_goal.final_goal.location[1] * 0.5,
                ts.ws_sender_goal.final_goal.location[2] * 0.5]; 

            

            // Final goal
            if (!finalGoalPosition){
                return;
            }else if(finalGoalPosition[0] === 0 && finalGoalPosition[1] === 0 && finalGoalPosition[2] === 0){
                final_goal = model.add('sphere').color(1, 1, 1).move(0.0, 0.0, 0.0).scale(0);
            } else{
                final_goal = model.add('sphere').color(0.8, 0, 0).move(finalGoalPosition[0], finalGoalPosition[1], finalGoalPosition[2]).scale(0.075);
            }
        }
        
    }

    // task_button
    task_button.setColor('#ff80ff80');
    task_button.fillRect(0,0,1,1);
    task_button.setColor('#ff80ff');
    task_button.textHeight(.1);
    task_button.fillText('Click', .35, .75, 'left');
    task_button.fillText('to change', .3, .55, 'left');
    task_button.fillText('Task', .35, 0.35, 'left');
       
    task_button.setFont('helvetica');
    task_button.textHeight(.05);
    task_button_obj.identity().label('task_button').move(0.1,1.5,-2.0).turnY(0).scale(1,1, .0001);

    // take_control_button
    take_control_button.setColor('#8B0000');
    take_control_button.fillRect(0,0,1,1);
    take_control_button.setColor('#ff80ff');
    take_control_button.textHeight(.1);
    take_control_button.fillText('Click', .4, .75, 'left');
    take_control_button.fillText('to Take', .34, .55, 'left');
    take_control_button.fillText('Control', .35, 0.35, 'left');
       
    take_control_button.setFont('helvetica');
    take_control_button.textHeight(.05);
    take_control_button_obj.identity().label('take_control_button').move(-1.1,1.5,-2.0).turnY(0).scale(1,1, .0001);

    
    ts.set_objects(model, plane, wires, board, user_sphere_, 
        
        robot_cube, robot_cube2_1, robot_cube2_5, robot_cube2_8, robot_cube2_9, 
        
        drone,  drone2_1, drone2_5, drone2_8, drone2_9, 
        
        transparent_robot_cube_model, 
        transparent_robot_cube_model2_1, transparent_robot_cube_model2_5,
        transparent_robot_cube_model2_8, transparent_robot_cube_model2_9,

        task_button_obj, take_control_button_obj,  waypoint_obj);
    
   
    
   
    let squareAt = { left: -1, right: -1 };
    // WHILE TRIGGER IS NOT PRESSED, KEEP TRACK OF Hand Motion
    let findHandTracking = hand => {
        let rightTrigger = buttonState.right[0].pressed;
        ts.find_hand_tracking(hand, rightTrigger);
       
    }
    inputEvents.onMove = hand => squareAt[hand] = findHandTracking(hand);
    
    //When the user press the trigger of the left hand, the ball goes to the user position.
    //(This in future needs to be improved, to just drag the ball with the actual offset from the hand motion, like a sort of raycast, to avoid step update in the desired position )
    inputEvents.onPress = (hand) => {
        
        ts.task_sync_.task_broadcaster = task_sync;
        ts.user_ball_sync_.sync_broadcaster = user_ball_sync;
        ts.waypoints_sync_.sync_broadcaster = waypoint_sync;
        ts.client_action_sync_.sync_broadcaster = client_action;
        ts.on_press(hand, plane, H,W);
       
    }

        //While on drag the ball needs to follow the user hand motion 
        inputEvents.onDrag = hand => {
            ts.on_drag(hand);
            
        }
       
    

        inputEvents.onClick = hand => {
            //Provide the task sync broadcaster to ts class and then to tm_utils 
            ts.on_click(hand);
            
        } 


        inputEvents.onRelease = hand => {
            ts.on_release(hand);
        
        }
    


 

    model.animate(() => {
        updatePointCloudVisualization();
        //Sync Task change 
        task_sync = server.synchronize('task_sync');
        sr.update_task_receiver(ts, task_sync);
        //Sync user ball position o
        user_ball_sync = server.synchronize('user_ball_sync');
        sr.update_ball_sync_receiver(ts, user_ball_sync);
        //Sync waypoints generated 
        waypoint_sync = server.synchronize('waypoint_sync');
        sr.update_waypoints_sync_receiver(ts, waypoint_sync);
        //Record client action 
        client_action = server.synchronize('client_action');
        sr.update_client_action(ts, client_action);
 
        ts.t_odom_update();
        updateFinalGoalVisualization();
       


});



}




