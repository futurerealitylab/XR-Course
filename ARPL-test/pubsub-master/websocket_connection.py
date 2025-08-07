import websocket
import ssl
import json
import threading
import numpy as np
import time

class websocket_connection(object):
    def __init__(self, channel_, type_):
        #Channel: The topic name to subscribe
        #type: Publish or subscribe
        self.channel = channel_
        self.event = {
        "request": type_,  #or Publish depends the type of desired connection
        "message": '',
        "channel": self.channel,
        }
        self.message = '' #Type of message to send as publisher (can be customized in the function )


    def on_open(self, ws):
        #This function fired up the communication asking to connect as a subscriber
        print('Opened Connection')
        ws.send(json.dumps(self.event))

    

    def on_open_pub(self, ws_):
        #This fucntion ask the cinnection as a publisher 
        print('Opened Publisher Connection')
        ws_.send(json.dumps(self.event))
        
        print("Sending Message")
        ws_.send(json.dumps(self.event))
        time.sleep(0.1)

    def on_message(self, ws, message):
        print('Waiting for new Messages')
        event = json.loads(message) 
        print(event)

    def on_close(self, ws):
        print('Closed Connection')
        ws.close()

    def on_error(self, ws, err):
       print("Got a an error: ", err)