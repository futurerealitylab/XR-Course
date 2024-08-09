// V3.0.0.0
// Send pings to the relay to check the server
const dgram = require('dgram')
// Setup ----
const IP = '127.0.0.1' // the ip of the sync server to connect to
const PortControl = 1510
const PortData = 1511 // the control port that is used on the server

let CommandBack = 0 // command port on the motiv side
// End Setup ---


let num = 0
const pings = []
// const max = 0
// const min = 1000000
// const sum = 0
let received = 0
const udp = dgram.createSocket('udp4')
// console.log('Binding to: '+IPSource);
// udp.bind({address:IPSource});
udp.bind()

udp.on('listening', () => {
  const address = udp.address()
  // eslint-disable-next-line no-undef
  sourcePort = address.port
  console.log(`Bound to: ${address.address}:${address.port}`)
})

udp.on('message', (message, info) => {
  received += 1
  console.log(`received: ${message} from ${info.address}:${info.port}, received: ${received}}`)
})


console.log(`running with control target ${IP}:${PortControl}`)
console.log(`running with data target ${IP}:${PortData}`)

// Setup to listen and send for control messages from/to optitrack
const server = dgram.createSocket('udp4')
// server.bind({adress: CommandIP, port: CommandPort});
console.log(`trying to bind command port to ${PortData}`)
server.bind({ port: PortData })

server.on('error', (err) => {
  console.log(`server error:\n${err.stack}`)
  server.close()
})

server.on('message', (msg, rinfo) => {
  console.log(`received data message from ${rinfo.address}:${rinfo.port}`)
  console.log(msg.toString())
})

server.on('listening', () => {
  const address = server.address()
  console.log(`server (command) listening ${address.address}:${address.port}`)
//  server.setMulticastTTL(128);
// server.addMembership('239.255.42.99', '127.0.0.1');
})


// Setup to listen and send for control messages from/to optitrack
const serverC = dgram.createSocket('udp4')
// serverC.bind({adress: CommandIP, port: CommandPort});
console.log(`trying to bind command port to ${PortControl}`)
serverC.bind({ port: PortControl })

serverC.on('error', (err) => {
  console.log(`server error:\n${err.stack}`)
  serverC.close()
})

serverC.on('message', (msg, rinfo) => {
  console.log(`received command message from ${rinfo.address}:${rinfo.port}`)
  console.log(msg.toString())
  CommandBack = rinfo.port
})

serverC.on('listening', () => {
  const address = serverC.address()
  console.log(`server (command) listening ${address.address}:${address.port}`)
// server.setMulticastTTL(128);
// server.addMembership('239.255.42.99', '127.0.0.1');
})

function sendData() {
  pings[num] = Date.now()

  let data = `${num.toString()} ControlBack`
  data = Buffer.from(data)
  if (CommandBack !== 0) {
    serverC.send(data, CommandBack, IP, (err) => {
      if (err) {
        console.log('socket error', err)
      }
    })
    console.log(`sent: ${data.toString()} to ${IP}:${PortData}`)
  }

  num += 1
  setTimeout(sendData, 1000)
}

sendData()
