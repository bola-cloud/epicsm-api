const axios = require('axios');

// Cookie string extracted from user input
const cookies = 'datr=BYKeasELMMeRhwluVeOf8mDG; c_user=61594001050059; xs=10%3AKjtgzWHZU0XC3Q%3A2%3A1788772889%3A-1%3A-1; sb=BYKeajapQwLSoGa5ZQ62PRpF; ps_l=1; ps_n=1; m_pixel_ratio=3; wd=360x804; fr=0rEscdvFNCacvgi3I.AWc9TAfSFh3pSeGfYMzJGW8DzcVTzaqjSfa59zeG1iQJyKpc5fE.BqnoIF..AAA.0.0.BqnoIe.AWcjS4_GEXpGeolE7pqWzDKIK8c; locale=ar_AR; pas=61594001050059%3AFcG2TQFFxS; wl_cbv=v2%3Bclient_version%3A3275%3Btimestamp%3A1788772894; fbl_st=101027419%3BT%3A29812881; vpd=v1%3B701x360x3';

async function test() {
    const urls = [
        'https://www.facebook.com/photo.php?fbid=1615690693258526',
        'https://m.facebook.com/photo.php?fbid=1615690693258526',
        'https://m.facebook.com/story.php?story_fbid=1615691583258437&id=100044528315651'
    ];
    
    for (const url of urls) {
        console.log('Testing:', url);
        try {
            const res = await axios({
                method: 'get',
                url: url,
                headers: {
                    'Cookie': cookies,
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 12; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.41 Mobile Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8'
                },
                maxRedirects: 0,
                validateStatus: () => true
            });
            console.log('  Status:', res.status);
            if (res.headers.location) console.log('  Redirect:', res.headers.location);
            if (res.status === 200) {
                const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
                console.log('  Has login?', body.includes('login'));
                console.log('  Has content_owner_id?', body.includes('content_owner_id'));
                console.log('  First 300 chars:', body.substring(0,300));
            }
        } catch(e) {
            console.log('  ERROR:', e.message);
        }
        console.log('---');
    }
}

test();
