# NYU-FRL-XR

Software for NYU Future Reality Lab webXR-based XR experience.

# How to setup the environment

install Node.js and npm if you haven't. Then in the command line, do
```sh
npm install
cd server
npm install
source patch
```

# How to run on your local computer

1. At the root folder, do ``./startserver``
2. Go to chrome://flags/ in your Google Chrome browser
3. Search: ***"Insecure origins treated as secure"*** and enable the flag
4. Add http://[your-computer's-ip-address]:2024 to the text box. For example http://10.19.127.1:2024
5. Relaunch the chrome browser on your computer and go to http://localhost:2024

# How to run in VR

1. Run the program locally on your computer
2. Open the browser on your VR headset
3. Go to chrome://flags/
4. Search: ***"Insecure origins treated as secure"*** and enable the flag
5. Add http://[your-computer's-ip-address]:2024 to the text box. For example http://10.19.127.1:2024
7. Relaunch the browser on your VR headset and go to http://[your-computer's-ip-address]:2024 

# How to debug in VR

1. On your Oculus app, go to *Devices*, select your headset from the device list, and wait for it to connect. Then select *Developer Mode* and turn on *Developer Mode*.
2. Connect your quest with your computer using your Oculus Quest cable.
3. Go to chrome://inspect#devices on your computer
4. Go to your VR headset and accept *Allow USB Debugging* when prompted on the headset
5. On the chrome://inspect#devices on your computer, you should be able to see your device under the *Remote Target* and its active programs. You can then inspect the *NYU-FRL-XR* window on your computer.

# How to create your own demo

1. Go to the [scenes folder](https://github.com/futurerealitylab/NYU-FRL-XR/tree/master/js/scenes/) and create a .js file based on the template of [demoSimplest.js](https://github.com/futurerealitylab/NYU-FRL-XR/tree/master/js/scenes/demoSimplest.js)
2. Change the name and the content of the demo to whatever you like!
3. Go to [scenes.js](https://github.com/futurerealitylab/NYU-FRL-XR/tree/master/js/scenes/scenes.js), add the name of your demo and its path to the returned value of [```scenes```](https://github.com/futurerealitylab/NYU-FRL-XR/tree/master/js/scenes/scenes.js#L11)
4. Note that the [```enableSceneReloading```](https://github.com/futurerealitylab/NYU-FRL-XR/tree/master/js/scenes/scenes.js#L10) is set to true so that you can hot-reload the changes in your demo. 

# How to enable your hand-tracking

1. Enable the experimental feature in the browser (Oculus Browser 11)
2. Visit chrome://flags/
3. Enable WebXR experiences with joint tracking (#webxr-hands)
4. Enable WebXR Layers depth sorting (#webxr-depth-sorting)
5. Enable WebXR Layers (#webxr-layers)
6. Enable phase sync support (#webxr-phase-sync)
7. Enable "Auto Enable Hands or Controllers" (Quest Settings (Gear Icon) -> Device -> Hands and Controllers)
8. Enter the VR experience

# Notes on customizing your avatar
1. To change the initial position of your avatar: go to [js/util/inline-viewer-helper.js](https://github.com/futurerealitylab/NYU-FRL-XR/tree/master/js/util/inline-viewer-helper.js) and change the values of [```this.lookYaw```](https://github.com/futurerealitylab/NYU-FRL-XR/tree/master/js/util/inline-viewer-helper.js#L46), [```this.walkPosition```](https://github.com/futurerealitylab/NYU-FRL-XR/tree/master/js/util/inline-viewer-helper.js#L47), [```this.lookPitch```](https://github.com/futurerealitylab/NYU-FRL-XR/tree/master/js/util/inline-viewer-helper.js#L49). Notice that [```this.viewerHeight```](https://github.com/futurerealitylab/NYU-FRL-XR/tree/master/js/util/inline-viewer-helper.js#L50) (the avatar's height) is set to be 1.6m from the [```inlineViewerHelper.setHeight(1.6)```](https://github.com/futurerealitylab/NYU-FRL-XR/tree/master/js/immersive-pre.js#L503) in [js/immersive-pre.js](https://github.com/futurerealitylab/NYU-FRL-XR/tree/master/js/immersive-pre.js). You can change this if you like.
2. To customize your own avatar: go to [js/primitive/avatar.js](https://github.com/futurerealitylab/NYU-FRL-XR/tree/master/js/primitive/avatar.js). You can change the GLTF models used in the [```Headset```](https://github.com/futurerealitylab/NYU-FRL-XR/tree/master/js/primitive/avatar.js#L101) and the [```Controller```](https://github.com/futurerealitylab/NYU-FRL-XR/tree/master/js/primitive/avatar.js#L114) classes. You can add additional arguments to the [```initAvatar```](https://github.com/futurerealitylab/NYU-FRL-XR/tree/master/js/primitive/avatar.js#L8) function to specify the avatar's look, and pass those values from the [```addPawn```](https://github.com/futurerealitylab/NYU-FRL-XR/tree/master/js/util/croquetlib.js#L162) function.

# How to connect an Arduino Camera
1. Get the url you use to stream the camera feed (example: 'http://192.168.1.189/640x480.jpg'), and make sure the computer hosting the server is under the same LAN as the Arducam.
2. Set up the environment by opening the terminal located in the folder and type ```pip install -r requirements.txt``` (or ```pip3 install -r requirements.txt``` based on your version of pip)
3. Replace the url on line 19 of track.py (inside the urlopen() function) with your own url from the Arducam.
4. After starting the server, open the terminal and locate to the current folder, type ```python track.py``` (or ```python3 track.py```)
5. The default information from the camera contains the positional data and the context of the QR code inside the camera feed, if any, and the radius and positional data of the largest green object. To engineer your own CV method, consider the variable ```frame``` inside track.py, it is the pixel data of your current camera feed. After your own engineering, to make communication with the server regarding the new information, wrap the information into a JSON-formatted dictionary and send it by using ```requests.post('http://localhost:2024/your-own-function', json=your-data-dictionary)```. Then under server/main.js, open up a new app.route("/your-own-function").post(function (req, res), make sure to match the name with the name you defined in the python code, and receive the information by ```req.body```.
6. If you're using a different computer for camera feed fetching and processing, make sure to change the url from http://localhost:2024/your-own-function to that of your own server (or the public server).
