const express = require('express');
const http = require('http');
const WebSocket = require('ws');





const ws = new WebSocket('ws://localhost:3000')
ws.onopen = () => {
  console.log('ws opened on browser')
  ws.send('hello world')
}

ws.onmessage = (message) => {
  console.log(`message received`, message.data)
}
