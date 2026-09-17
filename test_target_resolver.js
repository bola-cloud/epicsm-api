const mongoose = require('mongoose');
const TargetResolver = require('./new_target_resolver');

const MONGODB_URI = 'mongodb://admin:6DCpv1sgCUVa6g9to26QdFXnr@95.111.244.177:28018/flyker?authSource=admin';

const testUrls = [
    { url: 'https://m.facebook.com/leomessi/', expected: '100044447978953' },
    { url: 'https://m.facebook.com/photo.php?fbid=1615690693258526', expected: '100044528315651_1615691583258437' },
    { url: 'https://m.facebook.com/watch/?v=1665104168953772', expected: '1616020456558883' },
    { url: 'https://m.facebook.com/story.php?story_fbid=1015998841442001&id=100090956834480', expected: '100090956834480_1015998841442001' },
    { url: 'https://m.facebook.com/reel/2026690491566753/?referral_source=reshare_feed_unit', expected: '1465054465635144' },
    // Also the Sad post from the dashboard issue (not in Untitled-1, but the original issue!)
    { url: 'https://www.facebook.com/photo/?fbid=1642415793919349&set=a.268897534604522', expected: '1642415793919349_1642416780585917' } // wait! The Sad post actually resolved to this in my log! Let's see if the rewrite keeps it.
];

async function runTests() {
    try {
        await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        const db = mongoose.connection.db;
        const cookieDoc = await db.collection('admincookies').findOne({ platform: 'facebook' });
        
        let cookieString = '';
        if (cookieDoc && cookieDoc.cookieString) {
            cookieString = cookieDoc.cookieString;
            console.log('Found Facebook cookie in DB.');
        } else {
            console.log('No Facebook cookie found in DB, relying on TargetResolver fallback or empty cookie.');
        }

        let passed = 0;
        let failed = 0;

        for (const item of testUrls) {
            console.log(`\nTesting URL: ${item.url}`);
            const result = await TargetResolver.resolve('facebook', item.url, item.url.includes('leomessi') ? 'follow' : 'like', cookieString);
            
            if (result === item.expected) {
                console.log(`✅ SUCCESS: ${result} (Expected: ${item.expected})`);
                passed++;
            } else {
                console.log(`❌ FAILED: ${result} (Expected: ${item.expected})`);
                failed++;
            }
        }
        
        console.log(`\n--- Test Results ---`);
        console.log(`Passed: ${passed}/${testUrls.length}`);
        console.log(`Failed: ${failed}/${testUrls.length}`);
    } catch (e) {
        console.error("Test failed to run:", e);
    } finally {
        await mongoose.disconnect();
    }
}

runTests();
