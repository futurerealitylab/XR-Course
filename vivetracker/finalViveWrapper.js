/* eslint-disable max-len */
// V3.0.0.0
// Receive data on port and forward to connected stream

const {find, map, object} = require('underscore')
const {Vector3, Quaternion} = require('math3d')
const dgram = require('dgram')
const corelink = require('../../clients/javascript/corelink.lib')

const ReceiverPort = 1511 // vive data on this port

const username = 'Testuser' // username to connect as
const password = 'Testpassword' // password to coinnect with

const workspace = 'Chalktalk'
const protocol = 'ws'
const datatype = ['init']

const ControlPort = 20012
const ControlIP = 'corelink.hpc.nyu.edu'

// End Setup ---

const start = async () => {

  let sender
  if (await corelink.connect({username,password}, {ControlPort, ControlIP}).catch((err) => { console.log(err) })) {
    sender = await corelink.createSender({
      workspace,
      protocol,
      type: datatype,
    }).catch((err) => { console.log(err) })
    console.log(sender)
  }


  function cleanup() {
    console.log('Cleanup Streams...')
  }

  process.on('SIGINT', cleanup)


  function parseViveData(strdata) {
    const data = JSON.parse(strdata)
    // TODO: how should we actually map trackers to hands?
    // some sort of registration/setup might be necessary
    const lefthand = find(data, (obj) => obj.id === 'LeftHand')
    const righthand = find(data, (obj) => obj.id === 'RightHand')
    const headtracker = find(data, (obj) => obj.id === 'Head')
    const pelvis = find(data, (obj) => obj.id === 'Pelvis')
    const leftfoot = find(data, (obj) => obj.id === 'LeftFoot')
    const rightfoot = find(data, (obj) => obj.id === 'RightFoot')
    const vivetracker1 = find(data, (obj) => obj.id === 'ViveTracker1')
    const vivetracker2 = find(data, (obj) => obj.id === 'ViveTracker2')
    const vivetracker3 = find(data, (obj) => obj.id === 'ViveTracker3')
    const vivetracker4 = find(data, (obj) => obj.id === 'ViveTracker4')
    

    const LeftHand = {
      name: 'LeftHand',
      position: lefthand ? (new Vector3(
        parseFloat(lefthand.x || '0'),
        parseFloat(lefthand.y || '0'),
        parseFloat(lefthand.z || '0'),
      ))
        : Vector3.zero,
      rotation: lefthand ? (new Quaternion(
        parseFloat(lefthand.qx || '0'),
        parseFloat(lefthand.qy || '0'),
        parseFloat(lefthand.qz || '0'),
        parseFloat(lefthand.qw || '1'),
      ))
        : Quaternion.identity,
    }
    const RightHand = {
      name: 'RightHand',
      position: righthand ? (new Vector3(
        parseFloat(righthand.x || '0'),
        parseFloat(righthand.y || '0'),
        parseFloat(righthand.z || '0'),
      ))
        : Vector3.zero,
      rotation: righthand ? (new Quaternion(
        parseFloat(righthand.qx || '0'),
        parseFloat(righthand.qy || '0'),
        parseFloat(righthand.qz || '0'),
        parseFloat(righthand.qw || '1'),
      ))
        : Quaternion.identity,
    }
    const Head = {
      name: 'Head',
      position: headtracker ? (new Vector3(
        parseFloat(headtracker.x || '0'),
        parseFloat(headtracker.y || '0'),
        parseFloat(headtracker.z || '0'),
      ))
        : Vector3.zero,
      rotation: headtracker ? (new Quaternion(
        parseFloat(headtracker.qx || '0'),
        parseFloat(headtracker.qy || '0'),
        parseFloat(headtracker.qz || '0'),
        parseFloat(headtracker.qw || '1'),
      ))
        : Quaternion.identity,
    }
    const Pelvis = {
      name: 'Pelvis',
      position: pelvis ? (new Vector3(
        parseFloat(pelvis.x || '0'),
        parseFloat(pelvis.y || '0'),
        parseFloat(pelvis.z || '0'),
      ))
        : Vector3.zero,
      rotation: pelvis ? (new Quaternion(
        parseFloat(pelvis.qx || '0'),
        parseFloat(pelvis.qy || '0'),
        parseFloat(pelvis.qz || '0'),
        parseFloat(pelvis.qw || '1'),
      ))
        : Quaternion.identity,
    }
    const LeftFoot = {
      name: 'LeftFoot',
      position: leftfoot ? (new Vector3(
        parseFloat(leftfoot.x || '0'),
        parseFloat(leftfoot.y || '0'),
        parseFloat(leftfoot.z || '0'),
      ))
        : Vector3.zero,
      rotation: leftfoot ? (new Quaternion(
        parseFloat(leftfoot.qx || '0'),
        parseFloat(leftfoot.qy || '0'),
        parseFloat(leftfoot.qz || '0'),
        parseFloat(leftfoot.qw || '1'),
      ))
        : Quaternion.identity,
    }
    const RightFoot = {
      name: 'RightFoot',
      position: rightfoot ? (new Vector3(
        parseFloat(rightfoot.x || '0'),
        parseFloat(rightfoot.y || '0'),
        parseFloat(rightfoot.z || '0'),
      ))
        : Vector3.zero,
      rotation: rightfoot ? (new Quaternion(
        parseFloat(rightfoot.qx || '0'),
        parseFloat(rightfoot.qy || '0'),
        parseFloat(rightfoot.qz || '0'),
        parseFloat(rightfoot.qw || '1'),
      ))
        : Quaternion.identity,
    }

    const ViveTracker1 = {
      name: 'ViveTracker1',
      position: vivetracker1 ? (new Vector3(
        parseFloat(vivetracker1.x || '0'),
        parseFloat(vivetracker1.y || '0'),
        parseFloat(vivetracker1.z || '0'),
      ))
        : Vector3.zero,
      rotation: vivetracker1 ? (new Quaternion(
        parseFloat(vivetracker1.qx || '0'),
        parseFloat(vivetracker1.qy || '0'),
        parseFloat(vivetracker1.qz || '0'),
        parseFloat(vivetracker1.qw || '1'),
      ))
        : Quaternion.identity,
    }

    const ViveTracker2 = {
      name: 'ViveTracker2',
      position: vivetracker2 ? (new Vector3(
        parseFloat(vivetracker2.x || '0'),
        parseFloat(vivetracker2.y || '0'),
        parseFloat(vivetracker2.z || '0'),
      ))
        : Vector3.zero,
      rotation: vivetracker2 ? (new Quaternion(
        parseFloat(vivetracker2.qx || '0'),
        parseFloat(vivetracker2.qy || '0'),
        parseFloat(vivetracker2.qz || '0'),
        parseFloat(vivetracker2.qw || '1'),
      ))
        : Quaternion.identity,
    }

    const ViveTracker3 = {
      name: 'ViveTracker3',
      position: vivetracker3 ? (new Vector3(
        parseFloat(vivetracker3.x || '0'),
        parseFloat(vivetracker3.y || '0'),
        parseFloat(vivetracker3.z || '0'),
      ))
        : Vector3.zero,
      rotation: vivetracker3 ? (new Quaternion(
        parseFloat(vivetracker3.qx || '0'),
        parseFloat(vivetracker3.qy || '0'),
        parseFloat(vivetracker3.qz || '0'),
        parseFloat(vivetracker3.qw || '1'),
      ))
        : Quaternion.identity,
    }

    const ViveTracker4 = {
      name: 'ViveTracker4',
      position: vivetracker4 ? (new Vector3(
        parseFloat(vivetracker4.x || '0'),
        parseFloat(vivetracker4.y || '0'),
        parseFloat(vivetracker4.z || '0'),
      ))
        : Vector3.zero,
      rotation: vivetracker4 ? (new Quaternion(
        parseFloat(vivetracker4.qx || '0'),
        parseFloat(vivetracker4.qy || '0'),
        parseFloat(vivetracker4.qz || '0'),
        parseFloat(vivetracker4.qw || '1'),
      ))
        : Quaternion.identity,
    }
  

    const fromToVectorRotation = (v1, v2) => {
      const cross = v1.cross(v2)
      const dot = v1.dot(v2)
      // eslint-disable-next-line no-mixed-operators
      return Quaternion.AngleAxis(cross, 180 / Math.PI * Math.acos(dot))
    }

    let bones = [Pelvis, Head, LeftHand, RightHand, LeftFoot, RightFoot, ViveTracker1, ViveTracker2, ViveTracker3, ViveTracker4]

    bones = map(bones, (bone) => ({
      Id: bone.name,
      Position: {
        x: bone.position.x,
        y: bone.position.y,
        z: bone.position.z,
      },
      Quaternion: {
        qx: bone.rotation.x,
        qy: bone.rotation.y,
        qz: bone.rotation.z,
        qw: bone.rotation.w,
      }
    }))

    // var bones = [head, righthand, lefthand];
    let bonesobj = object(map(bones, (bone) => bone.name), bones)
    //let vivetrack = object(map(vives, (vive) => vives), vive)
    //console.log("vive", vives)
    let viveInfo = 
    {
      "Bones": bonesobj,
      "timestamp": Date.now(),
      "type": "Skeleton",
    }
   
    return viveInfo
  }


  // setup to listen for data from vive emitter
  const server = dgram.createSocket('udp4')
  console.log(`trying to bind data port to ${ReceiverPort}`)
  // server.bind({adress: ReceiverIP, port: ReceiverPort});
  // bind to all adresses
  server.bind({ port: ReceiverPort })

  server.on('error', (err) => {
    console.log(`server error:\n${err.stack}`)
    server.close()
  })


  server.on('message', (msg) => {
    const data = Buffer.from(JSON.stringify(parseViveData(msg)))
    corelink.send(sender, data)
  })

  server.on('listening', () => {
    const address = server.address()
    console.log(`server (receiver) listening ${address.address}:${address.port}`)
    server.setMulticastTTL(128)
    server.addMembership('239.255.42.99', '127.0.0.1')
  })
}

start()
