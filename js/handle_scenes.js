// import globally-available sub-systems
import * as global from "./global.js";
import { ControllerBeam } from "./render/core/controllerInput.js";
import { Gltf2Node } from "../js/render/nodes/gltf2.js";
import { stopLoopingSound } from "./util/positional-audio.js";
import { stopAllSounds } from "./util/spatial-audio.js";
import { stopStereoLoopingAudio } from "./util/stereo-audio.js";



window.currentName = '';
window.currentID   = -1;

// scene state

let currentDemo = null;
let curDemoEnv = [];
let defaultBackground = "./media/gltf/60_fifth_ave/60_fifth_ave.gltf";
let scenesInit = false;
let idToScene = new Map();
let nameToScene = new Map();
let nextSceneID = 0;
let sceneNames = [];
let sceneList  = [];
let publicScenes = [];

export let lcb, rcb;

let enableSceneReloading = true;

window.toggleHeader = () => {
   window.isHeader = !window.isHeader;
   header.style.position = 'absolute';
   header.style.left = window.isHeader ? '8px' : '-1000px';
}

const chooseFlag = name => {

   console.log('CALLING CHOOSEFLAG', name);

   if (name == null || name == undefined) {
      return;
   }
   
   // stopDemo(nameToScene.get(name));
   if(currentDemo) stopDemo(currentDemo);
   
   let flag = name => 'demo' + name + 'State';
   let names = global.demoNames().split(',').map(item => item.trim());
   for (let n = 0 ; n < names.length ; n++) {
      window[flag(names[n])] = name == names[n] && currentName != names[n];
   }
   if (window[flag(name)]) {
      const entry = nameToScene.get(name);
      if (entry) {
         window.currentName = name;
         window.currentID = entry.id;
      } else {
         window.currentName = '';
         window.currentID = -1;
         console.error("Scene should be valid!\n");
      }
   } else {
      window.currentName = '';
      window.currentID = -1;
   }
}
window.chooseFlag = chooseFlag;

export const onReloadDefault = async (thisScene, model, ctx, ctxForever) => {
   model.clear();
   global.gltfRoot.clearNodes();
   delete window.onSpeech;
   window.customShader = '';
   window.clay.clayPgm.program = null;
   if (thisScene.init) {
      return thisScene.init(model, ctx, ctxForever);
   } else {
      return;
   }
}

window.isSpeechRecognitionEnabled = false;

window.toggleSpeechRecognition = () => {
   isSpeechRecognitionEnabled = ! isSpeechRecognitionEnabled;
   console.log('isSpeechRecognitionEnabled =', isSpeechRecognitionEnabled);
   srButton.innerHTML = (isSpeechRecognitionEnabled ? 'Disable' : 'Enable') + ' speech recognition';
}

window.reloadCurrentScene = () => {
   // NOTE(KTR): re-adding the rapid development / live coding feature for whenever it's convenient. :)
   // enabled a flag "enableSceneReloading : true" set on the config object in scenes.js
   if (currentDemo != null) {
      console.log("reloading: ", currentDemo.name, " with modificationCount: ", currentDemo.modificationCount);
      loadScene(currentDemo).then(() => {
         const prevIsValid = currentDemo.isValid;
         if (currentDemo.world.onReload) {

            currentDemo.isValid = false;
            currentDemo.world.onReload(
               currentDemo.world,
               clay.model, currentDemo.ctx, currentDemo.ctxForever
            ).then(() => {
               currentDemo.isValid = prevIsValid;
            }).catch((err) => {
               console.error(err.message, err.stack);      
               console.error("error in onReload()");               
            });
         } else {
            // default behavior is to do a clean-wipe of the demo scene
            currentDemo.isValid = false;
            onReloadDefault(
               currentDemo.world, 
               clay.model, currentDemo.ctx, currentDemo.ctxForever
            ).then(() => {
               currentDemo.isValid = prevIsValid;
            }).catch((err) => {
               console.error(err.message, err.stack);      
               console.error("error in onReloadDefault() -> init()");
            });
         }
      }).catch((err) => {
         console.error(err.message, err.stack);
      });
   }
}

window.demoButtons = new Map();
window.showPrivateScenes = false;
window.isMenuClosed = true;

window.guideStates =[];
//guideStates.push(window.onlyScene ? '0,' + onlyScene : '0,tabletop');
window.useGuide = true;

const addDemoButtons = (demoNames, scenesInit) => {

   let names = demoNames.split(',').map(item => item.trim());
   
   if (names.length == 0 || names[0] == '') {
      return;
   }

   global.setDemoNames(demoNames);

   let header = document.getElementById("header");
   window["getSceneFlagByID"] = {};
   window["setSceneFlagByID"] = {};

   if (!scenesInit && ! window.onlyScene) {
      clay.vrWidgets.add('label').info('<open>')
                                 .move(-1,1.7+.1,-.7)
                                 .turnY(Math.PI/6)
                                 .scale(.045);
      /*
      clay.vrWidgets.add('label').info('<guide>')
                                 .move(-1.75,1.7+.1,-.7)
                                 .turnY(Math.PI/6)
                                 .scale(.045);
      */
      let title = clay.model.add()
      .move(-1,1.7+.3,-.7)
      .turnY(Math.PI/6)
      .scale(.4)
      .textBox('', .05);
   }

   if (window.onlyScene)
      header.style.maxWidth = '176px';

   if (! window.onlyScene)
      header.innerHTML += `
         <details closed>
           <dev id=messages>&nbsp;</dev><br><dev id=sceneButtons></dev>
         </details>`;

   for (let n = 0; n < names.length; n++) {
      demoButtons.set(names[n], publicScenes.includes(names[n]));
      let flag = 'demo' + names[n] + 'State';
      window[flag] = 0;
      window["getSceneFlagByID"]["" + n] = function() { return window[flag]; };
      window["setSceneFlagByID"]["" + n] = function(f) { window[flag] = f; };
      if(!scenesInit && ! window.onlyScene) {
         if (!names[n] != "Speak") {
            header.innerHTML += '<button onclick=chooseFlag("' + names[n] + '");'
                    + 'window.syncDemos();>' + names[n] + '</button>';
            let label = clay.vrWidgets.add('label').info(names[n])
                                                   .move(-1,1.7-n*.1,-.7)
                                                   .turnY(Math.PI/6)
                                                   .scale(.045);
         }
         else {
            header.innerHTML += '<button id=\"Speak\" onclick=\"window.' + flag + '=!window.' + flag
            + ';window.muteSelf()\">' + names[n] + '</button>';
         }
      }
   }

   if(!scenesInit) {
      lcb = new ControllerBeam(clay.vrWidgets, 'left');
      rcb = new ControllerBeam(clay.vrWidgets, 'right');

      if (! window.onlyScene) {
         header.innerHTML += "<br>";
         // NOTE(KTR): for code-reloading during development / for permanent changes
         // for performing some code changes that should not edit the code permanently,
         // this is where we can use new Function(...) in some way
         if (enableSceneReloading) {
            // use a button
            header.innerHTML += '<button onclick=reloadCurrentScene();>Reload</button>';

            // or automatically reload if you exit and re-enter the window

            window.addEventListener("focus", (event) => { 
               window.reloadCurrentScene();
            }, false);
            // or eventually the server should just tell the application when a file has changed
            // TODO: 
            // ...
         }
         header.innerHTML += '<button id=srButton onclick=toggleSpeechRecognition();>Enable speech recognition</button><BR>';
      }

      const xrEntryUI = global.xrEntryUI();
      header.appendChild(xrEntryUI.domElement);
   }

}

// registers a scene to the list
function addScene(name, path, background) {
   sceneNames.push(name);
   const id = nextSceneID;
   nextSceneID += 1;
   const entry = {
      // id of the scene demo
      id : id, 
      // its readable name
      name : name, 
      // local path with respect to js/scenes/
      localPath: path,
      // number of times this scene demo was modified at-runtime
      modificationCount : 1,
      // stateful context useful for live reloading,
      // refreshed on each init
      ctx : {},
      // stateful context that exists for the 
      // entire lifetime of the scene demo, even after multiple inits
      ctxForever : {},

      background : background,
      loadGLTF : false,
      envInd : null,

   };
   sceneList.push(entry);

   idToScene.set(entry.id, entry);
   nameToScene.set(entry.name, entry);
}

// load scenes asynchronously via dynamic import
async function loadScene(info) {
   inputEvents.flip(false);
   let wasValid = (info.isValid == true);
   if (info.isValid == undefined) {
      info.isValid = false;
   }
   // dynamically import client module code,
   // must append a unique query string to force-reload rather than use
   // a previous cached version of the file
   return import(info.localPath + "?modid=" + info.modificationCount + "_" + (Date.now() / 1000)).then((worldModule) => {
      info.world = worldModule;
      info.isValid = true;
      info.modificationCount += 1;
   }).catch((err) => {
      info.isValid = wasValid;
      console.error(err.message, err.stack);
   });
}

// initialize the scene system


const rootPath = "./scenes/";
export async function scenesSetup() {
   return import("./scenes/scenes.js").then((userInitNamespace) => {
      publicScenes =[] 
      let params = null;      
      if (!userInitNamespace.default) {
         console.warn("No user initialization procedure specified!");
      } else {
         if (window.onlyScene)
            params = {
               enableSceneReloading: false,
               scenes: [
                  { name  : onlyScene,
                    path  : './' + onlyScene + '.js',
                    public: true,
                  }
               ]
            };
         else
            params = userInitNamespace.default();
      }

      if (params) {
         if (params.scenes) {
            if (!Array.isArray(params.scenes)) {
               console.error("Invalid parameter to init(): expected scenes of type Array", params.scenes);
            } else {
               try {
                  const initSceneCount = params.scenes.length;
                  for (let i = 0; i < initSceneCount; i += 1) {
                     addScene(params.scenes[i].name, rootPath + params.scenes[i].path, params.scenes[i].background ? params.scenes[i].background: null);
                     if(params.scenes[i].public)
                     publicScenes.push(params.scenes[i].name);
                  }
                  // load asynchronously
                  for (let i = 0; i < sceneList.length; i += 1) {
                     loadScene(sceneList[i]);
                  }
               } catch (err) {
                  console.error(err.message, "invalid parameters to addScene(name, path)");
               }
            }
         }

         if (params.enableSceneReloading != undefined) {
            enableSceneReloading = params.enableSceneReloading;
         }
      }

   }).catch((err) => {
      console.error(err);
   }).finally(() => {
      const demoNames = sceneNames.join(",");
      global.setDemoNames(demoNames);
      addDemoButtons(demoNames, scenesInit);
      scenesInit = true;
   });
}

export let scenes = function () {
   if (!scenesInit || window.currentID == -1) {
      return;
   }

   const demoInfo = sceneList[window.currentID];
   if (demoInfo.isValid && window.getSceneFlagByID[window.currentID]() != 0) { 
      runDemo(demoInfo); 
   }
}

function runDemo(demo) {
   if (demo.background && demo.envInd == null) {
      switchBackground(demo.background);
      demo.loadGLTF = true;
      curDemoEnv.push(demo);
      demo.envInd = curDemoEnv.length - 1;
    }

   if(! demo._isStarted) {
      currentDemo = demo;
      // default : remove all the previous demos when starting a new one
      // might be useful to change this into something else if want to show more demos at once
      clay.model.clear();
      global.gltfRoot.clearNodes();
      delete window.onSpeech;
      window.customShader = '';
      window.clay.clayPgm.program = null;


      demo.ctx = {};

      if (!demo.world.init) {
         console.warn(window.currentName, "has no init function");
         if (!demo.world.display) {
            console.warn(window.currentName, "has no display function");
         }
         demo._isReady = true;
      } else {
         // This try/catch is necessary because we don't know if the init 
         // function is async 
         let errIsNotAsync = true;
         try {
            // Additionally, there might be an error in the scene code. Catch it here.
            // There also might or might not be pending asynchronous initialization tasks that
            // Should complete starting the run loop

            let initStatus = demo.world.init(clay.model, demo.ctx, demo.ctxForever);
            initStatus.then(() => {
               demo._isReady = true;
            }).catch((err) => {
               console.error(err.message, err.stack);
               console.error("Leaving:", window.currentName);
               window.chooseFlag(window.currentName);
               return;
            });
            errIsNotAsync = false;
         } catch (err) {
            if (errIsNotAsync) {
               console.warn("init() should be async!");
            } else {
               console.error(err.message, err.stack);
               console.error("client code has runtime errors in init()!\n:Leaving:", window.currentName);
               window.chooseFlag(window.currentName);
               return;
            }
         }
         
         demo._isReady = true;
         if (!demo.world.display) {
            // console.warn("no display function");
         }
      }

      demo._isStarted = true;
      if(window.isLayersSuported){
         //Close instructions
         /*
         window.insXZ.layer.width = 0;
         window.insXZ.layer.height = 0;
         window.insY.layer.width = 0;
         window.insY.layer.height = 0;
         window.insS.layer.width = 0;
         window.insS.layer.height = 0;
         */
      }
   } 

   if (demo._isReady && demo.world.display) {
      try {
         demo.world.display(clay.model, demo.ctx, demo.ctxForever);
      } catch (err) {
         console.error(err.message, err.stack);
         console.error("client code has runtime errors in display()!");
         //window.chooseFlag(window.currentName);
      }
   }

   if(window.clay.clayPgm.program) clay.model.setUniform('1i', 'uProcedure', 0);
}

function stopDemo(demo) {

   if (demo.loadGLTF) {
      // if there is a back-up
      if (curDemoEnv.length > 1 && curDemoEnv[curDemoEnv.length - 2].background) {
        switchBackground(curDemoEnv[curDemoEnv.length - 2].background);
        curDemoEnv[curDemoEnv.length - 2].loadGLTF = true;
      }
      else switchBackground(defaultBackground);
      for (let i = demo.envInd + 1; i < curDemoEnv.length; i++) {
        curDemoEnv[i].envInd--;
      }
      curDemoEnv.splice(demo.envInd, 1);
      demo.envInd = null;
    } else if (demo.envInd != null) { // it has been added to the gltf env list but not active
      curDemoEnv.splice(demo.envInd, 1);
      demo.envInd = null;
    }

   demo._isStarted = false;
   demo.ctx = {};
   demo._isReady = false;
   if(currentDemo == demo) {
      if (demo.isValid && demo.world.deinit) {
         try {
            // deinitialize any resources that the scene loaded
            // separately from the system
            demo.world.deinit(clay.model, demo.ctx, demo.ctxForever);
         } catch (err) {
            console.error(err.message, err.stack);
            console.error("client code has runtime errors in deinit()!");
         }
      }
      clay.model.clear();
      global.gltfRoot.clearNodes();
      delete window.onSpeech;
      window.customShader = '';
      window.clay.clayPgm.program = null;
      currentDemo = null;
      window.mySharedObj = [];
   }

   if (anidraw) {
      anidraw.setIsCodeText(false);
      anidraw.setCodeText('');
      anidraw.setDrawFunction(null);
   }

   // stop looping audios
   stopLoopingSound();
   stopAllSounds();
   stopStereoLoopingAudio();

}

function showNameTag() {
   for (let key in window.avatars) {
      if (window.playerid && window.playerid != window.avatars[key].playerid && window.avatars[key].headset.matrix[0] != undefined) {
         let msg = window.avatars[key].name; // user's name
         let mat = []; // the transformation matrix for the user
         for (let i = 0; i < 16; i++) {
            mat.push(window.avatars[key].headset.matrix[i])
         }
         // TODO: after implementing the text display system in clay, add name tag rendering for each remote user
      }
   }
}

function switchBackground(background) {
   for (let i in global.scene().children) {
     if (global.scene().children[i].name == "backGround") {
       global.scene().children.splice(i, 1);
       break;
     }
   }
   // it overwrites the latest gltf env in the demo list
   if (curDemoEnv.length > 0) curDemoEnv[curDemoEnv.length - 1].loadGLTF = false;
   global.scene().addNode(new Gltf2Node({ url: background })).name = "backGround";
 }
