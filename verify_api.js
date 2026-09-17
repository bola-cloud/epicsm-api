const axios = require('axios');
async function test() {
    try {
        const uid = "100044528315651"; // Real UID or random
        const res = await axios.get(`http://127.0.0.1:3000/api/v4/mobile_v2/jobs/${uid}?page=1&limit=2`);
        console.log(JSON.stringify(res.data, null, 2));
    } catch(err) {
        console.error(err.response ? err.response.data : err.message);
    }
}
test();
