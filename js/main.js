import { EventBus } from "/js/primitive/eventbus.js";

const FC_queryParams = new Proxy(new URLSearchParams(window.location.search), {
  get: (searchParams, prop) => searchParams.get(prop),
});

const PRESENTATION_FLAG_DEFAULT    = 0;
window.PRESENTATION_FLAG_DEFAULT   = PRESENTATION_FLAG_DEFAULT;
const PRESENTATION_FLAG_NO_RENDER  = 1 << 0;
window.PRESENTATION_FLAG_NO_RENDER = PRESENTATION_FLAG_NO_RENDER;

window.server = new Server(2024);

window.presentationMode = PRESENTATION_FLAG_DEFAULT
//PRESENTATION_FLAG_NO_RENDER
;

function containsFlags(flags, checkFlags) {
   return (flags & checkFlags) == checkFlags;
}
window.containsFlags = containsFlags;

window.gpuUseAlphaToCoverage = true;

window.mainSubComm = null;
window.desktopHandtrackingEnabled = true;
window.desktopHandtrackingIsRemote = false;

window.shouldUseHandtracking = () => {
   return window.desktopHandtrackingEnabled && 
   !containsFlags(window.presentationMode, window.PRESENTATION_FLAG_NO_RENDER);
};

window.togglePresentationFlags = (flags) => {
   window.presentationMode ^= flags;
   window.clay.renderingIsActive = !containsFlags(window.presentationMode, window.PRESENTATION_FLAG_NO_RENDER);
};

{
   const textureCanvas = document.createElement('canvas');
   window.textureCanvas = textureCanvas;
   textureCanvas.id = "textureCanvas";
   textureCanvas.width = 1024;
   textureCanvas.height = 1024;
   textureCanvas.style.position = "absolute";
   textureCanvas.style.border = "0px solid";
   const textureCanvasContext2D = textureCanvas.getContext('2d');
   window.textureCanvasContext2D = textureCanvasContext2D;
}

window.EventBus = new EventBus();

async function main() {
    import("/js/corelink_handler.js").then(async (mod) => {
         await mod.run();
      });
   
}

async function mainSub() {
   const mod = await import('/js/render/core/videoHandTracker.js');
   mod.init(null, (handInfo_, fullResults_) => {
      window.sharedChan.postMessage(handInfo_);
   });      
}

if (!window.BroadcastChannel) {
   main();
} else {
   if (FC_queryParams['main']) {
      window.desktopHandtrackingIsRemote = true;
      window.desktopHandtrackingIsSent   = false;

      main();

      console.log("main w broadcast");
         window.sharedChan = new BroadcastChannel("FCchanHands");
         window.sharedChan.onmessage = event => { 
         // if (event.data == null || event.data == undefined || event.data.length == 0) {
         //    console.warn("nothing");
         // }
         window.handInfo = event.data;
         // console.log("received", handInfo);
      }

   } else if (FC_queryParams['sub']) {
      console.log("sub w broadcast");
      window.sharedChan = new BroadcastChannel("FCchanHands");
      // window.sharedChan.onmessage = event => { console.log(event); }

      window.desktopHandtrackingIsRemote = false;
      window.desktopHandtrackingIsSent   = true;

      mainSub();
   } else {
      main();
   }
}
