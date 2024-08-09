## License: Apache 2.0. See LICENSE file in root directory.
## Copyright(c) 2015-2017 Intel Corporation. All Rights Reserved.

###############################################
##      Open CV and Numpy integration        ##
###############################################

# From Connor
# - line 205 & 206 define a "border" that gets cropped off. Currently, 128px are chopped off the top and bottom of the image, and 96 are chopped off from the sides. You can reduce that if you are closer to your camera than I am (although I think Realsense suggest a minimum of 1m -- this could also explain some of the detail cutoff you see in the above image if you are close to it).
# - line 237 calls a function called process_frame. The last parameter is the maximum number of points it will take. If there are more than that many available points to send, it randomly samples to get down to the parameter. It's currently 10k.
# - line 131 has a "maxVal" param that is the maximum distance (in mm) from the camera, anything further than that will get discarded to get rid of background noise. Currently set to 2000 = 2m.

import pyrealsense2 as rs
import numpy as np
import cv2

import sys
import socket
import pickle
import json
import struct
import threading
import time
import random
from math import ceil, floor

IP = '127.0.0.1'
# IP = "128.122.215.23"
portTCP = 20010
#PORT = 20011

# toggle this to either stream through Corelink or write to a file.
WRITE_TO_FILE = False

username = "Testuser"
password = "Testpassword"

BUFFERSIZE = 1024

try:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
except socket.error as e:
    print("Error creating socket: %s" % e)
    sys.exit(1)


try:
    s.connect((IP, portTCP))
except socket.gaierror as e:
    print("Address-related error connecting to server: %s" % e)
    sys.exit(1)
except socket.error as e:
    print("Connection error: %s" % e)
    sys.exit(1)


try:
    s.sendall(('{"function":"auth","username":"'+username+'","password":"'+password+'"}').encode())
except socket.error as e:
    print("Error sending data %s" % e)
    sys.exit(1)

try:
    data = s.recv(BUFFERSIZE)
    token = json.loads(data.decode("utf-8"))['token']
    sourceIP = json.loads(data.decode("utf-8"))['IP']

    s.send(('{"function":"sender","workspace":"Chalktalk","proto":"tcp","IP":"'+str(sourceIP)+'","port":0,"type":"sync","token":"'+token+'"}').encode())
    data = s.recv(BUFFERSIZE)

    streamID = json.loads(data.decode("utf-8"))['streamID']
    port = json.loads(data.decode("utf-8"))['port']
except socket.error as e:
    print("Error receiving data: %s" % e)
    sys.exit(1)

tcp = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
tcp.connect((IP, port))
time.sleep(3)

def sendMessage(message, pacNum, totalPac, frame):
    pac = str(pacNum)+'/'+str(totalPac)
    header = {
        "packet" : pac,
        "frame" : frame
    }
    header = json.dumps(header).encode("utf-8")
    header_size = len(header)
    header_size = struct.pack('<H', header_size)
    data_size = struct.pack('<H', len(message))
    streamID_send = struct.pack('<L', streamID)
    tcp.sendall(header_size+data_size+streamID_send+header+message)
    # tcp.sendall(message)
    #print(f"Sent: {header_size+data_size+streamID_send+header}, Length: {len(header_size+data_size+streamID_send+header+message)}")
'''
def sendString():
    try:
        i=1
        while i < 16:
            sendMessage(bytes(str(i).encode("utf-8")), i)
            i=i+1
    except KeyboardInterrupt:
        print("interrupt received")

while True:
    t = threading.Thread(target = sendString)
    t.start()
    time.sleep(1)
'''
def rescale(frame, percent=75):
    width = int(frame.shape[1] * percent/ 100)
    height = int(frame.shape[0] * percent/ 100)
    dim = (width, height)
    return cv2.resize(frame, dim, interpolation =cv2.INTER_AREA)

def sendVideo(data, frame):
    bytes_sent = 0
    packet = 1
    bytes_per_packet = 57642
    totalPac = ceil(len(data) / bytes_per_packet)
    while bytes_sent < len(data):
        start = bytes_sent
        bytes_sent += bytes_per_packet
        if bytes_sent > len(data):
            bytes_sent = len(data)
        sendMessage(data[start:bytes_sent], packet, totalPac, frame)
        packet += 1
        # time.sleep(1) # debugging purposes
    sys.exit(1)


def process_frame(depth_image, color_image, maxPoints):
    height = depth_image.shape[0]
    width = depth_image.shape[1]
    # max depth ~2m
    maxVal = 2000
    arr = []
    flatdepth = depth_image.flatten()
    vals = np.where(flatdepth < maxVal, flatdepth, 0)
    
    # remove all zero-depth pixels (shadows, artifacts, etc.)
    # then, convert this into indices of a 1D sparse vector
    indices = vals.nonzero()[0]
    d = depth_image.flatten()[indices]
    f_x = lambda x: x % width
    f_y = lambda x: height - floor(x / width)
    x = np.array([f_x(idx) for idx in indices])
    y = np.array([f_y(idx) for idx in indices])
    r = (color_image[:,:,2].flatten())[indices - 20]
    g = (color_image[:,:,1].flatten())[indices - 20]
    b = (color_image[:,:,0].flatten())[indices - 20]
    frame = np.matrix([x, y, d, r, g, b], dtype='<u2')
    frame = np.transpose(frame)

    # if there are more than this many valid points,
    # then we randomly sample to not send/write too much data
    if len(frame) > maxPoints:
        frame = frame[np.random.choice(frame.shape[0], maxPoints, replace=False), :]

    frame = frame.flatten()
    return frame[0].tobytes()

# cap = cv2.VideoCapture(0)
# cap.set(3, 640)
# cap.set(4, 480)

# while cv2.waitKey(1) & 0xFF != ord('q'):
#     success, img = cap.read()
#     cv2.imshow("Sender", img)
#     data = pickle.dumps(rescale(img, 50))
#     t = threading.Thread(target = sendVideo, args = [data])
#     t.start()
#     # time.sleep(5) # debugging purposes
    
# cap.release()
# cv2.destroyAllWindows()


# Configure depth and color streams
pipeline = rs.pipeline()
config = rs.config()

# Get device product line for setting a supporting resolution
pipeline_wrapper = rs.pipeline_wrapper(pipeline)
pipeline_profile = config.resolve(pipeline_wrapper)
device = pipeline_profile.get_device()
device_product_line = str(device.get_info(rs.camera_info.product_line))

config.enable_stream(rs.stream.depth, 640, 480, rs.format.z16, 30)

if device_product_line == 'L500':
    config.enable_stream(rs.stream.color, 960, 540, rs.format.bgr8, 30)
else:
    config.enable_stream(rs.stream.color, 640, 480, rs.format.bgr8, 30)

# Start streaming
pipeline.start(config)
color_images = []
depth_images = []
frameNum = 0
try:
    while True:
        print("frame",frameNum,"\n")
        # Wait for a coherent pair of frames: depth and color
        frames = pipeline.wait_for_frames()
        depth_frame = frames.get_depth_frame()
        color_frame = frames.get_color_frame()
        if not depth_frame or not color_frame:
            continue
        hborder = 128
        vborder = 96
        # Convert images to numpy arrays
        depth_image = np.asanyarray(depth_frame.get_data())[vborder:-vborder,hborder:-hborder]
        color_image = np.asanyarray(color_frame.get_data())[vborder:-vborder,hborder:-hborder,:]

        # Apply colormap on depth image (image must be converted to 8-bit per pixel first)
        depth_colormap = cv2.applyColorMap(cv2.convertScaleAbs(depth_image, alpha=0.03), cv2.COLORMAP_JET)

        depth_colormap_dim = depth_colormap.shape
        color_colormap_dim = color_image.shape
        resized_color_image = color_image

        # If depth and color resolutions are different, resize color image to match depth image for display
        if depth_colormap_dim != color_colormap_dim:
            resized_color_image = cv2.resize(color_image, dsize=(depth_colormap_dim[1], depth_colormap_dim[0]), interpolation=cv2.INTER_AREA)
            images = np.hstack((resized_color_image, depth_colormap))
        else:
            images = np.hstack((color_image, depth_colormap))
        # sendMessage("testtest", 1)
        
        if WRITE_TO_FILE:
            color_images.append(color_image.tolist())
            depth_images.append(depth_image.tolist())
        else:
            # data = pickle.dumps(rescale(depth_frame, 50))
            # data = {}
            # data["type"] = "realsense"
            # data["username"] = username
            # data["frame"] = process_frame(depth_image, color_image, 10000)
            # dataJson = json.dumps(data).encode("utf-8")
            #t = threading.Thread(target = sendVideo, args = [dataJson, frameNum])
            data = process_frame(depth_image, color_image, 10000)
            t = threading.Thread(target = sendVideo, args = [data, frameNum])
            t.start()
        # Show images
        cv2.namedWindow('RealSense', cv2.WINDOW_AUTOSIZE)
        cv2.imshow('RealSense', images)
        frameNum += 1
        k = cv2.waitKey(1)
        if k == 27:
            break

finally:

    # Stop streaming
    pipeline.stop()
    if WRITE_TO_FILE:
        allframes = []
        for i in range(len(color_images)):
            allframes.append(process_frame(np.asarray(depth_images[i]), np.asarray(color_images[i]), 10000))
        f = open("realsensedata.js", "w")
        f.write(json.dumps(allframes))
        f.close()
