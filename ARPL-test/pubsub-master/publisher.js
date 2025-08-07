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


async function publish() { //Once the button on the page is pressed the fucntion publish here is called and a message is sent through websocket
    var message = 'ssss';
    var channel = 'user_position';
    const config = await readConfig();

    var host = config.host;
    var port = config.port;
    //var host = "192.168.1.188"; //window.document.location.host.replace(/:.*/, '');
    var ws = new WebSocket('ws://' + host + ':' + port);
    let n = 10; 
   
    ws.onopen = function () {
        ws.send(JSON.stringify({
            request: 'PUBLISH',
            message: message,
            channel: channel
        }));
        ws.close();
        console.log("Publishing: " + message);
    };

  

}

async function loop_publish()
{
    let n = 10; 
    for (let i = 0; i < n; i++){
        publish();
    }
}

loop_publish()