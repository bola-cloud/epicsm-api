const axios = require('axios');
const https = require('https');

class TargetResolver {
    
    /**
     * Resolves the target ID based on platform
     * @param {string} platform 'facebook' or 'instagram'
     * @param {string} url The target url
     * @param {string} actionType 'like', 'follow', etc
     * @param {string} cookies Admin cookies for the platform
     * @returns {Promise<string|null>} the resolved target_id, mediaId or userPk
     */
    static async resolve(platform, url, actionType, cookies) {
        if (!url) return null;
        if (!cookies) {
            console.error(`[TargetResolver] Missing cookies for ${platform}`);
            return null;
        }

        try {
            if (platform === 'facebook') {
                return await this.resolveFacebook(url, cookies);
            } else if (platform === 'instagram') {
                return await this.resolveInstagram(url, actionType, cookies);
            }
        } catch (error) {
            console.error(`[TargetResolver] Error resolving ${platform} URL: ${url}`, error.message);
            return null;
        }
        return null;
    }

    // ==========================================
    // FACEBOOK LOGIC
    // ==========================================
    static extractCUser(cookies) {
        if (!cookies) return '';
        const match = cookies.match(/c_user=(\d+)/);
        return match ? match[1] : '';
    }

    static async resolveFacebook(url, cookieString) {
        let currentUrl = url.replace('m.facebook.com', 'www.facebook.com');
        let reelMode = currentUrl.includes('/reel/');
        let videoMode = !reelMode && (currentUrl.includes('/watch') || currentUrl.includes('/videos/'));
        let cUser = this.extractCUser(cookieString);
        
        console.log(`[Facebook Resolver] Mode: Reel=${reelMode}, Video=${videoMode}, cUser=${cUser}, URL: ${currentUrl}`);
        
        // Use axios with stream response type
        return new Promise(async (resolve, reject) => {
            const fetchStream = async (targetUrl, redirectCount = 0) => {
                if (redirectCount > 5) return resolve(null);

                try {
                    const response = await axios({
                        method: 'get',
                        url: targetUrl,
                        headers: {
                            'Cookie': cookieString,
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                            'Accept-Language': 'en-US,en;q=0.9',
                            'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                            'sec-ch-ua-mobile': '?0',
                            'sec-ch-ua-platform': '"Windows"',
                            'Sec-Fetch-Dest': 'document',
                            'Sec-Fetch-Mode': 'navigate',
                            'Sec-Fetch-Site': 'none',
                            'Sec-Fetch-User': '?1',
                            'Upgrade-Insecure-Requests': '1'
                        },
                        maxRedirects: 0, // Handle redirects manually
                        responseType: 'stream',
                        validateStatus: () => true // Accept all statuses
                    });

                    if (response.status >= 300 && response.status < 400 && response.headers.location) {
                        let nextUrl = response.headers.location;
                        if (!nextUrl.startsWith('http')) {
                            nextUrl = new URL(nextUrl, targetUrl).toString();
                        }
                        if (nextUrl.includes('login.php')) {
                            console.error("[Facebook Resolver] Redirected to login. Cookies might be invalid.");
                            return resolve(null);
                        }
                        console.log(`[Facebook Resolver] Redirecting to ${nextUrl}`);
                        return fetchStream(nextUrl, redirectCount + 1);
                    }

                    let buffer = '';
                    const MAX_BUFFER = 256 * 1024; // 256KB rolling buffer
                    
                    response.data.on('data', (chunk) => {
                        buffer += chunk.toString('utf8');
                        if (buffer.length > MAX_BUFFER) {
                            buffer = buffer.substring(buffer.length - MAX_BUFFER);
                        }
                        
                        // If reel, look for feedbackId
                        if (reelMode) {
                            const fbMatch = buffer.match(/ZmVlZGJhY2s6[A-Za-z0-9_-]+/);
                            if (fbMatch) {
                                const decoded = Buffer.from(fbMatch[0], 'base64').toString('utf-8');
                                const targetId = decoded.replace('feedback:', '');
                                response.data.destroy(); // stop streaming
                                return resolve(targetId);
                            }
                        } 
                        // Normal post or Video or Profile
                        else {
                            const postIdMatch = buffer.match(/"post_id":"(\d+)"/);
                            const actorIdMatch = buffer.match(/"actor_id":"(\d+)"/);
                            
                            if (postIdMatch && actorIdMatch && actorIdMatch[1] !== cUser) {
                                console.log('[MATCH] postId + actorId: ', actorIdMatch[1], postIdMatch[1]);
                                const targetId = `${actorIdMatch[1]}_${postIdMatch[1]}`;
                                response.data.destroy();
                                return resolve(targetId);
                            }
                            
                            const storyMatch = buffer.match(/story_fbid=(\d+).*?id=(\d+)/);
                            if (storyMatch && storyMatch[2] !== cUser) {
                                console.log('[MATCH] storyMatch: ', storyMatch[2], storyMatch[1]);
                                const targetId = `${storyMatch[2]}_${storyMatch[1]}`;
                                response.data.destroy();
                                return resolve(targetId);
                            }
                            
                            // For some videos, target_fbid exists directly
                            const targetFbidMatch = buffer.match(/"target_fbid":"(\d+)"/);
                            if (targetFbidMatch && targetFbidMatch[1] !== cUser) {
                                console.log('[MATCH] targetFbidMatch: ', targetFbidMatch[1]);
                                response.data.destroy();
                                return resolve(targetFbidMatch[1]);
                            }

                            // Follow Profiles / Pages
                            const profileOwnerMatch = buffer.match(/"profile_owner"\s*:\s*\{\s*"id"\s*:\s*"(\d+)"/);
                            if (profileOwnerMatch && profileOwnerMatch[1] !== cUser) {
                                console.log('[MATCH] profileOwnerMatch: ', profileOwnerMatch[1]);
                                response.data.destroy();
                                return resolve(profileOwnerMatch[1]);
                            }

                            const delegatePageObjMatch = buffer.match(/"delegate_page"\s*:\s*\{[^}]*"id"\s*:\s*"(\d+)"/);
                            if (delegatePageObjMatch && delegatePageObjMatch[1] !== '0' && delegatePageObjMatch[1] !== cUser) {
                                console.log('[MATCH] delegatePageObjMatch: ', delegatePageObjMatch[1]);
                                response.data.destroy();
                                return resolve(delegatePageObjMatch[1]);
                            }

                            const profileIdMatch = buffer.match(/"profile_id":"(\d+)"/);
                            if (profileIdMatch && profileIdMatch[1] !== '0' && profileIdMatch[1] !== cUser) {
                                console.log('[MATCH] profileIdMatch: ', profileIdMatch[1]);
                                response.data.destroy();
                                return resolve(profileIdMatch[1]);
                            }

                            const userIDMatch = buffer.match(/"userID":"(\d+)"/);
                            if (userIDMatch && userIDMatch[1] !== '0' && userIDMatch[1] !== cUser) {
                                console.log('[MATCH] userIDMatch: ', userIDMatch[1]);
                                response.data.destroy();
                                return resolve(userIDMatch[1]);
                            }
                        }
                    });

                    response.data.on('end', () => {
                        console.log("[Facebook Resolver] Stream ended without finding ID via fast path. Checking full buffer...");
                        resolve(null);
                    });
                    
                    response.data.on('error', (err) => {
                        console.error(`[Facebook Resolver] Stream error: ${err.message}`);
                        resolve(null);
                    });

                } catch (err) {
                    console.error(`[Facebook Resolver] Request error on ${targetUrl}: ${err.message}`);
                    resolve(null);
                }
            };

            fetchStream(currentUrl);
        });
    }

    // ==========================================
    // INSTAGRAM LOGIC
    // ==========================================
    static extractCsrf(cookies) {
        const match = cookies.match(/csrftoken=([^;]+)/);
        return match ? match[1] : '';
    }

    // ==========================================
    // INSTAGRAM SHORTCODE DECODE (no API needed)
    // Same algorithm used in the Flutter mobile app
    // ==========================================
    static decodeShortcodeToMediaId(shortcode) {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
        let mediaId = BigInt(0);
        for (const char of shortcode) {
            const value = alphabet.indexOf(char);
            if (value === -1) return null;
            mediaId = mediaId * BigInt(64) + BigInt(value);
        }
        return mediaId.toString();
    }

    static async resolveInstagram(url, actionType, cookieString) {
        if (actionType === 'like' || actionType === 'comment') {
            const shortcodeMatch = url.match(/(?:p|reel)\/([A-Za-z0-9_-]+)/);
            if (!shortcodeMatch) {
                console.error("[Instagram Resolver] Could not find shortcode in URL");
                return null;
            }
            const shortcode = shortcodeMatch[1];
            console.log(`[Instagram Resolver] Decoding shortcode locally: ${shortcode}`);

            const mediaId = this.decodeShortcodeToMediaId(shortcode);
            if (mediaId) {
                console.log(`[Instagram Resolver] ✅ mediaId: ${mediaId}`);
                return mediaId;
            }

            console.error(`[Instagram Resolver] Failed to decode shortcode: ${shortcode}`);
            return null;
            
        } else if (actionType === 'follow') {
            let username = url.replace('https://www.instagram.com/', '').replace('www.instagram.com/', '').split('/')[0];
            username = username.split('?')[0];
            
            console.log(`[Instagram Resolver] Username: ${username}`);
            
            try {
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
                    return response.data.data.user.id;
                }
            } catch (err) {
                console.warn(`[Instagram Resolver] userPk request failed, trying search fallback. Error: ${err.message}`);
            }

            // Fallback search
            try {
                const searchRes = await axios({
                    method: 'get',
                    url: `https://www.instagram.com/web/search/topsearch/?query=${encodeURIComponent(username)}&context=blended`,
                    headers: {
                        'Cookie': cookieString,
                        'X-CSRFToken': csrf,
                        'User-Agent': 'Mozilla/5.0'
                    }
                });
                const users = searchRes.data?.users;
                if (users && users.length > 0) {
                    const exactMatch = users.find(u => u.user?.username?.toLowerCase() === username.toLowerCase());
                    if (exactMatch) {
                        return exactMatch.user.pk || exactMatch.user.pk_id;
                    }
                }
            } catch(e) {}
            
            return null;
        }
        return null;
    }
}

module.exports = TargetResolver;
