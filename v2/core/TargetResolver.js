const axios = require('axios');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

class TargetResolver {
    
    static async resolve(platform, url, actionType, cookies) {
        if (!url) return null;
        if (!cookies) {
            console.error(`[TargetResolver] Missing cookies for ${platform}`);
            return null;
        }

        try {
            if (platform === 'facebook') {
                return await this.resolveFacebook(url, actionType, cookies);
            } else if (platform === 'instagram') {
                return await this.resolveInstagram(url, actionType, cookies);
            }
        } catch (error) {
            console.error(`[TargetResolver] Error resolving ${platform} URL: ${url}`, error.message);
            return null;
        }
        return null;
    }

    static extractCUser(cookies) {
        if (!cookies) return '';
        const match = cookies.match(/c_user=(\d+)/);
        return match ? match[1] : '';
    }

    static _isReelUrl(urlObj) {
        const parts = urlObj.pathname.split('/');
        return parts.some(p => p.toLowerCase() === 'reel' || p.toLowerCase() === 'reels');
    }

    static _isVideoUrl(urlObj) {
        if (this._isReelUrl(urlObj)) return false;
        const path = urlObj.pathname.toLowerCase();
        if (path.startsWith('/watch')) return true;
        if (path.includes('/videos/')) return true;
        if (path.startsWith('/video.php')) return true;
        if (urlObj.searchParams.has('v')) return true;
        return false;
    }

    static _extractContentIdHintFromUri(urlObj) {
        const queryKeys = ['v', 'video_id', 'videoid', 'fbid'];
        for (const key of queryKeys) {
            const value = urlObj.searchParams.get(key);
            if (value && /^\d{6,}$/.test(value)) return value;
        }
        for (let i = urlObj.pathname.split('/').length - 1; i >= 0; i--) {
            const val = urlObj.pathname.split('/')[i];
            if (val && /^\d{6,}$/.test(val)) return val;
        }
        return null;
    }

    static _unescapeLight(value) {
        return value.replace(/\\\//g, '/').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }

    static _extractStrongPostId(text) {
        let match = text.match(/top_level_post_id[^0-9]{0,40}(\d{6,})/i);
        if (match) return match[1];
        match = text.match(/\/permalink\/(\d{6,})\/?/i);
        return match ? match[1] : null;
    }
    
    static _extractStrongOwnerId(text) {
        const match = text.match(/content_owner_id_new[^0-9]{0,40}(\d{6,})/i);
        return match ? match[1] : null;
    }

    static _decodeFeedbackTarget(encoded) {
        try {
            let value = encoded.trim().replace(/-/g, '+').replace(/_/g, '/');
            while (value.length % 4 !== 0) value += '=';
            const decoded = Buffer.from(value, 'base64').toString('utf-8');
            if (!decoded.startsWith('feedback:')) return null;
            const target = decoded.substring(9).trim();
            if (!/^\d{6,}(?:_\d{6,})*$/.test(target)) return null;
            return target;
        } catch (e) {
            return null;
        }
    }

    static _decodeFeedbackAt(text, start) {
        if (start < 0 || start >= text.length) return null;
        const prefix = 'ZmVlZGJhY2s6';
        if (!text.startsWith(prefix, start)) return null;
        let end = start;
        while (end < text.length) {
            const c = text.charCodeAt(end);
            if (!((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 43 || c === 47 || c === 61 || c === 45 || c === 95)) {
                break;
            }
            end++;
        }
        if (end <= start) return null;
        if (end - start > 300) end = start + 300;
        return this._decodeFeedbackTarget(text.substring(start, end));
    }

    static _extractReelTargetFast(window, reelId) {
        if (!window || !reelId) return null;
        let reelIndex = window.lastIndexOf(reelId);
        let checked = 0;
        const prefix = 'ZmVlZGJhY2s6';
        while (reelIndex !== -1 && checked < 4) {
            const beforePrefix = window.lastIndexOf(prefix, reelIndex);
            const afterPrefix = window.indexOf(prefix, reelIndex + reelId.length);
            
            let best = null;
            if (beforePrefix !== -1) {
                const distance = reelIndex - beforePrefix;
                if (distance <= 96 * 1024) {
                    const target = this._decodeFeedbackAt(window, beforePrefix);
                    if (target && target !== reelId) {
                        best = { value: target, distance };
                    }
                }
            }
            if (afterPrefix !== -1) {
                const distance = afterPrefix - reelIndex;
                if (distance <= 96 * 1024) {
                    const target = this._decodeFeedbackAt(window, afterPrefix);
                    if (target && target !== reelId) {
                        if (!best || distance < best.distance) {
                            best = { value: target, distance };
                        }
                    }
                }
            }
            if (best) return best.value;
            if (reelIndex === 0) break;
            reelIndex = window.lastIndexOf(reelId, reelIndex - 1);
            checked++;
        }
        return null;
    }

    static _extractVideoTargetFast(window, contentId) {
        if (!window) return null;
        const marker = 'associated_video';
        let markerIndex = window.lastIndexOf(marker);
        let checked = 0;
        const prefix = 'ZmVlZGJhY2s6';
        while (markerIndex !== -1 && checked < 6) {
            const afterEnd = Math.min(markerIndex + 1500, window.length);
            const after = window.substring(markerIndex, afterEnd);
            let correctVideo = true;
            if (contentId) correctVideo = after.includes(contentId);
            
            if (correctVideo) {
                const feedbackIndex = window.lastIndexOf(prefix, markerIndex);
                if (feedbackIndex !== -1) {
                    const distance = markerIndex - feedbackIndex;
                    if (distance <= 128 * 1024) {
                        const target = this._decodeFeedbackAt(window, feedbackIndex);
                        if (target && target !== contentId) {
                            return target;
                        }
                    }
                }
            }
            if (markerIndex === 0) break;
            markerIndex = window.lastIndexOf(marker, markerIndex - 1);
            checked++;
        }
        return null;
    }

    static _findPostIdMatches(text) {
        const result = [];
        const pattern = /post_id[^0-9]{0,40}(\d{6,})/gi;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const start = match.index;
            const prefix = 'top_level_';
            let isTopLevel = false;
            if (start >= prefix.length) {
                const prev = text.substring(start - prefix.length, start).toLowerCase();
                if (prev === prefix) isTopLevel = true;
            }
            if (isTopLevel) continue;
            if (match[1]) result.push({ value: match[1], index: start });
        }
        return result;
    }

    static _postIdAfterMarkers(text) {
        const markers = ['CommentComposerGroupMentionsPlugin', 'shareable_from_perspective_of_feed_ufi', 'tracking'];
        const lower = text.toLowerCase();
        for (const marker of markers) {
            const index = lower.indexOf(marker.toLowerCase());
            if (index === -1) continue;
            const section = text.substring(index);
            const topMatch = section.match(/top_level_post_id[^0-9]{0,40}(\d{6,})/i);
            if (topMatch) return topMatch[1];
            const postMatches = this._findPostIdMatches(section);
            if (postMatches.length > 0) return postMatches[0].value;
        }
        return null;
    }

    static _extractPostIdFromView(text) {
        const topMatch = text.match(/top_level_post_id[^0-9]{0,40}(\d{6,})/i);
        if (topMatch) return topMatch[1];
        
        const permalinkMatch = text.match(/\/permalink\/(\d{6,})\/?/i);
        if (permalinkMatch) return permalinkMatch[1];
        
        const matches = this._findPostIdMatches(text);
        if (matches.length > 0) {
            const counts = {};
            for (const item of matches) counts[item.value] = (counts[item.value] || 0) + 1;
            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            if (sorted.length > 1 && sorted[0][1] === sorted[1][1]) return matches[0].value;
            return sorted[0][0];
        }
        return this._postIdAfterMarkers(text);
    }

    static extractPostId(text) {
        if (!text) return null;
        const views = [text, this._unescapeLight(text)];
        for (const view of views) {
            const postId = this._extractPostIdFromView(view);
            if (postId) return postId;
        }
        return null;
    }

    static extractActorOrPageId(text) {
        if (!text) return null;
        const patterns = [
            /["']page_id["']\s*:\s*["']?(\d+)["']?/i,
            /["']pageID["']\s*:\s*["']?(\d+)["']?/i,
            /content_owner_id_new[^0-9]{0,40}(\d{6,})/i,
            /["']owner_id["']\s*:\s*["']?(\d+)["']?/i,
            /["']timelineID["']\s*:\s*["']?(\d+)["']?/i
        ];
        const views = [text, this._unescapeLight(text)];
        for (const view of views) {
            for (const pattern of patterns) {
                const match = view.match(pattern);
                if (match && match[1]) return match[1];
            }
        }
        return null;
    }

    static extractProfileId(text) {
        if (!text) return null;
        const patterns = [
            /["']userID["']\s*:\s*["'](\d{6,})["']/i,
            /["']selectedID["']\s*:\s*["'](\d{6,})["']/i,
            /["']actorID["']\s*:\s*["']?(\d{6,})["']?/i,
            /["']actor_id["']\s*:\s*["']?(\d{6,})["']?/i,
            /["']profile_id["']\s*:\s*["']?(\d{6,})["']?/i,
            /["']actorId["']\s*:\s*["'](\d{6,})["']/i,
            /["']userId["']\s*:\s*(\d{6,})/i,
            /profile\.php\?id=(\d{6,})/i,
            /["']entity_id["']\s*:\s*["']?(\d{6,})["']?/i
        ];
        const views = [text, this._unescapeLight(text)];
        for (const view of views) {
            for (const pattern of patterns) {
                const match = view.match(pattern);
                if (match && match[1]) return match[1];
            }
        }
        return null;
    }

    static extractFocusCommentId(text) {
        const match = text.match(/["']focusCommentID["']\s*:\s*["']?(\d+)["']?/i);
        return match ? match[1] : null;
    }

        static _resolveNormalFromFullHtml(html, actionType) {
        if (!html) return null;
        
        const ownerId = this.extractActorOrPageId(html);
        const profileId = this.extractProfileId(html);

        if (actionType === 'follow' || actionType === 'addfriend') {
            if (profileId) return profileId;
            if (ownerId) return ownerId;
            return null;
        }

        const postId = this.extractPostId(html);
        const commentId = this.extractFocusCommentId(html);

        if (postId && ownerId) {
            return commentId ? `${ownerId}_${postId}_${commentId}` : `${ownerId}_${postId}`;
        } else if (profileId) {
            return profileId;
        } else if (ownerId) {
            return ownerId;
        }
        return null;
    }

    static _newMarkerAppeared(previous, chunk, marker) {
        if (!marker) return false;
        if (chunk.includes(marker)) return true;
        const overlap = marker.length - 1;
        let tail = previous;
        if (tail.length > overlap) tail = tail.substring(tail.length - overlap);
        return (tail + chunk).includes(marker);
    }

    static _appendRolling(current, chunk, limit) {
        if (!current) return chunk.length <= limit ? chunk : chunk.substring(chunk.length - limit);
        const combined = current + chunk;
        return combined.length <= limit ? combined : combined.substring(combined.length - limit);
    }

    static async resolveFacebook(url, actionType, cookieString) {
        let currentUrlStr = url.replace('m.facebook.com', 'www.facebook.com');
        let currentUrl = new URL(currentUrlStr);
        
        // Clean cookie if it has a credentials prefix (e.g. user:pass|cookie)
        let cleanCookie = cookieString;
        if (cleanCookie && cleanCookie.includes('|')) {
            cleanCookie = cleanCookie.split('|')[1];
        }
        let cUser = this.extractCUser(cleanCookie);

        let maxRetries = 2;
        for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
            const result = await new Promise((resolve) => {
                const fetchStream = async (targetUrlStr, redirectCount = 0) => {
                if (redirectCount > 5) return resolve(null);
                
                let targetUrl = new URL(targetUrlStr);
                let reelMode = this._isReelUrl(targetUrl);
                let videoMode = !reelMode && this._isVideoUrl(targetUrl);
                let contentIdHint = null;
                if (reelMode || videoMode) {
                    contentIdHint = this._extractContentIdHintFromUri(targetUrl);
                }

                try {
                    const response = await axios({
                        method: 'get',
                        url: targetUrlStr,
                        headers: {
                            'Cookie': cleanCookie,
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                            'Accept-Encoding': 'gzip, deflate',
                            'Accept-Language': 'en-US,en;q=0.9',
                            'Upgrade-Insecure-Requests': '1'
                        },
                        maxRedirects: 0,
                        responseType: 'stream',
                        validateStatus: () => true
                    });

                    if (response.status >= 300 && response.status < 400 && response.headers.location) {
                        let nextUrl = response.headers.location;
                        if (!nextUrl.startsWith('http')) nextUrl = new URL(nextUrl, targetUrlStr).toString();
                        if (nextUrl.includes('login.php') || nextUrl.includes('/login') || nextUrl.includes('/checkpoint')) {
                            return resolve(null);
                        }
                        return fetchStream(nextUrl, redirectCount + 1);
                    }

                    if (response.status < 200 || response.status >= 300) {
                        return resolve(null);
                    }

                    let normalHtml = '';
                    let normalRollingBuffer = '';
                    const normalRollingLimit = 256 * 1024;
                    let fastPostId = null;
                    let fastOwnerId = null;

                    let reelWindow = '';
                    const reelWindowLimit = 192 * 1024;
                    let videoWindow = '';
                    const videoWindowLimit = 192 * 1024;
                    const feedbackPrefix = 'ZmVlZGJhY2s6';

                    response.data.on('data', (chunkBuffer) => {
                        const chunk = chunkBuffer.toString('utf8');

                        if (reelMode) {
                            if (!contentIdHint) contentIdHint = this._extractStrongPostId(chunk);
                            const oldWindow = reelWindow;
                            reelWindow = this._appendRolling(reelWindow, chunk, reelWindowLimit);

                            if (contentIdHint) {
                                const reelAppeared = this._newMarkerAppeared(oldWindow, chunk, contentIdHint);
                                const feedbackAppeared = this._newMarkerAppeared(oldWindow, chunk, feedbackPrefix);
                                if (reelAppeared || feedbackAppeared) {
                                    const target = this._extractReelTargetFast(reelWindow, contentIdHint);
                                    if (target) {
                                        response.data.destroy();
                                        return resolve(target);
                                    }
                                }
                            }
                            return;
                        }

                        if (videoMode) {
                            if (!contentIdHint) contentIdHint = this._extractStrongPostId(chunk);
                            const oldWindow = videoWindow;
                            videoWindow = this._appendRolling(videoWindow, chunk, videoWindowLimit);
                            
                            const associatedAppeared = this._newMarkerAppeared(oldWindow, chunk, 'associated_video');
                            const feedbackAppeared = this._newMarkerAppeared(oldWindow, chunk, feedbackPrefix);
                            let idAppeared = false;
                            if (contentIdHint) idAppeared = this._newMarkerAppeared(oldWindow, chunk, contentIdHint);
                            
                            if (associatedAppeared || feedbackAppeared || idAppeared) {
                                const target = this._extractVideoTargetFast(videoWindow, contentIdHint);
                                if (target) {
                                    response.data.destroy();
                                    return resolve(target);
                                }
                            }
                            return;
                        }

                        normalHtml += chunk;
                        normalRollingBuffer += chunk;
                        if (normalRollingBuffer.length > normalRollingLimit) {
                            normalRollingBuffer = normalRollingBuffer.substring(normalRollingBuffer.length - normalRollingLimit);
                        }
                        
                        if (!fastPostId) fastPostId = this._extractStrongPostId(normalRollingBuffer);
                        if (!fastOwnerId) fastOwnerId = this._extractStrongOwnerId(normalRollingBuffer);
                        if (fastPostId && fastOwnerId && fastOwnerId !== cUser) {
                            if (actionType !== 'follow' && actionType !== 'addfriend') {
                                const target = `${fastOwnerId}_${fastPostId}`;
                                response.data.destroy();
                                return resolve(target);
                            }
                        }
                    });

                    response.data.on('end', () => {
                        if (reelMode) {
                            if (contentIdHint) {
                                const target = this._extractReelTargetFast(reelWindow, contentIdHint);
                                if (target) return resolve(target);
                            }
                            return resolve(null);
                        }
                        if (videoMode) {
                            const target = this._extractVideoTargetFast(videoWindow, contentIdHint);
                            if (target) return resolve(target);
                            return resolve(null);
                        }

                        return resolve(this._resolveNormalFromFullHtml(normalHtml, actionType));
                    });

                    response.data.on('error', (err) => resolve(null));
                } catch (err) {
                    resolve(null);
                }
            };
            fetchStream(currentUrlStr);
        });

            if (result) return result;
            
            if (attempt <= maxRetries) {
                console.log(`[TargetResolver] Facebook extraction failed or redirected on attempt ${attempt}. Retrying in 1.5s...`);
                await new Promise(r => setTimeout(r, 1500));
            }
        }

        console.log(`[TargetResolver] Facebook fast extraction failed for ${url}, attempting Stealth fallback...`);
        const stealthResult = await this.resolveWithStealth(url, actionType, cleanCookie);
        if (stealthResult) return stealthResult;

        return null;
    }

    static async resolveWithStealth(url, actionType, cookieString) {
        let browser;
        try {
            browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1920,1080']
            });
            const page = await browser.newPage();
            await page.setViewport({ width: 1920, height: 1080 });
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            if (cookieString) {
                const cookies = cookieString.split('; ').map(c => {
                    const [name, ...rest] = c.split('=');
                    return { name: name.trim(), value: rest.join('=').trim(), domain: '.facebook.com' };
                });
                await page.setCookie(...cookies);
            }

            let allResponseData = '';
            page.on('response', async (response) => {
                const u = response.url();
                if (u.includes('graphql') || u.includes('api/graphql') || u.includes('/ajax/')) {
                    try { allResponseData += await response.text(); } catch (e) {}
                }
            });

            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await new Promise(r => setTimeout(r, 6000)); // wait for client-side render

            const html = await page.content();
            const combined = html + '\n' + allResponseData;
            let target = null;

            // Handle Watch and Reel videos
            if (url.includes('/watch') || url.includes('/reel') || url.includes('video.php') || url.includes('/share/v/')) {
                const postMatch = combined.match(/"post_id":"(\d{6,})"/i) || combined.match(/top_level_post_id[^0-9]{0,40}(\d{6,})/i);
                if (postMatch) target = postMatch[1];
            } else {
                target = this._resolveNormalFromFullHtml(combined, actionType);
                if (!target) {
                    const ownerMatch = combined.match(/content_owner_id_new[^0-9]{0,40}(\d{6,})/i) ||
                                       combined.match(/"owner_id":"(\d{6,})"/i) ||
                                       combined.match(/"page_id":"(\d{6,})"/i) ||
                                       combined.match(/"userID":"(\d{6,})"/i);
                    const postMatch = combined.match(/top_level_post_id[^0-9]{0,40}(\d{6,})/i) ||
                                      combined.match(/"post_id":"(\d{6,})"/i) ||
                                      combined.match(/&quot;video_id&quot;:&quot;(\d{6,})&quot;/i);
                    
                    if (actionType === 'follow') {
                        if (ownerMatch) target = ownerMatch[1];
                    } else {
                        if (ownerMatch && postMatch) target = `${ownerMatch[1]}_${postMatch[1]}`;
                        else if (postMatch) target = postMatch[1];
                        else if (ownerMatch) target = ownerMatch[1];
                    }
                }
            }

            const cUser = this.extractCUser(cookieString);
            if (target === cUser) target = null;

            await browser.close();
            return target;
        } catch (error) {
            console.error(`[TargetResolver] Stealth fallback error for ${url}:`, error.message);
            if (browser) await browser.close();
            return null;
        }
    }

    static extractCsrf(cookies) {
        const match = cookies.match(/csrftoken=([^;]+)/);
        return match ? match[1] : '';
    }

    static decodeShortcodeToMediaId(shortcode) {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
        let mediaId = 0n;
        for (const char of shortcode) {
            const value = alphabet.indexOf(char);
            if (value === -1) return null;
            mediaId = mediaId * 64n + BigInt(value);
        }
        return mediaId.toString();
    }

    static async resolveInstagram(url, actionType, cookieString) {
        if (actionType === 'like' || actionType === 'comment') {
            const shortcodeMatch = url.match(/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
            if (!shortcodeMatch) return null;
            const shortcode = shortcodeMatch[1];
            const mediaId = this.decodeShortcodeToMediaId(shortcode);
            if (mediaId) return mediaId;
            return null;
        } else if (actionType === 'follow') {
            const csrf = this.extractCsrf(cookieString);
            let username = url.replace('https://www.instagram.com/', '').replace('www.instagram.com/', '').split('/')[0];
            username = username.split('?')[0];
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
            } catch (err) {}
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
                    if (exactMatch) return exactMatch.user.pk || exactMatch.user.pk_id;
                }
            } catch(e) {}
            return null;
        }
        return null;
    }
}

module.exports = TargetResolver;
