const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
puppeteer.use(StealthPlugin());

const cookieString = 'datr=BYKeasELMMeRhwluVeOf8mDG; c_user=61594001050059; xs=10%3AKjtgzWHZU0XC3Q%3A2%3A1788772889%3A-1%3A-1; sb=BYKeajapQwLSoGa5ZQ62PRpF; ps_l=1; ps_n=1; m_pixel_ratio=3; wd=360x804; fr=0rEscdvFNCacvgi3I.AWc9TAfSFh3pSeGfYMzJGW8DzcVTzaqjSfa59zeG1iQJyKpc5fE.BqnoIF..AAA.0.0.BqnoIe.AWcjS4_GEXpGeolE7pqWzDKIK8c; locale=ar_AR; pas=61594001050059%3AFcG2TQFFxS; wl_cbv=v2%3Bclient_version%3A3275%3Btimestamp%3A1788772894; fbl_st=101027419%3BT%3A29812881; vpd=v1%3B701x360x3';

const tests = [
    { url: 'https://m.facebook.com/watch/?v=1665104168953772', expected: '1616020456558883' },
    { url: 'https://m.facebook.com/reel/2026690491566753/?referral_source=reshare_feed_unit', expected: '1465054465635144' }
];

async function run() {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1920,1080']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    const cookies = cookieString.split('; ').map(c => {
        const [name, ...rest] = c.split('=');
        return { name: name.trim(), value: rest.join('=').trim(), domain: '.facebook.com' };
    });
    await page.setCookie(...cookies);
    
    for (let i = 0; i < tests.length; i++) {
        let allResponseData = '';
        const responseHandler = async (response) => {
            const u = response.url();
            if (u.includes('graphql') || u.includes('api/graphql') || u.includes('/ajax/')) {
                try { allResponseData += await response.text(); } catch (e) {}
            }
        };
        page.on('response', responseHandler);
        
        console.log(`\nTesting ${tests[i].url}`);
        await page.goto(tests[i].url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 8000));
        
        const html = await page.content();
        const combined = html + '\n' + allResponseData;
        fs.writeFileSync(`dump_${i}.html`, combined);
        
        console.log(`Searching for ${tests[i].expected} in dump_${i}.html`);
        const matches = [...combined.matchAll(new RegExp(`.{0,50}${tests[i].expected}.{0,50}`, 'g'))];
        for (let j = 0; j < Math.min(5, matches.length); j++) {
            console.log(`Match ${j}: ${matches[j][0]}`);
        }
        
        page.off('response', responseHandler);
    }
    
    await browser.close();
}
run();
