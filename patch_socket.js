const fs = require('fs');
const path = './v2/sockets/SocketManager.js';
let content = fs.readFileSync(path, 'utf8');

// Replace the start of order_result with a console log
content = content.replace(
    /socket\.on\('order_result', async \(data, ack\) => \{/,
    "socket.on('order_result', async (data, ack) => {\n                    console.log(`[V2 Socket] Received order_result from ${userId}:`, data);"
);

fs.writeFileSync(path, content);
