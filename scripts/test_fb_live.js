const IDExtractor = require('./v2/core/IDExtractor');

const cookies = "datr=gEqXaposcKtESUNcK84h7icY; sb=gEqXatW2f3X40hSGLnSKsRe3; m_pixel_ratio=2.8125; wd=384x832; c_user=61593670575990; xs=15%3AuO_63rUubun3Ng%3A2%3A1724967399%3A-1%3A10283; fr=02mI9JmD02zB5j01Z.AWW9F6iYj29cZ7qVjTqT64zUmd0.BmzF_l..AAA.0.0.Bm4K_G.AWXn9WbJmK0";

const urls = [
    "https://www.facebook.com/cristiano/posts/pfbid0251VdvevAokt2qP5X8k49eJ4qM1m4o49g6jWj4x1Jg4p1d8b1Jg4p1d8b", // just a random structure, let's use a real one
    "https://www.facebook.com/permalink.php?story_fbid=pfbid02Y39tU1316eK1nNqK5NqqrW4x4m9f1d&id=100044296486382",
    "https://www.facebook.com/zuck/posts/10114028682110751"
];

async function run() {
    for (const url of urls) {
        console.log(`\nTesting URL: ${url}`);
        const result = await IDExtractor.extractFacebookTarget(url, cookies);
        console.log("Result:", result);
    }
}

run();
