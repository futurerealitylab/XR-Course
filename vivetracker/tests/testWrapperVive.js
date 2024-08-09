// V3.0.0.0
// Send pings to the relay to check the server
const dgram = require('dgram')
// Setup ----
const IP = '127.0.0.1' // the ip of the sync server to connect to
const PortControl = 1510
const PortData = 1511 // the control port that is used on the server
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

function sendData() {
  pings[num] = Date.now()

  let data = `${num.toString()} Control`
  data = Buffer.from(data)

  udp.send(data, PortControl, IP, (err) => {
    if (err) {
      console.log('socket error', err)
    }
  })
  console.log(`sent: ${data.toString()} to ${IP}:${PortControl}`)

  data = `${num.toString()} Data`
  data = Buffer.from(data)

  udp.send(data, PortData, IP, (err) => {
    if (err) {
      console.log('socket error', err)
    }
  })
  console.log(`sent: ${data.toString()} to ${IP}:${PortData}`)

  num += 1
  setTimeout(sendData, 1000)
}

sendData()
