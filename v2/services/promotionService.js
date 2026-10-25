const Promotion = require('../../models/promotion');

class PromotionService {
    /**
     * Compute UTC Date instances for a given HH:MM start/end in a specific timezone
     */
    static calculateTimes(startStr, endStr, tz = 'Africa/Cairo') {
        try {
            const [sH, sM] = (startStr || '16:00').split(':').map(Number);
            const [eH, eM] = (endStr || '17:00').split(':').map(Number);

            const now = new Date();
            const tzFormatter = new Intl.DateTimeFormat('en-CA', {
                timeZone: tz,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });

            const parts = tzFormatter.formatToParts(now).reduce((acc, p) => {
                acc[p.type] = p.value;
                return acc;
            }, {});

            const year = parseInt(parts.year, 10);
            const month = parseInt(parts.month, 10);
            const day = parseInt(parts.day, 10);

            const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
            const targetDate = new Date(now.toLocaleString('en-US', { timeZone: tz }));
            const tzOffsetMinutes = Math.round((targetDate.getTime() - utcDate.getTime()) / (60 * 1000));

            const startUtcMs = Date.UTC(year, month - 1, day, sH, sM, 0) - (tzOffsetMinutes * 60 * 1000);
            const endUtcMs = Date.UTC(year, month - 1, day, eH, eM, 0) - (tzOffsetMinutes * 60 * 1000);

            let startUtc = new Date(startUtcMs);
            let endUtc = new Date(endUtcMs);

            // Handle midnight span (e.g. 23:00 to 02:00)
            if (endUtc <= startUtc) {
                endUtc = new Date(endUtcMs + 24 * 60 * 60 * 1000);
            }

            return { startUtc, endUtc };
        } catch (error) {
            console.error('[PromotionService] calculateTimes error:', error);
            const fallbackStart = new Date(Date.now() + 60 * 60 * 1000);
            const fallbackEnd = new Date(Date.now() + 2 * 60 * 60 * 1000);
            return { startUtc: fallbackStart, endUtc: fallbackEnd };
        }
    }

    /**
     * Check if any promotion is currently active right now
     */
    static async getCurrentPromotion() {
        try {
            const activePromos = await Promotion.find({ active: true }).lean();
            if (!activePromos || activePromos.length === 0) {
                return null;
            }

            const now = new Date();

            for (const promo of activePromos) {
                if (!promo.start || !promo.end) continue;
                const tz = promo.timezone || 'Africa/Cairo';
                const { startUtc, endUtc } = this.calculateTimes(promo.start, promo.end, tz);

                if (now >= startUtc && now < endUtc) {
                    const rewardValue = promo.rewardValue || parseInt(promo.promotion_settings, 10) || 100;
                    return {
                        id: promo._id,
                        title: promo.title || 'Happy Hour',
                        active: true,
                        rewardValue: rewardValue,
                        rewardAmount: rewardValue,
                        amount: rewardValue,
                        start: promo.start,
                        end: promo.end,
                        startAt: startUtc.toISOString(),
                        endAt: endUtc.toISOString(),
                        timezone: tz
                    };
                }
            }

            return null;
        } catch (error) {
            console.error('[PromotionService] Error in getCurrentPromotion:', error.message);
            return null;
        }
    }

    /**
     * Get the next upcoming active promotion
     */
    static async getUpcomingPromotion() {
        try {
            const activePromos = await Promotion.find({ active: true }).lean();
            if (!activePromos || activePromos.length === 0) {
                return null;
            }

            const now = new Date();
            let nearestUpcoming = null;
            let minDiffMs = Infinity;

            for (const promo of activePromos) {
                if (!promo.start || !promo.end) continue;
                const tz = promo.timezone || 'Africa/Cairo';
                const { startUtc, endUtc } = this.calculateTimes(promo.start, promo.end, tz);

                let upcomingStart = startUtc;
                let upcomingEnd = endUtc;

                // If this window already ended today, the next occurrence is tomorrow
                if (now >= endUtc) {
                    upcomingStart = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);
                    upcomingEnd = new Date(endUtc.getTime() + 24 * 60 * 60 * 1000);
                }

                // If currently running, upcoming could also be tomorrow
                if (now >= startUtc && now < endUtc) {
                    upcomingStart = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);
                    upcomingEnd = new Date(endUtc.getTime() + 24 * 60 * 60 * 1000);
                }

                const diff = upcomingStart.getTime() - now.getTime();
                if (diff > 0 && diff < minDiffMs) {
                    minDiffMs = diff;
                    const rewardValue = promo.rewardValue || parseInt(promo.promotion_settings, 10) || 100;
                    nearestUpcoming = {
                        title: promo.title || 'Happy Hour',
                        startAt: upcomingStart.toISOString(),
                        endAt: upcomingEnd.toISOString(),
                        rewardAmount: rewardValue,
                        rewardValue: rewardValue,
                        timezone: tz
                    };
                }
            }

            return nearestUpcoming;
        } catch (error) {
            console.error('[PromotionService] Error in getUpcomingPromotion:', error.message);
            return null;
        }
    }
}

module.exports = PromotionService;
