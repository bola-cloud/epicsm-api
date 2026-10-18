const Promotion = require('../../models/promotion');

class PromotionService {
    /**
     * Check if a promotion is currently active based on its start/end time and timezone
     */
    static async getCurrentPromotion() {
        try {
            const promo = await Promotion.findOne({ active: true });
            if (!promo || !promo.start || !promo.end) {
                return null;
            }

            const tz = promo.timezone || 'Africa/Cairo';
            let nowInTz;
            try {
                nowInTz = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
            } catch (e) {
                nowInTz = new Date();
            }

            const currentMinutes = nowInTz.getHours() * 60 + nowInTz.getMinutes();

            const [startH, startM] = promo.start.split(':').map(Number);
            const [endH, endM] = promo.end.split(':').map(Number);
            const startMinutes = (startH || 0) * 60 + (startM || 0);
            const endMinutes = (endH || 0) * 60 + (endM || 0);

            // Handle normal time window or windows spanning midnight
            const isActive = startMinutes <= endMinutes
                ? (currentMinutes >= startMinutes && currentMinutes < endMinutes)
                : (currentMinutes >= startMinutes || currentMinutes < endMinutes);

            if (isActive) {
                return {
                    active: true,
                    rewardValue: parseInt(promo.promotion_settings, 10) || 100,
                    start: promo.start,
                    end: promo.end,
                    timezone: tz
                };
            }

            return null;
        } catch (error) {
            console.error('[PromotionService] Error checking promotion:', error.message);
            return null;
        }
    }
}

module.exports = PromotionService;
