class PubSubManager {
    constructor() {
        this.channels = {
            weather: {
                message: '',
                subscribers: []
            },
            sports: {
                message: '',
                subscribers: []
            },
            
            user_position: {
                type: "webxr_des_pos",
                message: '',
                subscribers: []
            },
            
            robot_odom: {
                type: "webxr_robot_pos",
                message: '',
                subscribers: []
            },

            robot_odom2_1: {
                type: "webxr_robot_pos2_1",
                message: '',
                subscribers: []
            },

            robot_odom2_5: {
                type: "webxr_robot_pos2_5",
                message: '',
                subscribers: []
            },
            
            robot_odom2_8: {
                type: "webxr_robot_pos2_8",
                message: '',
                subscribers: []
            },

            robot_odom2_9: {
                type: "webxr_robot_pos2_9",
                message: '',
                subscribers: []
            },

            static_occupancy: {
                type: "webxr_static_occupancy", // pointcloud data type
                message: '',
                subscribers: []
            },

            final_goal: {
                type: "webxr_final_goal",
                message: '',
                subscribers: []
            },

            mpl_path: {
                type: "webxr_mpl_path",
                message: '',
                subscribers: []
            },
            desired_waypoints: {
                type: "webxr_des_waypoints_list",
                message: '',
                subscribers: []
            },
            
            start_traj: {
                type: "webxr_start_traj",
                message: '', 
                subscribers: []
            },
            
            current_task: {
                type: "webxr_current_task",
                message: '',
                subscribers: []
            },
            take_control: {
                type: "webxr_take_control",
                message: '',
                subscribers: []
            },
            
            desired_traj: {
                type: "webxr_traj",
                message: '',
                subscribers: []
            }
                




        }
        this.brokerId = setInterval(() => { this.broker() }, 1);
    }
    subscribe(subscriber, channel) {
        console.log(` SUBSCRIBE REQUEST  to ${channel}`);
        this.channels[channel].subscribers.push(subscriber);
    }

    removeBroker() {
        clearInterval(this.brokerId);
    }

    async publish(publisher, data) {

        console.log("message: " + data.channel);
        //Type of data we want to transfer
        this.channels[data.channel].type = data.type;
        this.channels[data.channel].message = data.message;
        //this.channels[data.channel].orientation_msg = data.orientation_msg;
        this.channels[data.channel].ts = data.ts;
        this.channels[data.channel].frame_id = data.frame_id;

    }

    broker() {
        for (const channel in this.channels) {
            if (this.channels.hasOwnProperty(channel)) {
                const channelObj = this.channels[channel];
                if (channelObj.message) {
                    //console.log(`found message: ${channelObj.message} in ${channel}`);

                    channelObj.subscribers.forEach(subscriber => {
                        // var message = {position_msg: channelObj.position_msg,  orientation_msg: channelObj.orientation_msg}
                        subscriber.send(JSON.stringify(channelObj.message));
                    });
                    channelObj.message = '';
                    // channelObj.position_msg = '';
                    // channelObj.orientation_msg = '';
                }

            }
        }
    }
}
module.exports = PubSubManager;