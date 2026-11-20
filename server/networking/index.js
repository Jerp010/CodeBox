const { WebSocketServer } = require('ws');
const http = require('http');
const server = http.createServer((req, res) => {});
const wss = new WebSocketServer({ server });