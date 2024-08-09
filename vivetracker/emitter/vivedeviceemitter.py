import argparse
import json

import vivedevicelib

def emit(ip, port, fps, serials):
	serials = json.loads(serials) #Convert to dictionary
	emitter = vivedevicelib.ViveDeviceEmitter(ip, port, fps, serials)
	emitter.send_data()

def main():
	parser = argparse.ArgumentParser()

	parser.add_argument("--ip", type=str,
		default=vivedevicelib.DEFAULT_IP_ADDRESS,
		help="IP address to unicast the data to.")
	parser.add_argument("--port", type=int,
		default=vivedevicelib.DEFAULT_PORT,
		help="Port to unicast the data through.")
	parser.add_argument("--fps", type=int,
		default=vivedevicelib.DEFAULT_FPS,
		help="Frames per second to send at.")
	parser.add_argument("--serials", type=str,
		default=json.dumps(vivedevicelib.DEFAULT_SERIALS),
		help="The serial to id dictionary to use.")

	args = parser.parse_args()

	print("check")
	emit(args.ip, args.port, args.fps, args.serials)


if __name__ == "__main__":
	main()
