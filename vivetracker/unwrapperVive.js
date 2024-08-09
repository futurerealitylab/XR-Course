// V3.0.0.0
// Subscribe to a stream and forward to target port


const dgram = require('dgram')
const net = require('net')

const serverC = dgram.createSocket('udp4')


// Setup ----
let IPSource = '' // the ip used to run this listener (if there is a nat proxy, the ip of the nat), leave empty for autodetect
const IPControl = '128.122.215.23' // the ip of the sync server to connect to
const TCPControl = 20010 // the control port that is used on the server

const SendToControlIP = '127.0.0.1' // recevie data from this ip
const SendToControlPort = 1510 // send data to this port

let CommandBack = 0 // command port on the unity side

const SendToDataIP = '127.0.0.1' // send data to this ip
const SendToDataPort = 1511 // send data to this port

let Delay = 0 // Default deley to forward the optitrack data

const username = 'Testuser' // username to connect as
const password = 'Testpassword' // password to coinnect with
// End Setup ---


function sleep(milliseconds) {
  const startTime = new Date().getTime()
  for (let i = 0; i < 1e7; i += 1) if ((new Date().getTime() - startTime) > milliseconds) break
}

function start() {
  const stdin = process.openStdin()
  stdin.setRawMode(true)
  stdin.resume()
  stdin.setEncoding('utf8')
  const processing = []


  function cleanup() {
    console.log('Cleanup Streams...')
    processing.DisconnectStream.start()
  }

  stdin.on('data', (key) => {
    if (key === '\u0003') cleanup()

    if ((key.charCodeAt(0) === 27) && (key.charCodeAt(1) === 91)) {
      if ((key.charCodeAt(2) === 65)) {
        Delay += 1
        console.log(`Delay up (${Delay})`)
      }
      if ((key.charCodeAt(2) === 66)) {
        if (Delay > 0) Delay -= 1
        console.log(`Delay down (${Delay})`)
      }
    }
  })

  let token = ''
  let lastfunction = ''
  const server = [] // object to call for server activated functions
  let streamidData = ''
  let streamidCS = ''
  let streamidCR = ''
  let streamidCDR = ''
  let streamidDDR = ''

  let udpPort = 0
  let sourcePort = 0
  const headerSize = Buffer.alloc(6)

  const client = new net.Socket()

  // set up udp to send and receive data to/from the relay
  const udp = dgram.createSocket('udp4')
  let udpregistered = false
  console.log(`Binding to: ${IPSource}`)
  udp.bind()

  udp.on('listening', () => {
    const address = udp.address()
    sourcePort = address.port
    console.log(`Bound sync communication port to: ${address.address}:${address.port}`)
  })


  processing.Login = {
    start() {
      const request = `{"function":"auth","username":"${username}","password":"${password}"}`
      client.write(request)
    },
    process(message) {
      if ('token' in message) {
        token = message.token
        IPSource = message.IP
        console.log(`  Authentication successful. Token: ${token}`)
      } else console.log('  Request produced wrong result')
      return ('continue')
    },
  }

  processing.GetControlSenderStream = {
    start() {
      const request = `{"function":"sender","workspace":"Holodeck","proto":"udp","ip":"${IPSource}","port":${sourcePort},"type":"control_to_optitrack","token":"${token}"}`
      client.write(request)
    },
    process(message) {
      if ('streamid' in message) {
        streamidCS = message.streamid
        const udpPortCS = message.port
        console.log(`  Aquired a new control sender streamid:${streamidCS}, Port:${udpPortCS}`)
      } else {
        console.log('Did not get a streamid.')
        return ('error')
      }
      return ('continue')
    },
  }

  processing.GetControlReceiverStream = {
    start() {
      let request
      if (streamidCR === '') request = `{"function":"receiver","workspace":"Holodeck","proto":"udp","ip":"${IPSource}","port":0,"alert":true,"type":["control_from_optitrack"],"token":"${token}"}`
      else request = `{"function":"receiver","receiverid":"${streamidCR}","workspace":"Holodeck","proto":"udp","ip":"${IPSource}","port":0,"alert":true,"type":["control_from_optitrack"],"token":"${token}"}`
      client.write(request)
    },
    process(message) {
      if ('streamid' in message) {
        streamidCR = message.streamid
        streamidCDR = message.sourceid[message.sourceid.length - 1]
        console.log('New control source', streamidCDR)
        const udpPortCR = message.port
        console.log(`  Using streamid:${streamidCR}, Port:${udpPortCR}`)
      } else {
        console.log('Did not get a streamid.')
        return ('error')
      }
      return ('continue')
    },
  }

  processing.GetDataStream = {
    start() {
      let request
      if (streamidData === '') request = `{"function":"receiver","workspace":"Holodeck","proto":"udp","ip":"${IPSource}","port":0,"alert":true,"type":["optitrack_data"],"token":"${token}"}`
      else request = `{"function":"receiver","receiverid":"${streamidData}","workspace":"Holodeck","proto":"udp","ip":"${IPSource}","port":0,"alert":true,"type":["optitrack_data"],"token":"${token}"}`
      client.write(request)
    },
    process(message) {
      if ('streamid' in message) {
        streamidData = message.streamid
        streamidDDR = message.sourceid[message.sourceid.length - 1]
        console.log('New data source', streamidDDR)
        udpPort = message.port
        console.log(`  Aquired a new data streamid:${streamidData}, Port:${udpPort}`)
      } else {
        console.log('Did not get a streamid.')
        return ('error')
      }
      return ('done')
    },
  }

  processing.DisconnectStream = {
    start() {
      let request = `{"function":"disconnect","streamid":"${streamidData}","token":"${token}"}`
      console.log(`Disconnecting stream: ${streamidData}`)
      client.write(request)
      sleep(100)

      request = `{"function":"disconnect","streamid":"${streamidCS}","token":"${token}"}`
      console.log(`Disconnecting stream: ${streamidCS}`)
      client.write(request)
      sleep(100)

      console.log(`Disconnecting stream: ${streamidCR}`)
      request = `{"function":"disconnect","streamid":"${streamidCR}","token":"${token}"}`
      client.write(request)
      sleep(100)

      console.log('Exiting.')
      process.exit()
    },
    process() {
      return ('done')
    },
  }

  // processing functions for server initiated commands
  server.update = {
    process(message) {
      console.log(message)
      lastfunction = 'GetControlReceiverStream'
      processing.GetControlReceiverStream.start()
    },
  }

  const next = (db, key) => {
    const keys = Object.keys(db)
    if (key == null) return keys[0]
    for (let i = 0; i < keys.length; i += 1) if (keys[i] === key) return keys[i + 1]
    return null
  }

  function runClient(func = null) {
    const i = next(processing, func)
    if (typeof i !== 'undefined') {
      console.log(`Working on > ${i}`)
      lastfunction = i
      processing[i].start()
    } else {
      console.log('Finished...')
      client.destroy()
    }
  }

  // create new TCP control client
  client.on('data', (data) => {
    // try to parse data from server
    let message
    try {
      message = JSON.parse(data)
    } catch (e) {
      console.log(`Received message not a proper JSON:${data.toString()}`)
      return
    }

    // processing function send by server for instance to change or close the connection
    if ('function' in message) {
      console.log('checking for correct function')
      server[message.function].process(message)
      return
    }

    // processing result received by server
    if ('statusCode' in message) {
      if (message.statusCode !== 0) {
        console.log('  Function result was an error.')
        if ('message' in message) {
          console.log(`  ${message.message}`)
        }
        return
      }

      // processing result of a request from server
      const result = processing[lastfunction].process(message)
      if (result === 'continue') {
        runClient(lastfunction)
      }

      // after succesful login and stream aquisition start receiving packets
      // eslint-disable-next-line no-use-before-define
      if (result === 'done') if (!udpregistered) forwardData()

      return
    }
    console.log(`Message not understood: ${data.toString()}`)
  })


  // for now exit when control connection is lost (we should reestablish this)
  client.on('close', () => {
    console.log('Contorol connection closed.')
    process.exit()
  })

  client.on('error', (ex) => {
    console.log(ex)
    console.log('\x1b[31m%s\x1b[0m', 'Connection error: Is the relay running?')
  })

  client.connect(TCPControl, IPControl, () => {
    console.log('Connected, Starting...')
    runClient()
  })


  process.on('SIGINT', cleanup)

  function forward(msg) {
    process.stdout.write('D')
    udp.send(msg, SendToDataPort, SendToDataIP, (err) => {
      if (err) console.log('socket error', err)
    })
  }

  function forwardData() {
    const num = 0
    const pings = []

    console.log(`running with target ${IPControl}:${udpPort}`)

    function sendData() {
      pings[num] = Date.now()

      // initiate control stream receiver
      let data = num.toString()
      let header = {
        id: streamidCR,
        time: Date.now(),
      }
      header = JSON.stringify(header)
      header = Buffer.from(header)
      data = Buffer.from(data)
      headerSize.writeUInt16LE(header.length, 0)
      headerSize.writeUInt32LE(data.length, 2)

      let packet = [headerSize, header, data]
      let message = Buffer.concat(packet)

      udp.send(message, udpPort, IPControl, (err) => {
        process.stdout.write('C')
        if (err) console.log('socket error', err)
      })

      // initiate data stream receiver
      data = num.toString()
      header = {
        id: streamidData,
        time: Date.now(),
      }
      header = JSON.stringify(header)
      header = Buffer.from(header)
      data = Buffer.from(data)
      headerSize.writeUInt16LE(header.length, 0)
      headerSize.writeUInt32LE(data.length, 2)

      packet = [headerSize, header, data]
      message = Buffer.concat(packet)

      udp.send(message, udpPort, IPControl, (err) => {
        if (err) console.log('socket error', err)
      })


      udp.on('message', (message1) => {
        // unpack message
        const headerSize1 = message1.readUInt16LE(0)
        const dataSize1 = message1.readUInt32LE(2)
        const header1 = message1.toString('ascii', 6, headerSize1 + 6)
        const msg = Buffer.allocUnsafe(dataSize1)
        message1.copy(msg, 0, 6 + headerSize1)

        try {
          header = JSON.parse(header1)
        } catch (e) {
          console.log(`error during parsing ${e}`)
          return console.error(e)
        }
        // send unpacked message
        if (header1.id === streamidDDR) {
          // console.log(`forwarded data message to ${SendToDataIP}:${SendToDataPort}`);
          setTimeout(forward, Delay, msg)
        } else
        if (header1.id === streamidCDR) {
          if (CommandBack !== 0) {
            process.stdout.write('B')
            serverC.send(msg, CommandBack, SendToControlIP, (err) => {
              if (err) console.log('socket error', err)
            })
            // console.log(`forwarded commandback message to ${SendToControlIP}:${CommandBack}`);
            // console.log(msg);
          } else console.log('Dont have command port for Unity')
        } else console.log(`Unknown streamid ${header1.id}`)

        // console.log(msg);
        return null
      })
    }

    udpregistered = true

    sendData()
  }


  // Setup to listen and send for control messages from/to optitrack
  // serverC.bind({adress: CommandIP, port: CommandPort});
  console.log('trying to bind command port')
  serverC.bind({ port: SendToControlPort })

  serverC.on('error', (err) => {
    console.log(`server error:\n${err.stack}`)
    serverC.close()
  })

  serverC.on('message', (msg, rinfo) => {
    // console.log(`forwarding command message from ${rinfo.address}:${rinfo.port}`);
    // console.log(msg);
    CommandBack = rinfo.port
    if (udpPort !== 0) {
      let header = {
        id: streamidCS,
        time: Date.now(),
      }
      header = JSON.stringify(header)
      header = Buffer.from(header)
      const data = msg
      headerSize.writeUInt16LE(header.length, 0)
      headerSize.writeUInt32LE(data.length, 2)

      const packet = [headerSize, header, data]
      const message = Buffer.concat(packet)

      udp.send(message, udpPort, IPControl, (err) => {
        if (err) console.log('socket error', err)
      })
    }
  })

  serverC.on('listening', () => {
    const address = serverC.address()
    console.log(`server (command) listening ${address.address}:${address.port}`)
    serverC.setMulticastTTL(128)
    serverC.addMembership('239.255.42.99', '127.0.0.1')
  })
}

start()
