const fetch = require('node-fetch');

const cookies = [
    "datr=EjObaq-F0UUq98HG-fmIrD16; sb=EzObaqxZZvOcQ6-4r5SfaG1j; m_pixel_ratio=2; wd=360x802; c_user=61593938827541; fr=0eUAMgEdBkTeaSq9Y.AWd87zwpEZLRIU7m86QJSVIueZIz10PXCZocN6XllN9i50n8Wxw.BqmzMT..AAA.0.0.BqmzSc.AWeRiW6p1x4ylWdD1mI0-HU-Vv0; xs=20%3Ag6KP35B_YmQkOg%3A2%3A1788556446%3A-1%3A-1",
    "datr=BYKeasELMMeRhwluVeOf8mDG; c_user=61594001050059; xs=10%3AKjtgzWHZU0XC3Q%3A2%3A1788772889%3A-1%3A-1; sb=BYKeajapQwLSoGa5ZQ62PRpF; ps_l=1; ps_n=1; m_pixel_ratio=3; wd=360x804; fr=0rEscdvFNCacvgi3I.AWc9TAfSFh3pSeGfYMzJGW8DzcVTzaqjSfa59zeG1iQJyKpc5fE.BqnoIF..AAA.0.0.BqnoIe.AWcjS4_GEXpGeolE7pqWzDKIK8c; locale=ar_AR; pas=61594001050059%3AFcG2TQFFxS; wl_cbv=v2%3Bclient_version%3A3275%3Btimestamp%3A1788772894; fbl_st=101027419%3BT%3A29812881; vpd=v1%3B701x360x3"
];

async function testCookie(index, cookieString) {
    console.log(`\nTesting Cookie ${index + 1}...`);
    try {
        const response = await fetch('https://m.facebook.com/photo.php?fbid=1615690693258526', {
            headers: {
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'accept-language': 'en-US,en;q=0.9,ar;q=0.8',
                'cache-control': 'max-age=0',
                'cookie': cookieString,
                'sec-fetch-dest': 'document',
                'sec-fetch-mode': 'navigate',
                'sec-fetch-site': 'none',
                'sec-fetch-user': '?1',
                'upgrade-insecure-requests': '1',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            redirect: 'manual'
        });
        
        console.log('Status:', response.status);
        console.log('Location (if redirect):', response.headers.get('location'));
        
        if (response.status === 200) {
            console.log(`✅ Cookie ${index + 1} worked! Returned 200 OK.`);
        } else if (response.status === 302 && response.headers.get('location')?.includes('login.php')) {
            console.log(`❌ Cookie ${index + 1} failed. Redirected to login.`);
        } else {
            console.log(`⚠️ Cookie ${index + 1} returned status ${response.status}`);
        }
    } catch (e) {
        console.log(`Error testing cookie ${index + 1}:`, e.message);
    }
}

async function runAll() {
    for (let i = 0; i < cookies.length; i++) {
        await testCookie(i, cookies[i]);
    }
}

runAll();
