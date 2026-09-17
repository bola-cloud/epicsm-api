const TargetResolver = require('./v2/core/TargetResolver');

const cookieString = 'datr=BYKeasELMMeRhwluVeOf8mDG; c_user=61594001050059; xs=10%3AKjtgzWHZU0XC3Q%3A2%3A1788772889%3A-1%3A-1; sb=BYKeajapQwLSoGa5ZQ62PRpF; ps_l=1; ps_n=1; m_pixel_ratio=3; wd=360x804; fr=0rEscdvFNCacvgi3I.AWc9TAfSFh3pSeGfYMzJGW8DzcVTzaqjSfa59zeG1iQJyKpc5fE.BqnoIF..AAA.0.0.BqnoIe.AWcjS4_GEXpGeolE7pqWzDKIK8c; locale=ar_AR; pas=61594001050059%3AFcG2TQFFxS; wl_cbv=v2%3Bclient_version%3A3275%3Btimestamp%3A1788772894; fbl_st=101027419%3BT%3A29812881; vpd=v1%3B701x360x3';

const tests = [
    { url: 'https://m.facebook.com/watch/?v=1665104168953772', type: 'love', expected: '1616020456558883', platform: 'facebook' },
    { url: 'https://m.facebook.com/reel/2026690491566753/?referral_source=reshare_feed_unit', type: 'haha', expected: '1465054465635144', platform: 'facebook' },
    { url: 'https://m.facebook.com/photo.php?fbid=1615690693258526', type: 'like', expected: '100044528315651_1615691583258437', platform: 'facebook' }
];

async function run() {
    for (const test of tests) {
        console.log(`\nURL: ${test.url} (${test.type})`);
        const target = await TargetResolver.resolve(test.platform, test.url, test.type, cookieString);
        console.log(`Mobile App ID: ${test.expected}`);
        console.log(`Stealth ID:    ${target}`);
        
        if (target === test.expected) {
            console.log('✅ PERFECT MATCH!');
        } else {
            console.log('❌ MISMATCH');
        }
    }
    console.log('Done.');
}
run();
