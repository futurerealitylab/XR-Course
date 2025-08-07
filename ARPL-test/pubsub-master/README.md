# PubSub
## About
This simple app demonstrate [PubSub pattern](https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern) using Node/WS/Express server and WebSocket client APIs.
## Usage
1. Run server.
```
npm install
node index.js
```
2. Open subscriber (sub.html). You can open multiple subscribers. Select desired channel and click **Subscribe**.
3. Open publisher (pub.html). Input desired channel and message to publish. Click **Publish**.
4. All the subscribers subscribed to given channel will recieve the message.
5. To close the server just press Ctrl+C in terminal.

## Todos
* Allow pub/sub simultaneously.
* Differentiate pub/subs in backend. 
* Use database to store message queue.
* Better error handling.
