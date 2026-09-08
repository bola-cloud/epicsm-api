const https = require('https');

const data = JSON.stringify({
    uid: 'TEST_E2E',
    targetLink: `https://instagram.com/p/TEST_${Date.now()}`,
    platform: 'instagram',
    actionType: 'like',
    maxCount: 200,
    country: 'all'
});

const options = {
    hostname: 'api.epicsm.goviral.ma',
    port: 443,
    path: '/api/v4/mobile_v2/create',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

console.log("🚀 Firing E2E Test Job to V2 API...");

const req = https.request(options, (res) => {
    let responseBody = '';
    res.on('data', (chunk) => {
        responseBody += chunk;
    });

    res.on('end', () => {
        if (res.statusCode === 201) {
            console.log("✅ E2E Job Created Successfully!");
            console.log("👉 Now watch your test_v2.js terminal to see the 200 sockets execute it!");
        } else {
            console.error(`❌ Failed with status ${res.statusCode}:`, responseBody);
        }
    });
});

req.on('error', (error) => {
    console.error("❌ Error sending request:", error.message);
});

req.write(data);
req.end();
