const axios = require('axios');
const fs = require('fs');
const readline = require('readline');

// ==========================================
// FACEBOOK RESOLVER LOGIC
// ==========================================
async function resolveFacebookTarget(url, cookieString) {
    console.log(`\n[Facebook] Resolving: ${url}`);
    try {
        let currentUrl = url.replace('m.facebook.com', 'www.facebook.com');
        
        let reelMode = currentUrl.includes('/reel/');
        let videoMode = !reelMode && (currentUrl.includes('/watch') || currentUrl.includes('/videos/'));
        
        console.log(`[Facebook] Mode: Reel=${reelMode}, Video=${videoMode}`);
        
        const response = await axios({
            method: 'get',
            url: currentUrl,
            headers: {
                'Cookie': cookieString,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9'
            },
            maxRedirects: 5,
            responseType: 'stream'
        });

        return new Promise((resolve, reject) => {
            let buffer = '';
            const MAX_BUFFER = 256 * 1024; // 256KB rolling buffer
            
            response.data.on('data', (chunk) => {
                buffer += chunk.toString('utf8');
                if (buffer.length > MAX_BUFFER) {
                    buffer = buffer.substring(buffer.length - MAX_BUFFER);
                }
                
                // If it's a reel, look for feedbackId
                if (reelMode) {
                    const fbMatch = buffer.match(/ZmVlZGJhY2s6[A-Za-z0-9_-]+/);
                    if (fbMatch) {
                        const decoded = Buffer.from(fbMatch[0], 'base64').toString('utf-8');
                        const targetId = decoded.replace('feedback:', '');
                        response.data.destroy();
                        return resolve({ target_id: targetId });
                    }
                } 
                // If normal post, look for owner and post id
                else if (!videoMode) {
                    const postIdMatch = buffer.match(/"post_id":"(\d+)"/);
                    const ownerIdMatch = buffer.match(/"actor_id":"(\d+)"/); // or page_id
                    
                    if (postIdMatch && ownerIdMatch) {
                        const targetId = `${ownerIdMatch[1]}_${postIdMatch[1]}`;
                        response.data.destroy();
                        return resolve({ target_id: targetId });
                    }
                    
                    // Fallback for story_fbid
                    const storyMatch = buffer.match(/story_fbid=(\d+).*?id=(\d+)/);
                    if (storyMatch) {
                        const targetId = `${storyMatch[2]}_${storyMatch[1]}`;
                        response.data.destroy();
                        return resolve({ target_id: targetId });
                    }
                }
            });

            response.data.on('end', () => {
                console.log("[Facebook] Stream ended without finding ID via fast path. Checking full buffer...");
                if (!videoMode) {
                    const idMatch = buffer.match(/"target_fbid":"(\d+)"/);
                    if (idMatch) return resolve({ target_id: idMatch[1] });
                }
                resolve(null);
            });
            
            response.data.on('error', (err) => reject(err));
        });
    } catch (error) {
        console.error(`[Facebook] Request Error: ${error.message}`);
        return null;
    }
}

// ==========================================
// INSTAGRAM RESOLVER LOGIC
// ==========================================
function extractCsrf(cookies) {
    const match = cookies.match(/csrftoken=([^;]+)/);
    return match ? match[1] : '';
}

async function resolveInstagramTarget(url, type, cookieString) {
    console.log(`\n[Instagram] Resolving [${type}]: ${url}`);
    try {
        const csrf = extractCsrf(cookieString);
        
        if (type === 'like' || type === 'comment') {
            const shortcodeMatch = url.match(/(?:p|reel)\/([A-Za-z0-9_-]+)/);
            if (!shortcodeMatch) return null;
            const shortcode = shortcodeMatch[1];
            
            console.log(`[Instagram] Shortcode: ${shortcode}`);
            
            const variables = JSON.stringify({
                shortcode: shortcode,
                fetch_tagged_user_count: null,
                hoisted_comment_id: null,
                hoisted_reply_id: null
            });
            
            const response = await axios({
                method: 'post',
                url: 'https://www.instagram.com/graphql/query',
                headers: {
                    'Cookie': cookieString,
                    'X-CSRFToken': csrf,
                    'X-IG-App-ID': '936619743392459',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Instagram 244.0.0.17.110'
                },
                data: `variables=${encodeURIComponent(variables)}&doc_id=8845758582119845`
            });
            
            let mediaId = null;
            const json = response.data;
            if (json && json.data && json.data.xdt_shortcode_media) {
                mediaId = json.data.xdt_shortcode_media.id;
            } else if (json && json.data && json.data.shortcode_media) {
                mediaId = json.data.shortcode_media.id;
            }
            
            return { mediaId };
            
        } else if (type === 'follow') {
            let username = url.replace('https://www.instagram.com/', '').split('/')[0];
            username = username.split('?')[0]; // clean up query params
            
            console.log(`[Instagram] Username: ${username}`);
            
            const response = await axios({
                method: 'get',
                url: `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
                headers: {
                    'Cookie': cookieString,
                    'X-CSRFToken': csrf,
                    'User-Agent': 'Instagram 244.0.0.17.110',
                    'Accept': 'application/json'
                }
            });
            
            if (response.data && response.data.data && response.data.data.user) {
                return { userPk: response.data.data.user.id };
            }
            
            return null;
        }
    } catch (error) {
        console.error(`[Instagram] Request Error: ${error.message}`);
        return null;
    }
}

// ==========================================
// TEST EXECUTION
// ==========================================
async function runTests() {
    // 1. Facebook Tests
    const fbCookies = "datr=gEqXaposcKtESUNcK84h7icY; sb=gEqXatW2f3X40hSGLnSKsRe3; m_pixel_ratio=2.8125; wd=384x832; c_user=61593670575990; xs=15%3AuO_63rUubun3Ng%3A2%3A1788300248%3A-1%3A-1; fr=0F2XZHtaoRSs5oVDZ.AWe1E8O2-ZAgB0bjVcw4tPs7XVYS6Mw9YIhZhB5O_OrVVDb_Vf0.Bql0qA..AAA.0.0.Bql0vf.AWdhX2aPLqhLPFTH2tzLpgn3s3g; locale=fr_FR; pas=61593670575990%3Avi8eVPaLag";
    
    const fbUrls = [
        { url: "https://m.facebook.com/Cristiano/", expected: "100044296486382" },
        { url: "https://m.facebook.com/photo.php?fbid=1704579754361022", expected: "100044270417553_1704580421027622" },
        { url: "https://m.facebook.com/reel/2026690491566753/?referral_source=reshare_feed_unit", expected: "2026690491566753" }
    ];
    
    for (const test of fbUrls) {
        const res = await resolveFacebookTarget(test.url, fbCookies);
        console.log(`Result:`, res, `| Expected: ${test.expected}`);
    }

    // 2. Instagram Tests
    // (Waiting for user to provide Instagram Cookies)
    // We will simulate it here to see if it handles errors gracefully if cookie is bad.
    const igCookies = "csrftoken=12345; sessionid=67890;"; 
    const igUrls = [
        { url: "https://www.instagram.com/cristiano/p/Dct5RArAI8H/", type: 'like', expected: "3976085903641710343" },
        { url: "https://www.instagram.com/cristiano/", type: 'follow', expected: "173560420" }
    ];
    
    for (const test of igUrls) {
        const res = await resolveInstagramTarget(test.url, test.type, igCookies);
        console.log(`Result:`, res, `| Expected: ${test.expected}`);
    }
}

runTests();
