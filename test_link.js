const TargetResolver = require('./v2/core/TargetResolver');

// NOTE: If this cookie gets a Checkpoint (locked), you may need to replace it with a fresh one
// for private links. Public video links might still work even if the cookie is restricted.
const cookieString = 'datr=EjObaq-F0UUq98HG-fmIrD16; sb=EzObaqxZZvOcQ6-4r5SfaG1j; m_pixel_ratio=2; wd=360x802; c_user=61593938827541; fr=0eUAMgEdBkTeaSq9Y.AWd87zwpEZLRIU7m86QJSVIueZIz10PXCZocN6XllN9i50n8Wxw.BqmzMT..AAA.0.0.BqmzSc.AWeRiW6p1x4ylWdD1mI0-HU-Vv0; xs=20%3Ag6KP35B_YmQkOg%3A2%3A1788556446%3A-1%3A-1';

const url = process.argv[2];
const actionType = process.argv[3] || 'like';

if (!url) {
    console.log('Usage: node test_link.js "<URL>" "[actionType]"');
    console.log('Example: node test_link.js "https://m.facebook.com/watch/?v=1665104168953772" "love"');
    process.exit(1);
}

(async () => {
    console.log(`\nTesting URL: ${url}`);
    console.log(`Action Type: ${actionType}`);
    console.log('Running Stealth extraction (Mobile Logic)...\n');
    
    const target = await TargetResolver.resolveWithStealth(url, actionType, cookieString);
    
    console.log('--------------------------------------------------');
    console.log('=> 🎯 Extracted Mobile ID:', target);
    console.log('--------------------------------------------------');
    
    if (target === null) {
        console.log('\n⚠️ WARNING: Returned null. This usually means either:');
        console.log('1. The link is invalid or strictly private.');
        console.log('2. The test cookie is currently locked by a Checkpoint. (Please update the cookie in this script if so).');
    }
})();
