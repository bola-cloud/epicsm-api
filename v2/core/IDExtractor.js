const axios = require('axios');

class IDExtractor {

    static unescapeLight(s) {
        if (!s) return '';
        return s.replace(/\\\//g, '/')
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\');
    }

    static postIdAfterMarkers(text) {
        const markers = [
            "CommentComposerGroupMentionsPlugin",
            "shareable_from_perspective_of_feed_ufi",
            "tracking",
        ];
        
        for (const mk of markers) {
            const i = text.toLowerCase().indexOf(mk.toLowerCase());
            if (i !== -1) {
                const slice = text.slice(i);
                const mTop = slice.match(/top_level_post_id[^0-9]{0,40}(\d{6,})/i);
                if (mTop) return mTop[1];
                const mNext = slice.match(/post_id[^0-9]{0,40}(\d{6,})/i);
                if (mNext) return mNext[1];
            }
        }
        return null;
    }

    static extractPostIdFromView(text) {
        let mTop = text.match(/top_level_post_id[^0-9]{0,40}(\d{6,})/i);
        if (mTop) return mTop[1];

        let mLink = text.match(/\/permalink\/(\d{6,})\/?/i);
        if (mLink) return mLink[1];

        const re = /(?<!top_level_)post_id[^0-9]{0,40}(\d{6,})/gi;
        let cands = [];
        let match;
        while ((match = re.exec(text)) !== null) {
            cands.push(match[1]);
        }
        
        if (cands.length > 0) {
            // Count frequencies
            const counts = {};
            cands.forEach(x => counts[x] = (counts[x] || 0) + 1);
            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            
            if (sorted.length > 1 && sorted[0][1] === sorted[1][1]) {
                return cands[0]; // first occurrence
            }
            return sorted[0][0];
        }

        const mAfter = this.postIdAfterMarkers(text);
        if (mAfter) return mAfter;

        return null;
    }

    static extractPostId(text) {
        if (!text) return null;
        for (const view of [text, this.unescapeLight(text)]) {
            const pid = this.extractPostIdFromView(view);
            if (pid) return pid;
        }
        return null;
    }

    static extractActorOrPageId(text) {
        const patterns = [
            /["']page_id["']\s*:\s*["']?(\d+)["']?/i,
            /["']pageID["']\s*:\s*["']?(\d+)["']?/i,
            /content_owner_id_new[^0-9]{0,40}(\d{6,})/i,
            /["']owner_id["']\s*:\s*["']?(\d+)["']?/i,
            /["']timelineID["']\s*:\s*["']?(\d+)["']?/i,
        ];
        
        for (const view of [text, this.unescapeLight(text)]) {
            for (const pat of patterns) {
                const m = view.match(pat);
                if (m) return m[1];
            }
        }
        return null;
    }

    static extractProfileId(text) {
        const patterns = [
            /["']userID["']\s*:\s*["'](\d{6,})["']/i,
            /["']selectedID["']\s*:\s*["'](\d{6,})["']/i,
            /["']actorID["']\s*:\s*["']?(\d{6,})["']?/i,
            /["']actor_id["']\s*:\s*["']?(\d{6,})["']?/i,
            /["']profile_id["']\s*:\s*["']?(\d{6,})["']?/i,
            /["']actorId["']\s*:\s*["'](\d{6,})["']/i,
            /["']userId["']\s*:\s*(\d{6,})/i,
            /profile\.php\?id=(\d{6,})/i,
            /["']entity_id["']\s*:\s*["']?(\d{6,})["']?/i,
        ];

        for (const view of [text, this.unescapeLight(text)]) {
            for (const pat of patterns) {
                const m = view.match(pat);
                if (m) return m[1];
            }
        }
        return null;
    }

    static extractFocusCommentId(text) {
        const m = text.match(/["']focusCommentID["']\s*:\s*["']?(\d+)["']?/i);
        return m ? m[1] : null;
    }

    /**
     * Extracts IDs for Facebook URLs using provided cookies
     * @param {string} url - Facebook URL
     * @param {string} cookies - Facebook session cookies
     * @returns {Promise<Object>} Extracted IDs
     */
    static async extractFacebookTarget(url, cookies = null) {
        let currentUrl = url.replace('m.facebook.com', 'www.facebook.com');
        try {
            const headers = {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "accept-language": "en-US,en;q=0.9",
                "upgrade-insecure-requests": "1",
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            };

            if (cookies) {
                headers['cookie'] = cookies;
            }

            const response = await axios.get(currentUrl, {
                headers,
                timeout: 15000,
                maxRedirects: 5,
                validateStatus: function (status) {
                    return status >= 200 && status < 400; // Resolve also for redirects
                }
            });

            // Use the response data (axios handles gzip/deflate/brotli automatically)
            let text = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

            const postId = this.extractPostId(text);
            const ownerId = this.extractActorOrPageId(text);
            const profileId = this.extractProfileId(text);
            const commentId = this.extractFocusCommentId(text);

            let composite = null;
            let type = "unknown";

            if (postId && ownerId) {
                type = "post";
                composite = commentId ? `${ownerId}_${postId}_${commentId}` : `${ownerId}_${postId}`;
            } else if (profileId) {
                type = "profile";
                composite = profileId;
            } else if (ownerId) {
                type = "profile";
                composite = ownerId;
            }

            return {
                target_id: composite, // The raw target ID needed by the mobile app
                ownerId,
                profileId,
                postId,
                commentId,
                type
            };
        } catch (error) {
            console.error('[IDExtractor] Facebook extraction error:', error.message);
            return null;
        }
    }

    /**
     * Extracts IDs for Instagram URLs
     * Note: This is a placeholder for Instagram extraction logic.
     * @param {string} url - Instagram URL
     * @param {string} cookies - Instagram session cookies
     */
    static async extractInstagramTarget(url, cookies = null) {
        // Implement Instagram logic here
        // The mobile app requires `mediaId` for posts and `userPk` for profiles
        try {
            const headers = {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X)", // Use mobile UA
            };

            if (cookies) {
                headers['cookie'] = cookies;
            }

            const response = await axios.get(url, { headers, timeout: 15000 });
            let text = response.data;

            // Simple Regex to find mediaId or userPk from Instagram HTML/SharedData
            let mediaId = null;
            let userPk = null;

            // Example regex for Instagram (Subject to change based on IG DOM)
            const mediaIdMatch = text.match(/"media_id":"(\d+)"/);
            if (mediaIdMatch) mediaId = mediaIdMatch[1];

            const userPkMatch = text.match(/"profile_id":"(\d+)"/);
            if (userPkMatch) userPk = userPkMatch[1];
            
            // Fallback for userPk
            if (!userPk) {
                const altUserPk = text.match(/"id":"(\d+)","is_verified"/);
                if (altUserPk) userPk = altUserPk[1];
            }

            return {
                mediaId,
                userPk
            };
        } catch (error) {
            console.error('[IDExtractor] Instagram extraction error:', error.message);
            return null;
        }
    }
}

module.exports = IDExtractor;
