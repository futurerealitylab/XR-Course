
function Server(wsPort) {
   var that = this;
   this.name = name;

   this.call = (name, callback) => {
      var request = new XMLHttpRequest();
      request.open('GET', name);
      request.onloadend = () => callback(request.responseText);
      request.send();
   }

   this.upload = (sketchName, sketchContent) => {
      var request = new XMLHttpRequest();
      request.open('POST', 'upload');

      var form = new FormData();
      form.append('sketchName', sketchName);
      form.append('sketchContent', sketchContent);

      request.send(form);
   }

   this.getTT = callback => {
      if (! this.getTT_request)
         this.getTT_request = new XMLHttpRequest();
      var request = this.getTT_request;

      request.open('POST', 'getTT');
      request.onloadend = () => callback(request.responseText);
      var form = new FormData();
      request.send(form);
   }

   this.set = (key, val) => {
      var request = new XMLHttpRequest();
      request.open('POST', 'set');

      var form = new FormData();
      form.append('key', key + '.json');
      form.append('value', JSON.stringify(val));
      request.send(form);
   }

   this.get = (key, callback, onErr) => {
      var request = new XMLHttpRequest();
      request.open('GET', key + '.json');
      request.onloadend = () => {
         if (request.responseText.indexOf('Cannot ') != 0)
            callback(JSON.parse(request.responseText));
         else if (onErr !== undefined)
            onErr(request.responseText);
      }
      request.send();
   }

   this.spawnPythonThread = (fileName, input) => {
      var request = new XMLHttpRequest();
      request.open('POST', 'spawnPythonThread');

      request.onloadend = () => {
         if (request.status >= 200 && request.status < 300) {
            const text = request.responseText;
            window.pythonOutput = text;
            this.broadcastGlobal('pythonOutput');
            console.log('Output from python script: ' + text);
         }
	      else
	         console.log('error ' + request.status);
         }

      var form = new FormData();
      form.append('fileName', fileName);
      form.append('input', input);
      request.send(form);
   }

   this.track = () => {
      var request = new XMLHttpRequest();
      request.open('GET', 'opti-track');

      request.onloadend = () => {
         try {
            const info = request.responseText;
            window.trackInfo = info;
            this.broadcastGlobal('trackInfo');
         }
         catch (err) { console.log(err); }
      }

      request.send();
   }

   this.qrcode = () => {
      var request = new XMLHttpRequest();
      request.open('POST', 'qrcode');

      request.onloadend = () => {
         if (request.status >= 200 && request.status < 300) {
            const info = request.responseText;
            window.qrinfo = info;
            this.broadcastGlobal('qrinfo');
         }
	      else
	         console.log('error ' + request.status);
         }

      var form = new FormData();
      request.send(form);
   }

   this.objdetect = () => {
      var request = new XMLHttpRequest();
      request.open('POST', 'obj');

      request.onloadend = () => {
         if (request.status >= 200 && request.status < 300) {
            const info = request.responseText;
            window.objinfo = info;
            this.broadcastGlobal('objinfo');
         }
         else
            console.log('error ' + request.status);
         }

      var form = new FormData();
      request.send(form);
   }

   this.writeFile = (fileName, contents) => {
      var request = new XMLHttpRequest();
      request.open('POST', 'writeFile');
      var form = new FormData();
      form.append('fileName', fileName);
      form.append('contents', JSON.stringify(contents));
      request.send(form);
   }

   this.socket = null;

   this.construct = data => {
      let obj = data;
      if (Array.isArray(data)) {
         obj = [];
         for (let i = 0 ; i < data.length ; i++)
            obj.push(this.construct(data[i]));
      }
      else if (data && data.constructorName) {
         obj = new (eval(data.constructorName))();
         for (let f in data)
            obj[f] = this.construct(data[f]);
      }
      return obj;
   }

   this.log = (a,b,c,d,e,f,g,h,i,j) => {
      var request = new XMLHttpRequest();
      request.open('POST', 'log');
      var form = new FormData();
      let C = (a,b) => b===undefined ? a : a + ' ' + b;
      form.append('log', C(a,C(b,C(c,C(d,C(e,C(f,C(g,C(h,C(i,j))))))))));
      request.send(form);
   }

   this.connectSocket = wsPort => {
      this.socket = new WebSocket("ws://" + window.location.hostname + ":" + wsPort);
      this.socket.binaryType = "arraybuffer";

      var that = this;
      this.socket.onmessage = event => {
         if (event.data instanceof ArrayBuffer)
            return;

         var obj = JSON.parse(event.data);

         if (obj.eventType) {
            obj.event.preventDefault = () => { };
            (events_canvas[obj.eventType])(obj.event);
            return;
         }

         if (obj.global) {
            try {
               if (obj.start !== undefined)
                  for (let i = 0 ; i < obj.value.length ; i++)
                     window[obj.global][obj.start + i] = this.construct(obj.value[i]);
               else if (obj.element !== undefined)
                  window[obj.global][obj.element] = this.construct(obj.value);
               else
                  window[obj.global] = this.construct(obj.value);
            }
            catch (e) { }
            return;
         }

         if (obj.peerID && obj.receiverID==clientID) {  // RECEIVING AN INVITE TO OPEN A NEW
	    let ch = new Channel();                     // PEER CHANNEL WITH ANOTHER CLIENT.
	    if (channel[obj.senderID])
	       ch.on = channel[obj.senderID].on;
	    channel[obj.senderID] = ch;
            channelOpenQueue.push({ ch: ch, peerID: obj.peerID });
	 }

         if (obj.code) {
            try {
               eval(obj.code);
            }
            catch (e) { }
            return;
         }
      };
      return this.socket;
   };

   this.broadcastGlobalSlice = (name, start, end) =>
      this.broadcastObject( { global:name, start:start, value:window[name].slice(start,end) } );
   this.broadcastGlobalElement = (name, element) =>
      this.broadcastObject( { global:name, element:element, value:window[name][element] } );
   this.broadcastGlobal = name => {
      if (typeof name !== 'string')
         console.log('ERROR: argument to server.broadcastGlobal must be of type string');
      else
         this.broadcastObject( { global:name, value:window[name] } );
   }
   this.broadcastCode   = code    => this.broadcastObject( { code:code } );
   this.broadcastObject = object  => this.broadcast(JSON.stringify(object));
   this.broadcast       = message => {
      if (this.socket == null) {
         console.log("socket is null, can't broadcast");
         return;
      }
      if (this.socket.readyState != 1) {
         console.log("socket is not open, can't broadcast");
         return;
      }
      this.socket.send(message);
   };

   let msngr_name = name => name + '_updates';
   let index_name = name => name + '_updates_index';

   this.init = (name, default_value) => {
      if (window[name] === undefined)
         window[name] = default_value;
      window[msngr_name(name)] = {};
      window[index_name(name)] = 0;
   }

   this.send = (name, msg_obj) => window[msngr_name(name)][window[index_name(name)]++] = msg_obj;

   let syncInterval = 3;

   this.syncInterval = value => syncInterval = value;

   this.sync = (name, callback) => {
      window[name] = server.synchronize(name, syncInterval);
      let m_name = msngr_name(name);
      let isNotEmpty = name => window[name] && Object.keys(window[name]).length >0;
      let addID = (name, id) => '__' + name + '__' + id;
      if (isNotEmpty(m_name)) {
         let m_nameID = addID(m_name, clientID);
         window[m_nameID] = window[m_name];
         window[m_name] = {};
         this.broadcastGlobal(m_nameID);
      }
      if (window.clients)
         for (let n = 0 ; n < clients.length ; n++) {
            let m_nameID = addID(m_name, clients[n]);
            if (isNotEmpty(m_nameID)) {
               callback(window[m_nameID], clients[n]);
               window[m_nameID] = {};
            }
      }
   }

   let alwaysLoadFromStorage = false;
   this.alwaysLoadFromStorage = () => alwaysLoadFromStorage = true;

   let neverLoadOrSave = false;
   this.neverLoadOrSave = () => neverLoadOrSave = true;

   let channelSendQueue = []; // SENDER CHANNELS MUST WAIT FOR A VALID WEB-RTC ID.
   let channelOpenQueue = []; // OPENER CHANNELS MUST WAIT FOR A VALID WEB-RTC ID.

   this.synchronize = (name, interval) => {

      if (window.clients === undefined)                 // DO NOT DO ANYTHING UNTIL THE
         return window[name];                           // SERVER PROVIDES A CLIENT LIST.

      if (window.clientID === undefined) {              // ON START-UP, ASSIGN A UNIQUE ID
         window.clientID = clients[clients.length-1];   // TO THIS CLIENT.

         for (let i = 0 ; i < clients.length ; i++)     // ALSO CREATE CHANNEL OBJECTS FOR
            if (clients[i] != clientID) {               // SENDING ONE-TO-ONE PEER CONNECTION
	       channel[clients[i]] = new Channel();     // INVITES TO OTHER CLIENTS.
	       channelSendQueue.push({id: clients[i],
	                              ch: channel[clients[i]]});
            }
      }

      for (let i=0 ; i<channelSendQueue.length ; i++) { // WAIT TO SEND AN INVITE TO JOIN A
         let ch = channelSendQueue[i].ch;               // CHANNEL, UNTIL THE SENDER OBJECT
         let id = channelSendQueue[i].id;               // HAS A VALID WEB-RTC PEER ID.
	 if (ch.id()) {
	    this.broadcastObject({senderID:clientID, receiverID:id, peerID:ch.id()});
            channelSendQueue.splice(i, 1);
         }
      }

      for (let i = 0 ; i < clients.length ; i++)        // IF A CHANNEL DOES NOT YET EXIST,
         if (! channel[clients[i]])                     // ADD A STUB, JUST SO THAT CALLING
	    channel[clients[i]] = { send: () => {},     // THE send() AND on() METHODS WILL
	                            on  : () => {} };   // NOT TRIGGER AN ERROR.

      for (let i=0 ; i<channelOpenQueue.length ; i++) { // WAIT BETWEEN WHEN A CLIENT MAKES
         let item = channelOpenQueue[i];                // A RECEIVER OBJECT IN RESPONSE TO
	 if (item.ch.id()) {                            // A PEER CHANNEL INVITE, AND WHEN
            item.ch.open(item.peerID);                  // THE CONNECTION IS ACTUALLY OPENED,
            channelOpenQueue.splice(i, 1);              // UNTIL THE RECEIVER OBJECT HAS A
         }                                              // VALID WEB-RTC PEER ID.
      }

      let isSceneLoaded = name + '__' + clientID;
      if (! neverLoadOrSave && ! window[isSceneLoaded]) {       // IF THE SCENE ISN'T LOADED:
         window[isSceneLoaded] = true;
         if (clients.length == 1 || alwaysLoadFromStorage) {    // IF THIS IS THE ONLY CLIENT
            console.log('client', clientID, 'is the first client -- loading from storage');
            this.get(name,s => window[name]=this.construct(s)); // INITIALIZE ITS STATE VALUE
	                                                        // FROM PERSISTENT STORAGE.
         }
         else
            for (let i = 0 ; i < clients.length ; i++)          // ELSE WHEN THE NEW CLIENT
               if (clients[i] != clientID) {                    // JOINS THIS SCENE, IT SENDS
                  window.needToUpdate = { name: name, client: clients[i] };
                  this.broadcastGlobal('needToUpdate');         // A NEED_TO_UPDATE INDICATOR
                  delete window.needToUpdate;                   // TO SOME OTHER CLIENT, THEN
		  window['waitForFirstUpdate__' + name] = true; // WAITS FOR A FIRST UPDATE.
                  break;
               }
      }

      if (! neverLoadOrSave && window.needToUpdate) {           // WHEN A CLIENT RECEIVES THE
         if (clientID == needToUpdate.client) {                 // NEED_TO_UPDATE INDICATOR, IT
            window.updatedValue = window[needToUpdate.name];    // BROADCASTS AN UPDATED VALUE
            this.broadcastGlobal('updatedValue');               // TO EVERY CLIENT, AND DELETES
            delete window.updatedValue;                         // ITS UPDATED_VALUE FLAG.
         }
         delete window.needToUpdate;
      }

      if (window.updatedValue) {                        // WHEN A CLIENT GETS AN UPDATED_VALUE,
         window[name] = updatedValue;                   // IT SETS ITS OWN VALUE TO THAT VALUE.
         delete window.updatedValue;                    // ALSO, IF IT WAS WAITING FOR A FIRST
	 delete window['waitForFirstUpdate__' + name];  // UPDATE, IT CAN NOW STOP WAITING.
      }

      let i = interval===undefined ? 3 : Math.abs(interval); // DEFAULT interval IS 3 SECS
      let counter = Date.now() / (1000 * i) >> 0;
      if (! neverLoadOrSave && ! window['waitForFirstUpdate__' + name] // IF NOT WAITING FOR A
          && counter > this.counter                     // FIRST UPDATE, THEN AT EVERY INTERVAL
          && window.clientID == window.clients[0]) {    // COUNT THE OLDEST CLIENT SAVES ITS
         this.set(name, window[name]);                  // CURRENT VALUE TO PERSISTENT STORAGE.
         if (interval > 0)                              // IF THE INTERVAL IS POSITIVE THEN
            this.broadcastGlobal(name);                 // IT ALSO UPDATES ALL OTHER CLIENTS.
      }
      this.counter = counter;

      return window[name];
   }

   this.updateTimestamp = () => {
      let time = Date.now() / 1000 >> 0;
      if (time > this.time)
         this.set('timestamp', time);
      this.time = time;
   }
   
   this.connectSocket(wsPort);
}

window.channel = {};

function Channel() {
    let peer = new Peer(), conn, id, data;
    let initConn = c => (conn=c).on('data', d => (this.on && this.on(d)));
    peer.on('open', i => id = i);
    peer.on('connection', c => initConn(c));

    this.open = peerId => initConn(peer.connect(peerId));
    this.send = data => { if (conn && conn.open) conn.send(data); }
    this.id   = () => id;
}

window._shared_result = null;
window.shared = func => {
   if (clientID == clients[0]) {
      _shared_result = func();
      for (let i = 1 ; i < clients.length ; i++)
         channel[clients[i]].send(_shared_result);
   }
   else
      channel[clients[0]].on = data => _shared_result = data;
   return _shared_result;
}

