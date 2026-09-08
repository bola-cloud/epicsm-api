const { io } = require("socket.io-client");
const jwt = require("jsonwebtoken");

require('dotenv').config();
// Configuration
const SERVER_URL = "https://api.epicsm.goviral.ma";
const TOTAL_CLIENTS = parseInt(process.argv[2]) || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret'; // The same secret the server uses

console.log(`🚀 Starting V2 Stress Test: Simulating ${TOTAL_CLIENTS} users...`);

let connectedCount = 0;
let jobReceivedCount = 0;
let jobsCompletedCount = 0;

const createFakeToken = (userId) => {
    return jwt.sign({ id: userId, email: `test${userId}@example.com` }, JWT_SECRET);
};

const clients = [];

for (let i = 1; i <= TOTAL_CLIENTS; i++) {
    const userId = `test_uid_firebase_${i}`;
    
    // Stagger connections slightly to prevent instant flooding
    setTimeout(() => {
        const socket = io(SERVER_URL, {
            path: "/v2/socket.io",
            transports: ['websocket'],
            auth: { uid: userId },
        });

        socket.on("connect", () => {
            connectedCount++;
            if (connectedCount % 100 === 0 || connectedCount === 1) {
                console.log(`✅ Connected ${connectedCount}/${TOTAL_CLIENTS} sockets.`);
            }
            
            socket.emit("register_worker", {
                uid: userId,
                country: "all",
                facebookEnabled: true,
                instagramEnabled: true,
                platform: "android",
                appVersion: "2.0.1"
            });
        });

        socket.on("job_assigned", (job) => {
            jobReceivedCount++;
            // Delay > 2.5s to bypass bot protection
            const delay = Math.floor(Math.random() * 1000) + 2600; 
            
            setTimeout(() => {
                socket.emit("order_result", { jobId: job.jobId, success: true }, (response) => {
                    if(response && response.success) {
                        jobsCompletedCount++;
                    } else {
                        console.log(`❌ Failed: ${response.reason}`);
                    }
                });
            }, delay);
        });

        socket.on("connect_error", (err) => {
            // Silenced to avoid spam during high load testing
        });

        clients.push(socket);

    }, i * 20); // Connect a new socket every 20ms (50 per second) to avoid Nginx anti-DDoS blocks
}

// Print stats every 5 seconds for faster feedback during E2E test
setInterval(() => {
    console.log(`📊 STATS: ${connectedCount} online | 📥 Received: ${jobReceivedCount} | 🚀 Completed: ${jobsCompletedCount}`);
}, 5000);
