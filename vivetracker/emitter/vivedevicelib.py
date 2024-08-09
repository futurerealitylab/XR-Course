"""Library for emitting Vive device data through UDP."""
import json
import sys
import socket
import time

import numpy as np
import openvr
import triad_openvr


# Dictionary, Array loop. Instead of predefine serials. Search for the tracker.

DEFAULT_SERIALS = {
	#"LHB-1C405BDA" : "LIGHTHOUSE_1",
	#"LHB-40CE6F4E" : "LIGHTHOUSE_1",
	"LHB-9EDE8437" : "LIGHTHOUSE_1",
	

	#"LHB-85889B70" : "LIGHTHOUSE_2",
	"LHB-49F4F79E" : "LIGHTHOUSE_2",

	# #"LHR-0ADD38C6" : "ALICE-HMD",    #Label 1, Alice HMD
	# "LHR-0ADD2075" : "ALICE-HMD",     #Label 2, Alice HMD Backup

	# #"LHR-0DDC8DA8" : "RABBIT-HMD",   #Label 4, Rabbit HMD
	#  "LHR-0DC2ED56" : "RABBIT-HMD",    #Label 18, Rabbit HMD Backup

	# # "LHR-0815F319" : "VR1",          #Label 7, VR1 	
	# "LHR-08C154A6" : "VR1",   #Label  10, VR1 Backup

	# # "LHR-09D858C3" : "VR2",          #Label 8, VR2
	# "LHR-0DC62846" : "VR2",    #Label 9, VR2 Backup

	# "LHR-0FC2C068" : "VR3",			 #Label 11, VR3
	# # "LHR-0DC39A0D" : "VR3",    #Label 5, VR3 Backup

	# "LHR-1ADFC413" : "VR4",			 #Label 12, VR4
	# # "LHR-02177405" : "VR4",    #Label 6, VR4 Backup


	# # "LHR-FFA37F43" : "RABBIT-LH",  #BLUE RABBIT LH (iffy)
	# "LHR-FFC35D41" : "RABBIT-RH",   #GREEN RABBIT RH
	#  # "LHR-F7E37F43" : "RABBIT-RH",  #BLUE RABBIT RH
	# # "LHR-FFC37D44" : "RABBIT-RH", #RED RABBIT RH
	# # "LHR-FF4E1946" : "RABBIT-LH", #RED RABBIT LH
	# "LHR-FFC71B42" : "RABBIT-LH",  #PLAIN RABBIT LH

	# "LHR-FF6F9F47" : "ALICE-RH", #YELLOW ALICE LH (iffy)
	# #"LHR-FF9FBD47" : "ALICE-RH", #YELLOW ALICE RH (bad)
	# "LHR-FF7BDB40" : "ALICE-RH", #GREEN ALICE RH
	# "LHR-FFAF3F41" : "ALICE-LH", #PLAIN ALICE LH 

	# #"LHR-FFC35D41" : "",
	# #"LHR-03DF1C85" : "",
	#"LHR-31321081" : "vivetracker",
	
	#"LHR-BD6CE126" : "robot",
	#"LHR-80D6E89A" : "vivetracker",
	"LHR-5A818C85" : "vivetracker",
    "LHR-13F94D6B" : "lefthand",
    "LHR-74A97E0F" : "righthand",
    "LHR-BCA8C984" : "head",

}

def wrtDict(file):
    dict = {}
    with open(file) as f:
        lines = f.readlines()
        for line in lines:
            line = line.replace('\n','')
            line = line.replace(' ', '')
            line = line.split(':')
            dict[line[0]] = line[1]
    return dict


DEFAULT_SERIALS = wrtDict('serials.txt')
print(DEFAULT_SERIALS)

DEFAULT_IP_ADDRESS = '239.255.42.99' #127.0.0.1
DEFAULT_PORT = 1511
DEFAULT_FPS = 120

class ViveDeviceEmitter(object):
	"""TODO: Class docstring."""
	def __init__(self, ip_address=None, port=None,
		fps=None, serials=None):
		self.triad = triad_openvr.triad_openvr()
		self.interval = 1/float(fps) if fps else 1/float(DEFAULT_FPS)
		self.socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
		self.serials = serials or DEFAULT_SERIALS
		self.ip_address = ip_address or DEFAULT_IP_ADDRESS
		self.port = port or DEFAULT_PORT
		self.no_serial_devices = []

		print("Opening socket at IP: {} Port: {}".format(ip_address, port))
		print("Vive Device Emitter will run at {} fps.".format(
			fps or DEFAULT_FPS))
		print("\nSerials:\n{}\n".format(json.dumps(self.serials, indent=2)))
		self.triad.print_discovered_objects()
		
		print()

	def send_data(self):
		"""Send all device data found by Triad at the set interval.
		TODO: Make this run in a separate thread, and make it toggle-able.
		"""
		log_time = time.time()
		while(True):
			start = time.time()
			send_data = {}
			parts = {}
			device_data = {}
			self.serials = wrtDict('serials.txt')
			for device_key in self.triad.devices.keys():
				device = self.triad.devices[device_key]

				# if 'tracker' not in device_key and 'controller' not in device_key:
				# 	continue
				device_data = {}
				device_data['name'] = device_key
				#Populate serial and id fields
				device_serial = device.get_serial()
				if device_serial in self.serials:
					if self.serials[device_serial] in parts:
						old_device = parts[self.serials[device_serial]]
						if old_device.get_pose_quaternion() is None:
							parts.pop(self.serials[device_serial])
							parts[self.serials[device_serial]] = device
							device_data['id'] = self.serials[device_serial]
						else:
							continue
					else:
						parts[self.serials[device_serial]] = device
						device_data['id'] = self.serials[device_serial]
				elif device_serial not in self.no_serial_devices:
					print("Device {} not in serial dictionary!".format(
						device_serial))
					print("Device key: {}".format(device_key))
					self.no_serial_devices.append(device_serial)
					continue

				pose_data = device.get_pose_quaternion()
				pose_data = device.get_pose_quaternion()
				if pose_data is None or (pose_data[0]==0 and pose_data[1]==0 and pose_data[2]==0):
					continue #skip devices listed at <0, 0, 0> as they are untracked.
				else:
					device_data['x']  = -pose_data[0]
					device_data['y']  = pose_data[1]
					device_data['z']  = -pose_data[2]
					device_data['qw'] = pose_data[3]
					device_data['qx'] = -pose_data[4]
					device_data['qy'] = pose_data[5]
					device_data['qz'] = -pose_data[6]
				#device_data['timeStamp'] = log_time[7]

				if 'controller' in device_key:
					result, state = self.triad.vr.getControllerState(device.index)

					device_data['triggerPress'] = 1 if state.ulButtonPressed & (1 << openvr.k_EButton_SteamVR_Trigger) > 0 else 0
					device_data['appMenuPress'] = 1 if state.ulButtonPressed & (1 << openvr.k_EButton_ApplicationMenu) > 0 else 0
					device_data['gripPress'] = 1 if state.ulButtonPressed & (1 << openvr.k_EButton_Grip) > 0 else 0
					device_data['touchpadPress'] = 1 if state.ulButtonPressed & (1 << openvr.k_EButton_SteamVR_Touchpad) > 0 else 0
					#print(device_data)
				if 'id' in device_data:
					send_data[device_key] = device_data

			send_data['time'] = time.time()
			json_data = json.dumps(send_data)


			self.socket.sendto(
				json_data.encode('utf-8'), (self.ip_address, self.port))

			if (time.time() - 1) > log_time:
				log_time = time.time();
				print("Sending @ {}:\n".format(time.strftime('%X %x %Z')))
				for item in sorted(send_data.keys()):
					if item == 'time':
						continue
					print("{}:\t{}".format(item, send_data[item]['id']))
					if 'controller' in item:
						print('Grip: {}\tTrigger: {}\tTouchpad: {}\tAppMenu: {}'.format(
							send_data[item]['gripPress'], send_data[item]['triggerPress'],
							send_data[item]['touchpadPress'], send_data[item]['appMenuPress']
						))
				print()
			#Wipe out the send data.
			send_data = {}
			#Sleep until next valid time.
			sleep_time = self.interval-(time.time() - start)
			if sleep_time > 0:
				time.sleep(sleep_time)
