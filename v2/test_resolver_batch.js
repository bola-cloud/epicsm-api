const TargetResolver = require('./core/TargetResolver');
const cookies = 'c_user=100012345;'; // mock cookies

async function runTests() {
    console.log("=== FACEBOOK TESTS ===");
    const fbLinks = [
        { id: "FB_FOLLOW_001", url: "https://m.facebook.com/leomessi/", type: "follow" },
        { id: "FB_LIKE_001", url: "https://m.facebook.com/photo.php?fbid=1615690693258526", type: "like" },
        { id: "FB_LOVE_001", url: "https://m.facebook.com/watch/?v=1665104168953772", type: "like" },
        { id: "FB_CARE_001", url: "https://m.facebook.com/story.php?story_fbid=1015998841442001&id=100090956834480", type: "like" },
        { id: "FB_HAHA_001", url: "https://m.facebook.com/reel/2026690491566753/?referral_source=reshare_feed_unit", type: "like" }
    ];

    for (let link of fbLinks) {
        try {
            const res = await TargetResolver.resolve('facebook', link.url, link.type, cookies);
            console.log(`${link.id}: Expected ??? | Got: ${res}`);
        } catch (e) {
            console.log(`${link.id}: Error ${e.message}`);
        }
    }

    console.log("\n=== INSTAGRAM TESTS ===");
    const igLinks = [
        { id: "IG_LIKE_001", url: "https://www.instagram.com/leomessi/p/DZifppZj_cB/", type: "like" }
    ];
    for (let link of igLinks) {
        try {
            const res = await TargetResolver.resolve('instagram', link.url, link.type, cookies);
            console.log(`${link.id}: Expected ??? | Got: ${res}`);
        } catch (e) {
             console.log(`${link.id}: Error ${e.message}`);
        }
    }
}
runTests();
