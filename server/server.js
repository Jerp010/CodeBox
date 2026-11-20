const { server } = require('./networking/websocket.js')
const port = 3000

server.listen(port, () => {
    console.log("CodeBox server is running on port 3000")
});