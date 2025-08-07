const WebSocketServer = require('ws').Server;
const express = require('express');
const path = require('path');
const server = require('http').createServer();
const PubSubManager = require('./pubsub');

const app = express();
const pubSubManager = new PubSubManager();

app.use(express.static(path.join(__dirname, '/public')));
const wss = new WebSocketServer({ server: server });
wss.on('connection', (ws, req) => {
    console.log(`Connection request from: ${req.connection.remoteAddress}`);
    ws.on('message', (data) => {
        console.log('data: ' + data);
        const json = JSON.parse(data);
        //Parse the element of the message required to redirect the data to the desired subscriber
        const request = json.request;
        const message = json.message;
        const channel = json.channel;

        switch (request) {
            case 'PUBLISH':
                pubSubManager.publish(ws, json);
                break;
            case 'SUBSCRIBE':
                pubSubManager.subscribe(ws, channel);
                break;
        }
    });
    // ws.on('close', () => {
    //     console.log('Stopping client connection.');
    // });
});

server.on('request', app);
server.listen(8080, () => {
    console.log('Server listening on http://localhost:8080');
});