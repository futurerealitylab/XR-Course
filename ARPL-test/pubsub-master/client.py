import websocket
import ssl
import json
import threading
import numpy as np
import time
from websocket_connection import websocket_connection as webc

#Every time we want to declare a publisher or a sucbscriber it needs to be defined as a thread 
   


def subscriber_threading(socket, web_sub):
    ws = websocket.WebSocketApp(socket, on_open = web_sub.on_open, on_message = web_sub.on_message, on_error=web_sub.on_error)
    ws.run_forever(sslopt={"cert_reqs": ssl.CERT_NONE})
    
def publisher_threading(socket, web_pub):
    #Thread to send the robot pose 
    position_msg = [1.0, 0.0, 0.0]
    orientation_msg = [0.6502878, 0, 0, -0.7596879] #q1,q2,q3,q4
    message = {"position_msg": position_msg, "orientation_msg": orientation_msg}
    web_pub.event = {
            "request": "PUBLISH",
            "type": 'webxr_robot_pos',
            "message": message,
            "ts": 0.1, #time stamp
            "frame_id": 'world', #referred frame
            "channel": web_pub.channel

    }
    ws = websocket.WebSocketApp(socket, on_open = web_pub.on_open_pub)
    ws.run_forever(sslopt={"cert_reqs": ssl.CERT_NONE})


if __name__ == "__main__":
    host = 'localhost'
    port = 8080
    SOCKET = 'ws://localhost:8080/'
    #Instantiate websocket for subscriber 
    channel_ = "user_position"
    type_ = "SUBSCRIBE"
    webs_sub = webc(channel_, type_)
    #Instantiate websocket for publisher 
    channel_ = 'robot_odom'
    type_ = "PUBLISH"
    webs_pub = webc(channel_, type_) #Publishing robot pose for visualization in VR

    wsthread = threading.Thread(target=  subscriber_threading, args = (SOCKET, webs_sub)) #ws.run_forever(sslopt={"cert_reqs": ssl.CERT_NONE}))
    wsthread.start()
    wsthread2 = threading.Thread(target=  publisher_threading, args = (SOCKET, webs_pub)) 
    wsthread2.start()


        