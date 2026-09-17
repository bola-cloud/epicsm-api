const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const TargetResolver = require('./v2/core/TargetResolver');

const cookieString = 'datr=BYKeasELMMeRhwluVeOf8mDG; c_user=61594001050059; xs=10%3AKjtgzWHZU0XC3Q%3A2%3A1788772889%3A-1%3A-1; sb=BYKeajapQwLSoGa5ZQ62PRpF; ps_l=1; ps_n=1; m_pixel_ratio=3; wd=360x804; fr=0rEscdvFNCacvgi3I.AWc9TAfSFh3pSeGfYMzJGW8DzcVTzaqjSfa59zeG1iQJyKpc5fE.BqnoIF..AAA.0.0.BqnoIe.AWcjS4_GEXpGeolE7pqWzDKIK8c; locale=ar_AR; pas=61594001050059%3AFcG2TQFFxS; wl_cbv=v2%3Bclient_version%3A3275%3Btimestamp%3A1788772894; fbl_st=101027419%3BT%3A29812881; vpd=v1%3B701x360x3';

const tests = [
    { url: 'https://m.facebook.com/leomessi/', type: 'follow', expected: '100044447978953', platform: 'facebook' },
    { url: 'https://m.facebook.com/photo.php?fbid=1615690693258526', type: 'like', expected: '100044528315651_1615691583258437', platform: 'facebook' },
    { url: 'https://m.facebook.com/watch/?v=1665104168953772', type: 'love', expected: '1616020456558883', platform: 'facebook' },
    { url: 'https://m.facebook.com/story.php?story_fbid=1015998841442001&id=100090956834480', type: 'care', expected: '100090956834480_1015998841442001', platform: 'facebook' },
    { url: 'https://m.facebook.com/reel/2026690491566753/?referral_source=reshare_feed_unit', type: 'haha', expected: '1465054465635144', platform: 'facebook' },
    { url: 'https://www.instagram.com/leomessi/p/DZifppZj_cB/', type: 'like', expected: '3918833827158423297', platform: 'instagram' },
    { url: 'https://www.instagram.com/leomessi/', type: 'follow', expected: '427553890', platform: 'instagram' }
];

async function stealthResolve(url, type, platform, browser) {
    if (platform === 'instagram') {
        // We might not even need a browser for some IG links
        if (type === 'like' || type === 'love') {
            return TargetResolver.decodeShortcodeToMediaId(url.match(/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/)[1]);
        }
    }

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    if (platform === 'facebook') {
        const cookies = cookieString.split('; ').map(c => {
            const [name, ...rest] = c.split('=');
            return { name: name.trim(), value: rest.join('=').trim(), domain: '.facebook.com' };
        });
        await page.setCookie(...cookies);
    }

    let allResponseData = '';
    const responseHandler = async (response) => {
        const u = response.url();
        if (u.includes('graphql') || u.includes('api/graphql') || u.includes('/ajax/') || u.includes('web_profile_info')) {
            try { allResponseData += await response.text(); } catch (e) {}
        }
    };
    page.on('response', responseHandler);

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 6000)); // wait for client-side render
        
        const html = await page.content();
        const combined = html + '\n' + allResponseData;
        
        let target = null;
        if (platform === 'facebook') {
            target = TargetResolver._resolveNormalFromFullHtml(combined, type);
            if (!target) {
                const ownerMatch = combined.match(/content_owner_id_new[^0-9]{0,40}(\d{6,})/i) ||
                                   combined.match(/"owner_id":"(\d{6,})"/i) ||
                                   combined.match(/"page_id":"(\d{6,})"/i) ||
                                   combined.match(/"userID":"(\d{6,})"/i);
                const postMatch = combined.match(/top_level_post_id[^0-9]{0,40}(\d{6,})/i) ||
                                  combined.match(/"post_id":"(\d{6,})"/i) ||
                                  combined.match(/&quot;video_id&quot;:&quot;(\d{6,})&quot;/i);
                
                if (type === 'follow') {
                    if (ownerMatch) target = ownerMatch[1];
                } else {
                    if (ownerMatch && postMatch) target = `${ownerMatch[1]}_${postMatch[1]}`;
                    else if (postMatch) target = postMatch[1];
                    else if (ownerMatch) target = ownerMatch[1];
                }
            }
            if (target === '61594001050059') target = null; // Ignore our own c_user
        } else if (platform === 'instagram' && type === 'follow') {
            const idMatch = combined.match(/"id":"(\d+)"/) || combined.match(/"profile_id":"(\d+)"/);
            if (idMatch) target = idMatch[1];
        }
        
        await page.close();
        return target;
    } catch (e) {
        await page.close();
        return null;
    }
}

async function run() {
    console.log('Launching stealth browser...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1920,1080']
    });

    for (const test of tests) {
        console.log(`\nURL: ${test.url} (${test.type})`);
        const target = await stealthResolve(test.url, test.type, test.platform, browser);
        console.log(`Mobile App ID: ${test.expected}`);
        console.log(`Stealth ID:    ${target}`);
        
        if (target === test.expected) {
            console.log('✅ PERFECT MATCH!');
        } else {
            console.log('❌ MISMATCH');
        }
    }
    await browser.close();
    console.log('\nAll done.');
}

run();
