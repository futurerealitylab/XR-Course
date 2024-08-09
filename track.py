import math
import cv2
import numpy as np

from collections import deque
import imutils

import requests
import urllib.request

from ultralytics import YOLO

device_ID = 0
timestep = 0
num_users = 4

cam_w = 640
cam_h = 480
cam_m = math.sqrt(cam_w**2+cam_h**2)

focal_length = 0.0036
fov = 65
qr_l_real = 0.09525

cam_l = focal_length*math.tan(fov/2*math.pi/180)*2

detector = cv2.QRCodeDetector()

model = YOLO("yolov8s.pt")
objs = ["dining table","bench","chair"]

# mode = ["qr_code","object_detection"]
mode = ["qr_code"]

# Stereocamera debug
vid = cv2.VideoCapture(0)

while(True):
    #frame: 1280x960
    #req = urllib.request.urlopen('http://192.168.1.189/640x480.jpg')
    #arr = np.asarray(bytearray(req.read()), dtype=np.uint8)
    #frame = cv2.imdecode(arr, -1)
    _, frame = vid.read()
    frame = cv2.resize(frame[:,0:1280,:], dsize=(640,480), interpolation=cv2.INTER_CUBIC)
    #frame = cv2.flip(frame, -1)

    #====================QR CODE DETECTION====================#
    if "qr_code" in mode:
        try:
            data, bbox, _ = detector.detectAndDecode(frame)
        except:
            data = None
            bbox = None

        if data:
            box = bbox.flatten().tolist()
            point_1 = [box[0],box[1]]
            point_2 = [box[2],box[3]]
            point_3 = [box[4],box[5]]
            point_4 = [box[6],box[7]]
            center = [(point_1[0]+point_2[0]+point_3[0]+point_4[0])/2,(point_1[1]+point_2[1]+point_3[1]+point_4[1])/2]
            turn_x = (center[0]-cam_m/2)/(cam_m/2)*fov*math.pi/180
            turn_y = (center[1]-cam_m/2)/(cam_m/2)*fov*math.pi/180
        
            qr_l = (math.dist(point_1,point_2)+math.dist(point_3,point_4))/2
            distance = focal_length*(qr_l_real/(cam_l*qr_l/cam_m))
            qrinfo = {'ID':device_ID,'data':data,'angle':[turn_x,turn_y],'distance':distance}
        else:
            qrinfo = {'ID':device_ID,'data':"no qrcode",'angle':[-1,-1],'distance':-1}
        res = requests.post('http://localhost:2024/qrcode-python', json=qrinfo)
    #====================QR CODE DETECTION====================#
            
    #==================GREEN BALL DETECTION===================#       
    if "green_ball" in mode:
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        #minimum and maximum hsv value for green color
        gmin = np.array([25,52,72])
        gmax = np.array([102,255,255])
    
        g_clamp = cv2.inRange(hsv,gmin,gmax)
        g_clamp = cv2.erode(g_clamp, None, iterations=2)
        g_clamp = cv2.dilate(g_clamp, None, iterations=2)

        cnts = cv2.findContours(g_clamp.copy(), cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
        cnts = imutils.grab_contours(cnts)
        center = (-1,-1)

        position = []
        radii = []
    
        if len(cnts) > num_users:
            cnts = sorted(cnts, key=cv2.contourArea)
            for i in range(num_users):
                c = cnts[-i]
                ((x, y), radius) = cv2.minEnclosingCircle(c)
                if radius > 10:
                    position.append(x)
                    position.append(y)
                    radii.append(radius)

        if len(radii) > 0:
            index = -1
            rmax = -1
            for i in range(0,len(radii)):
                #print(distances[i])
                if radii[i] > rmax:
                    rmax = radii[i]
                    index = i
            gbinfo = {'ID':device_ID,'radius':rmax,'position':[position[index*2],position[index*2+1]]}
        else:
            gbinfo = {'ID':device_ID,'radius':-1,'position':[]}
        res = requests.post('http://localhost:2024/greenball-python', json=gbinfo)
    #==================GREEN BALL DETECTION===================#

    #=====================OBJECT DETECTION====================#
    if "object_detection" in mode:
        results = model.predict([frame],save=False)
        if len(results[0].boxes.cls) > 0:
            objinfo = {}
            for i in range(len(results[0].boxes.cls)):
                if results[0].names[int(results[0].boxes.cls[i].item())] in objs:
                    x1 = float(results[0].boxes.xyxy[i][0])
                    x2 = float(results[0].boxes.xyxy[i][2])
                    y1 = float(results[0].boxes.xyxy[i][1])
                    y2 = float(results[0].boxes.xyxy[i][3])
                    center = [(x1+x2)/2,(y1+y2)/2]
                    turn_x = (center[0]-cam_m/2)/(cam_m/2)*fov*math.pi/180
                    turn_y = (center[1]-cam_m/2)/(cam_m/2)*fov*math.pi/180
                    objinfo[results[0].names[int(results[0].boxes.cls[i].item())]] = [turn_x,turn_y]
            if objinfo:
                res = requests.post('http://localhost:2024/obj-python', json=objinfo)

    #=====================OBJECT DETECTION====================#    
    timestep += 1
    cv2.imshow("frame",frame)
    cv2.waitKey(1)

