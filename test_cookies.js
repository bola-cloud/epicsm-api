const axios = require('axios');
async function run() {
    try {
        const res = await axios.post('https://api.epicsm.goviral.ma/api/v4/mobile_v2/cookies/facebook', {
            uid: "mejcpkcvJtfOuN4i1gjP5vEg5zz2",
            cookies: "test_cookies"
        });
        console.log("Success:", res.data);
    } catch(err) {
        console.log("Error:", err.response ? err.response.data : err.message);
    }
}
run();
