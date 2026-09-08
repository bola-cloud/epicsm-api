const IDExtractor = require('../v2/core/IDExtractor');

async function runTest() {
    console.log("=== TARGET RESOLVER LIVE TEST ===");

    // 1. Facebook Test
    const fbCookies = "datr=gEqXaposcKtESUNcK84h7icY; sb=gEqXatW2f3X40hSGLnSKsRe3; m_pixel_ratio=2.8125; wd=384x832; c_user=61593670575990; xs=15%3AuO_63rUubun3Ng%3A2%3A1788300248%3A-1%3A-1; fr=0F2XZHtaoRSs5oVDZ.AWe1E8O2-ZAgB0bjVcw4tPs7XVYS6Mw9YIhZhB5O_OrVVDb_Vf0.Bql0qA..AAA.0.0.Bql0vf.AWdhX2aPLqhLPFTH2tzLpgn3s3g; locale=fr_FR; pas=61593670575990%3Avi8eVPaLag";
    
    console.log("\n[1] Testing Facebook Follow...");
    const fbFollowUrl = "https://m.facebook.com/Cristiano/";
    const fbFollowResult = await IDExtractor.extractFacebookTarget(fbFollowUrl, fbCookies);
    console.log(`Result FB Follow:`, fbFollowResult, `(Expected profileId/ownerId: 100044296486382)`);

    console.log("\n[2] Testing Facebook Reel...");
    const fbReelUrl = "https://m.facebook.com/reel/2026690491566753/?referral_source=reshare_feed_unit";
    const fbReelResult = await IDExtractor.extractFacebookTarget(fbReelUrl, fbCookies);
    console.log(`Result FB Reel:`, fbReelResult);

    console.log("\n[3] Testing Facebook Video/Post...");
    const fbPostUrl = "https://m.facebook.com/photo.php?fbid=1704579754361022";
    const fbPostResult = await IDExtractor.extractFacebookTarget(fbPostUrl, fbCookies);
    console.log(`Result FB Post:`, fbPostResult);

    console.log("\n=== TEST COMPLETE ===");
}

runTest();
