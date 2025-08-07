
const WebSocket = require('ws');

const fs = require('fs');
const path = require('path');

const scriptPath = __filename;
const scriptDirectory = path.dirname(scriptPath);

async function readConfig() {
    try {
      const configFilePath = path.join(scriptDirectory, 'address.txt');

      const data = fs.readFileSync(configFilePath, 'utf8');
      const lines = data.split('\n');
      let host = '';
      let port = '';
  
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('host=')) {
          host = trimmedLine.substring(5).trim();
        } else if (trimmedLine.startsWith('port=')) {
          port = trimmedLine.substring(5).trim();
        }
      }
  
      if (!host || !port) {
        throw new Error('Host or port not found in config.txt');
      }
  
      return { host, port: parseInt(port, 10) };
    } catch (error) {
      console.error('Error reading config.txt:', error.message);
      return { host: "192.168.1.188", port: 8080 }; // Default values if config fails
    }
  }


async function subscribe() {
    var message = ''; //document.getElementById('message');
    var channel = 'robot_odom';
    const config = await readConfig();
    var host = config.host;
    var port = config.port;

    //var host = "192.168.1.188"; //window.document.location.host.replace(/:.*/, '');
    var ws = new WebSocket('ws://' + host + ':' + port);
    ws.onopen = function () {
        ws.send(JSON.stringify({
            request: 'SUBSCRIBE',
            message: '',
            channel: channel
        }));
        ws.onmessage = function(event){
            data = JSON.parse(event.data);
            message.innerHTML = data;
            console.log("Message Received: " + data.position_msg);
        };
        
    };
}

subscribe();