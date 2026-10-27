const Promotion = require('../../models/promotion');

class PromotionService {
    /**
     * Parse date (YYYY-MM-DD) and time (HH:MM) accurately in target timezone into UTC Date
     */
    static parseDateTimeInTz(dateStr, timeStr, tz = 'Africa/Cairo') {
        try {
            const [year, month, day] = (dateStr || '').split('-').map(Number);
            const [hour, minute] = (timeStr || '16:00').split(':').map(Number);

            const guessUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

            const tzFormatter = new Intl.DateTimeFormat('en-US', {
                timeZone: tz,
                year: 'numeric', month: 'numeric', day: 'numeric',
                hour: 'numeric', minute: 'numeric', second: 'numeric',
                hour12: false
            });

            const parts = tzFormatter.formatToParts(guessUtc).reduce((acc, p) => {
                acc[p.type] = p.value;
                return acc;
            }, {});

            const tzYear = parseInt(parts.year, 10);
            const tzMonth = parseInt(parts.month, 10);
            const tzDay = parseInt(parts.day, 10);
            let tzHour = parseInt(parts.hour, 10);
            if (tzHour === 24) tzHour = 0;
            const tzMin = parseInt(parts.minute, 10);

            const tzAsUtc = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMin, 0);
            const offsetMs = tzAsUtc - guessUtc.getTime();

            return new Date(guessUtc.getTime() - offsetMs);
        } catch (error) {
            console.error('[PromotionService] parseDateTimeInTz error:', error);
            return new Date();
        }
    }

    /**
     * Compute UTC Date instances for a promotion
     */
    static calculatePromoTimes(promo) {
        try {
            const tz = promo.timezone || 'Africa/Cairo';

            // If already pre-computed and stored as UTC dates in DB
            if (promo.startAt && promo.endAt) {
                return {
                    startUtc: new Date(promo.startAt),
                    endUtc: new Date(promo.endAt),
                    tz
                };
            }

            let sDate = promo.startDate;
            let eDate = promo.endDate || sDate;

            // If no specific date was set (legacy promo), use today's date in target timezone
            if (!sDate) {
                const now = new Date();
                const parts = new Intl.DateTimeFormat('en-CA', {
                    timeZone: tz,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }).format(now);
                sDate = parts;
                eDate = parts;
            }

            const sTime = promo.start || '16:00';
            const eTime = promo.end || '17:00';

            const startUtc = this.parseDateTimeInTz(sDate, sTime, tz);
            let endUtc = this.parseDateTimeInTz(eDate, eTime, tz);

            if (endUtc <= startUtc) {
                endUtc = new Date(endUtc.getTime() + 24 * 60 * 60 * 1000);
            }

            return { startUtc, endUtc, tz };
        } catch (error) {
            console.error('[PromotionService] calculatePromoTimes error:', error);
            const fallbackStart = new Date(Date.now() + 60 * 60 * 1000);
            const fallbackEnd = new Date(Date.now() + 2 * 60 * 60 * 1000);
            return { startUtc: fallbackStart, endUtc: fallbackEnd, tz: 'Africa/Cairo' };
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
                const { startUtc, endUtc, tz } = this.calculatePromoTimes(promo);

                if (now >= startUtc && now < endUtc) {
                    const rewardValue = promo.rewardValue || parseInt(promo.promotion_settings, 10) || 100;
                    return {
                        id: promo._id,
                        title: promo.title || 'Happy Hour',
                        active: true,
                        rewardValue: rewardValue,
                        rewardAmount: rewardValue,
                        amount: rewardValue,
                        startDate: promo.startDate || null,
                        endDate: promo.endDate || null,
                        start: promo.start,
                        end: promo.end,
                        startAt: startUtc.toISOString(),
                        endAt: endUtc.toISOString(),
                        timezone: tz,
                        isRecurring: Boolean(promo.isRecurring)
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
     * Fix: NEVER returns tomorrow's duplicate for a promotion that is currently active today!
     * Fix: Expired one-time promotions are NOT returned as upcoming.
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
                const { startUtc, endUtc, tz } = this.calculatePromoTimes(promo);

                // 1. If currently active right now, DO NOT return it as upcoming!
                if (now >= startUtc && now < endUtc) {
                    continue;
                }

                // 2. If it already ended in the past:
                if (now >= endUtc) {
                    // Only if explicitly configured as recurring daily do we roll over to tomorrow
                    if (promo.isRecurring) {
                        const tomorrowStart = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);
                        const tomorrowEnd = new Date(endUtc.getTime() + 24 * 60 * 60 * 1000);
                        const diff = tomorrowStart.getTime() - now.getTime();
                        if (diff > 0 && diff < minDiffMs) {
                            minDiffMs = diff;
                            const rewardValue = promo.rewardValue || parseInt(promo.promotion_settings, 10) || 100;
                            nearestUpcoming = {
                                id: promo._id,
                                title: promo.title || 'Happy Hour',
                                startDate: promo.startDate || null,
                                endDate: promo.endDate || null,
                                start: promo.start,
                                end: promo.end,
                                startAt: tomorrowStart.toISOString(),
                                endAt: tomorrowEnd.toISOString(),
                                rewardAmount: rewardValue,
                                rewardValue: rewardValue,
                                timezone: tz,
                                isRecurring: true
                            };
                        }
                    }
                    // If not recurring, it has expired! Do not show as upcoming.
                    continue;
                }

                // 3. If start is in the future (startUtc > now) -> This is genuinely upcoming!
                if (startUtc > now) {
                    const diff = startUtc.getTime() - now.getTime();
                    if (diff < minDiffMs) {
                        minDiffMs = diff;
                        const rewardValue = promo.rewardValue || parseInt(promo.promotion_settings, 10) || 100;
                        nearestUpcoming = {
                            id: promo._id,
                            title: promo.title || 'Happy Hour',
                            startDate: promo.startDate || null,
                            endDate: promo.endDate || null,
                            start: promo.start,
                            end: promo.end,
                            startAt: startUtc.toISOString(),
                            endAt: endUtc.toISOString(),
                            rewardAmount: rewardValue,
                            rewardValue: rewardValue,
                            timezone: tz,
                            isRecurring: Boolean(promo.isRecurring)
                        };
                    }
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
