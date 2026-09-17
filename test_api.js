const axios = require('axios');

async function run() {
    try {
        const uid = "TEST_API_UID_" + Date.now();
        console.log("=== 1. CREATING JOB ===");
        const createRes = await axios.post('http://127.0.0.1:3001/api/v4/mobile_v2/create', {
            uid: uid,
            link: "https://m.facebook.com/watch/?v=1665104168953772",
            platform: "facebook",
            type: "post",
            linkTypeName: "Love",
            maxCount: 100,
            likeCount: 0,
            comments: []
        });
        console.log("Create Response Status:", createRes.status);
        console.log("Create Response Data:", createRes.data);

        console.log("\n=== 2. GETTING JOBS ===");
        const getRes = await axios.get(`http://127.0.0.1:3001/api/v4/mobile_v2/jobs/${uid}`);
        console.log("Get Response Status:", getRes.status);
        console.log("Get Response Data:\n", JSON.stringify(getRes.data, null, 2));

    } catch (e) {
        console.error("Error:", e.response ? e.response.data : e.message);
    }
}
run();
