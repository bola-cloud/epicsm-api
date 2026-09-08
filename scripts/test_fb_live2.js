const IDExtractor = require('../v2/core/IDExtractor');
const fbCookies = "datr=gEqXaposcKtESUNcK84h7icY; sb=gEqXatW2f3X40hSGLnSKsRe3; m_pixel_ratio=2.8125; wd=384x832; c_user=61593670575990; xs=15%3AuO_63rUubun3Ng%3A2%3A1788300248%3A-1%3A-1; fr=0F2XZHtaoRSs5oVDZ.AWe1E8O2-ZAgB0bjVcw4tPs7XVYS6Mw9YIhZhB5O_OrVVDb_Vf0.Bql0qA..AAA.0.0.Bql0vf.AWdhX2aPLqhLPFTH2tzLpgn3s3g; locale=fr_FR; pas=61593670575990%3Avi8eVPaLag";

async function runTest() {
    const fbPostUrl = "https://www.facebook.com/photo.php?fbid=1704579754361022";
    const fbPostResult = await IDExtractor.extractFacebookTarget(fbPostUrl, fbCookies);
    console.log(`Result FB Post:`, fbPostResult);
}
runTest();
