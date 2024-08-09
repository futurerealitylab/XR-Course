First, install and configure your Corelink 

To get the pose of the devices from SteamVR:

1. run SteamVR, update device IDs in vivedevicelib.py, make sure all devices are in tracking (serials.txt)

2. run simpleViveWrapperVive:
node wrapperVive.js

3. run emitter
python ./emitter/vivedeviceemitter.py

4. Test connection by listening to the stream:
cd ../../tools/listener
node listenerUDP-lib.js
