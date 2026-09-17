const puppeteer = require('puppeteer');

const cookieString = 'datr=BYKeasELMMeRhwluVeOf8mDG; c_user=61594001050059; xs=10%3AKjtgzWHZU0XC3Q%3A2%3A1788772889%3A-1%3A-1; sb=BYKeajapQwLSoGa5ZQ62PRpF; ps_l=1; ps_n=1; m_pixel_ratio=3; wd=360x804; fr=0rEscdvFNCacvgi3I.AWc9TAfSFh3pSeGfYMzJGW8DzcVTzaqjSfa59zeG1iQJyKpc5fE.BqnoIF..AAA.0.0.BqnoIe.AWcjS4_GEXpGeolE7pqWzDKIK8c; locale=ar_AR; pas=61594001050059%3AFcG2TQFFxS; wl_cbv=v2%3Bclient_version%3A3275%3Btimestamp%3A1788772894; fbl_st=101027419%3BT%3A29812881; vpd=v1%3B701x360x3';

async function run() {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Linux; Android 12; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.41 Mobile Safari/537.36');
    
    // Set cookies
    const cookies = cookieString.split('; ').map(c => {
        const [name, ...rest] = c.split('=');
        return { name, value: rest.join('='), domain: '.facebook.com' };
    });
    await page.setCookie(...cookies);
    
    // Intercept network responses to catch GraphQL data
    let allResponseData = '';
    page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('graphql') || url.includes('api/graphql') || url.includes('/ajax/')) {
            try {
                const text = await response.text();
                allResponseData += text;
            } catch (e) {}
        }
    });
    
    const testUrl = 'https://www.facebook.com/photo.php?fbid=1615690693258526';
    console.log(`\n=== Testing: ${testUrl} ===`);
    
    try {
        await page.goto(testUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        console.log('Final URL:', page.url());
        
        if (page.url().includes('login')) {
            console.log('❌ Redirected to login');
            await browser.close();
            return;
        }
        
        // Wait longer for JS / GraphQL to execute
        console.log('Waiting 8s for JS to fully load...');
        await new Promise(r => setTimeout(r, 8000));
        
        // Get the full rendered HTML (after JS)
        const html = await page.content();
        console.log('Rendered HTML length:', html.length);
        
        // Also get all network response data
        console.log('Network data length:', allResponseData.length);
        
        // Search in rendered HTML
        const combined = html + '\n' + allResponseData;
        
        const ownerMatch = combined.match(/content_owner_id_new[^0-9]{0,40}(\d{6,})/i);
        const postMatch = combined.match(/top_level_post_id[^0-9]{0,40}(\d{6,})/i);
        const permalinkMatch = combined.match(/\/permalink\/(\d{6,})\/?/i);
        
        console.log('content_owner_id:', ownerMatch ? ownerMatch[1] : 'NOT FOUND');
        console.log('top_level_post_id:', postMatch ? postMatch[1] : 'NOT FOUND');
        console.log('permalink:', permalinkMatch ? permalinkMatch[1] : 'NOT FOUND');
        
        // More patterns
        const userIdMatch = combined.match(/"userID":"(\d{6,})"/);
        const actorIdMatch = combined.match(/"actorID":"(\d{6,})"/);
        const ownerIdMatch = combined.match(/"owner_id":"(\d{6,})"/);
        const pageIdMatch = combined.match(/"page_id":"(\d{6,})"/);
        
        console.log('userID:', userIdMatch ? userIdMatch[1] : 'NOT FOUND');
        console.log('actorID:', actorIdMatch ? actorIdMatch[1] : 'NOT FOUND');
        console.log('owner_id:', ownerIdMatch ? ownerIdMatch[1] : 'NOT FOUND');
        console.log('page_id:', pageIdMatch ? pageIdMatch[1] : 'NOT FOUND');
        
        // Feedback target (base64)
        const feedbackMatches = combined.match(/ZmVlZGJhY2s6[A-Za-z0-9+/_=-]{10,}/g);
        if (feedbackMatches) {
            console.log('Feedback targets found:', feedbackMatches.length);
            for (const fb of feedbackMatches.slice(0, 5)) {
                try {
                    let value = fb.replace(/-/g, '+').replace(/_/g, '/');
                    while (value.length % 4 !== 0) value += '=';
                    const decoded = Buffer.from(value, 'base64').toString('utf-8');
                    console.log('  Decoded:', decoded);
                } catch (e) {}
            }
        }
        
        // Look for the expected ID in the combined text
        console.log('\nHas 1615691583258437?', combined.includes('1615691583258437'));
        console.log('Has 100044528315651?', combined.includes('100044528315651'));
        console.log('Has 1615690693258526 (fbid)?', combined.includes('1615690693258526'));

        // Save for analysis
        require('fs').writeFileSync('combined_response.txt', combined.substring(0, 500000));
        
        await page.screenshot({ path: 'puppeteer_photo_test.png' });
        
    } catch (e) {
        console.log('Error:', e.message);
    }
    
    await browser.close();
    console.log('\nDone.');
}

run();
