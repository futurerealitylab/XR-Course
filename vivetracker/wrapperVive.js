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
        parseFloat(lefthand.x||NaN),
        parseFloat(lefthand.y||NaN),
        parseFloat(lefthand.z||NaN),
      ))
        : Vector3.zero,
      rotation: lefthand ? (new Quaternion(
        parseFloat(lefthand.qx || NaN),
        parseFloat(lefthand.qy || NaN),
        parseFloat(lefthand.qz || NaN),
        parseFloat(lefthand.qw || NaN),
      ))
        : Quaternion.identity,
    }
    const RightHand = {
      name: 'RightHand',
      position: righthand ? (new Vector3(
        parseFloat(righthand.x || NaN),
        parseFloat(righthand.y || NaN),
        parseFloat(righthand.z || NaN),
      ))
        : Vector3.zero,
      rotation: righthand ? (new Quaternion(
        parseFloat(righthand.qx || NaN),
        parseFloat(righthand.qy || NaN),
        parseFloat(righthand.qz || NaN),
        parseFloat(righthand.qw || NaN),
      ))
        : Quaternion.identity,
    }
    const Head = {
      name: 'Head',
      position: headtracker ? (new Vector3(
        parseFloat(headtracker.x || NaN),
        parseFloat(headtracker.y || NaN),
        parseFloat(headtracker.z || NaN),
      ))
        : Vector3.zero,
      rotation: headtracker ? (new Quaternion(
        parseFloat(headtracker.qx || NaN),
        parseFloat(headtracker.qy || NaN),
        parseFloat(headtracker.qz || NaN),
        parseFloat(headtracker.qw || NaN),
      ))
        : Quaternion.identity,
    }
    const Pelvis = {
      name: 'Pelvis',
      position: pelvis ? (new Vector3(
        parseFloat(pelvis.x || NaN),
        parseFloat(pelvis.y || NaN),
        parseFloat(pelvis.z || NaN),
      ))
        : Vector3.zero,
      rotation: pelvis ? (new Quaternion(
        parseFloat(pelvis.qx || NaN),
        parseFloat(pelvis.qy || NaN),
        parseFloat(pelvis.qz || NaN),
        parseFloat(pelvis.qw || NaN),
      ))
        : Quaternion.identity,
    }
    const LeftFoot = {
      name: 'LeftFoot',
      position: leftfoot ? (new Vector3(
        parseFloat(leftfoot.x || NaN),
        parseFloat(leftfoot.y || NaN),
        parseFloat(leftfoot.z || NaN),
      ))
        : Vector3.zero,
      rotation: leftfoot ? (new Quaternion(
        parseFloat(leftfoot.qx || NaN),
        parseFloat(leftfoot.qy || NaN),
        parseFloat(leftfoot.qz || NaN),
        parseFloat(leftfoot.qw || NaN),
      ))
        : Quaternion.identity,
    }
    const RightFoot = {
      name: 'RightFoot',
      position: rightfoot ? (new Vector3(
        parseFloat(rightfoot.x || NaN),
        parseFloat(rightfoot.y || NaN),
        parseFloat(rightfoot.z || NaN),
      ))
        : Vector3.zero,
      rotation: rightfoot ? (new Quaternion(
        parseFloat(rightfoot.qx || NaN),
        parseFloat(rightfoot.qy || NaN),
        parseFloat(rightfoot.qz || NaN),
        parseFloat(rightfoot.qw || NaN),
      ))
        : Quaternion.identity,
    }

    const ViveTracker1 = {
      name: 'ViveTracker1',
      position: vivetracker1 ? (new Vector3(
        parseFloat(vivetracker1.x || NaN),
        parseFloat(vivetracker1.y || NaN),
        parseFloat(vivetracker1.z || NaN),
      ))
        : Vector3.zero,
      rotation: vivetracker1 ? (new Quaternion(
        parseFloat(vivetracker1.qx || NaN),
        parseFloat(vivetracker1.qy || NaN),
        parseFloat(vivetracker1.qz || NaN),
        parseFloat(vivetracker1.qw || NaN),
      ))
        : Quaternion.identity,
    }

    const ViveTracker2 = {
      name: 'ViveTracker2',
      position: vivetracker2 ? (new Vector3(
        parseFloat(vivetracker2.x || NaN),
        parseFloat(vivetracker2.y || NaN),
        parseFloat(vivetracker2.z || NaN),
      ))
        : Vector3.zero,
      rotation: vivetracker2 ? (new Quaternion(
        parseFloat(vivetracker2.qx || NaN),
        parseFloat(vivetracker2.qy || NaN),
        parseFloat(vivetracker2.qz || NaN),
        parseFloat(vivetracker2.qw || NaN),
      ))
        : Quaternion.identity,
    }

    const ViveTracker3 = {
      name: 'ViveTracker3',
      position: vivetracker3 ? (new Vector3(
        parseFloat(vivetracker3.x || NaN),
        parseFloat(vivetracker3.y || NaN),
        parseFloat(vivetracker3.z || NaN),
      ))
        : Vector3.zero,
      rotation: vivetracker3 ? (new Quaternion(
        parseFloat(vivetracker3.qx || NaN),
        parseFloat(vivetracker3.qy || NaN),
        parseFloat(vivetracker3.qz || NaN),
        parseFloat(vivetracker3.qw || NaN),
      ))
        : Quaternion.identity,
    }

    const ViveTracker4 = {
      name: 'ViveTracker4',
      position: vivetracker4 ? (new Vector3(
        parseFloat(vivetracker4.x || NaN),
        parseFloat(vivetracker4.y || NaN),
        parseFloat(vivetracker4.z || NaN),
      ))
        : Vector3.zero,
      rotation: vivetracker4 ? (new Quaternion(
        parseFloat(vivetracker4.qx || NaN),
        parseFloat(vivetracker4.qy || NaN),
        parseFloat(vivetracker4.qz || NaN),
        parseFloat(vivetracker4.qw || NaN),
      ))
        : Quaternion.identity,
    }
 
    /*
    LHB-820AD555 : ViveTracker1
LHB-40CE6F4E : ViveTracker2
LHB-9EDE8437 : ViveTracker3
LHB-49F4F79E : ViveTracker4
LHR-476A1CF9 : Head
LHR-5A818C85 : LeftHand
LHR-92818789 : RightHand
LHR-72DAD064 : Pelvis
LHR-80D6E89A : LeftFoot
LHR-BD6CE126 : RightFoot
    */

/*
LHR-72DAD064 : T1
LHR-80D6E89A : T2
LHR-BD6CE126 : T3
*/

    // Bones Data format
    let bones = [Pelvis, Head, LeftHand, RightHand, LeftFoot, RightFoot, ViveTracker1, ViveTracker2, ViveTracker3, ViveTracker4]


    bones = map(bones, (bone) => ({
      name: bone.name,
      Position: {
        x: (bone.position.x == 0) ? null : bone.position.x,
        y: (bone.position.y == 0) ? null : bone.position.y,
        z: (bone.position.z == 0) ? null : bone.position.z,
      },
      Quaternion: {
        x: (bone.rotation.x == 0) ? null : bone.rotation.x,
        y: (bone.rotation.y == 0) ? null : bone.rotation.y,
        z: (bone.rotation.z == 0) ? null : bone.rotation.z,
        w: (bone.rotation.w == 1) ? null : bone.rotation.w,
      },
    }))

    //var arrayBones = Object.values(bones);
    let bonesobj = Object.values(object(map(bones, (bone) => bone.name), bones))
    //let vivetrack = object(map(vives, (vive) => vives), vive)
    //console.log("vive", vives)
    let viveInfo = 
    {
      "type": "Skeleton",
      "Bones": bonesobj,
      "timestamp": Date.now(),
    }
   
    return viveInfo;
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
