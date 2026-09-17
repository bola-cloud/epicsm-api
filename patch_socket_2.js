const fs = require('fs');
const path = './v2/sockets/SocketManager.js';
let content = fs.readFileSync(path, 'utf8');

// Replace the order_result logic
content = content.replace(
    /if \(!pendingAction\) \{/,
    "if (!pendingAction) {\n                            console.log(`[V2 Socket] Action not pending for ${jobId} / ${userId}`);"
);

content = content.replace(
    /BatchWriter\.addActionSuccess\(jobId, userId\);/,
    "console.log(`[V2 Socket] Calling BatchWriter for ${jobId} / ${userId}`);\n                        BatchWriter.addActionSuccess(jobId, userId);"
);

fs.writeFileSync(path, content);
