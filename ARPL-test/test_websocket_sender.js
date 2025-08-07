const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();

//initialize a simple http server
const server = http.createServer(app);

//initialize the WebSocket server instance
const wss = new WebSocket.Server({ server });

//start our server
let localhost = '127.0.0.1';
let port = 3000;



/*
This class manage to send a JSON message through websocket to a client who is listeing
*/
//  class WS_Server {
//   constructor(ip, port, server) {
//       this.string = "ws://" + ip + ":" + port;

//       this.ss = new WebSocket.Server({ server });
//       console.log("the class have been initialized successfully: " + this.string);
//   }
  
//   connect() {
//     this.ss.onmessage = message => {
//       var obj = JSON.parse(message.data);
//        //log the received message and send it back to the client
//        console.log('received: ' +  obj);

//     }
//     console.log("I'm in connect");
//   }


// event listener for handling WebSocket connections
wss.on('connection', (ws) => {
  console.log('Client connected');

  // event listener for handling incoming WebSocket messages
  ws.on('message', function incoming(message) {
      console.log(`Received message: ${message}`);
      // You can handle the incoming message here
  });

  // event listener for handling WebSocket disconnections
  ws.on('close', () => {
      console.log('Client disconnected');
  });
});

// start our server
server.listen(port, () => {
  console.log(`Server started on port ${server.address().port} :)`);
});




// this.on('connection', (ws) => {

//     //connection is up, let's add a simple simple event
//     ws.on('message', (message) => {

//         //log the received message and send it back to the client
//         console.log('received: %s', JSON.parse(message.data));
      

  //        // Construct a msg object containing the data the server needs to process the message from the chat client.
  // const msg = {
  //   type: "message",
  //   text: "ciao",
  //   id: 10,
  //   date: Date.now(),
  // };

  // // Send the msg object as a JSON-formatted string.
  // ws.send(JSON.stringify(msg));

  // Blank the text input element, ready to receive the next line of text from the user.
  //document.getElementById("text").value = "";

    // });

    //send immediatly a feedback to the incoming connection    
    //ws.send('Hi there, I am a WebSocket server');
// });

// }


//const ws_server = new WS_Server(localhost, port, server_);


//ws_server.connect();




// const ws = new WebSocket('ws://localhost:3000')
// ws.onopen = () => {
//   console.log('ws opened on browser')
//   ws.send('hello world')
// }

// ws.onmessage = (message) => {
//   console.log(`message received`, message.data)
// }

