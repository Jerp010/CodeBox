/** configure dotenv to target .env file */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env')})

/** entry point */
const { server } = require('./networking/websocket.js')
const port = 3000

const ngrok = require('@ngrok/ngrok');

server.listen(port, () => {
    console.log("CodeBox server is running on port 3000");

    (async function startNgrokTunnel() {
        try {
        const listener = await ngrok.forward({
            addr: port,
            authtoken_from_env: true,
            domain: process.env.NGROK_DOMAIN
        });

        console.log(`Live at: ${listener.url()}`);
        } catch (error) {
            console.error("NGROK FAILED: ", error.message)
        }

    })();
    
});