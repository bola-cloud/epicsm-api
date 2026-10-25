const Promotion = require("../../models/promotion");
const Settings = require("../../models/settings");
const mongoose = require("mongoose");

exports.getPromotion = async (req, res) => {
    try {
        const promotions = await Promotion.find().sort({ createdAt: -1 });

        if (!promotions || promotions.length === 0) {
            return res.status(200).json({
                success: true,
                data: null,
                promotions: []
            });
        }

        // Return the first active promotion, or the latest one
        const activePromotion = promotions.find(p => p.active) || promotions[0];

        res.status(200).json({
            success: true,
            data: activePromotion,
            promotions: promotions
        });
    } catch (error) {
        console.error('[Promotion Controller] getPromotion error:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

exports.createPromotion = async (req, res) => {
    try {
        const { title, start, end, timezone, active, rewardValue, dailyReward, promotion_settings } = req.body;

        const effectiveRewardValue = Number(rewardValue || dailyReward || promotion_settings || 100);

        const newPromoData = {
            title: title || 'Happy Hour',
            start: start || '16:00',
            end: end || '19:00',
            timezone: timezone || 'Africa/Cairo',
            active: active !== undefined ? Boolean(active) : true,
            rewardValue: effectiveRewardValue,
            promotion_settings: String(effectiveRewardValue)
        };

        const promotion = await Promotion.create(newPromoData);

        console.log(`[Promotion Controller] Created new promotion "${promotion.title}" (${promotion.start} - ${promotion.end}, reward: ${promotion.rewardValue})`);

        res.status(201).json({
            success: true,
            data: promotion
        });
    } catch (error) {
        console.error('[Promotion Controller] createPromotion error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Server Error'
        });
    }
};

exports.updatePromotion = async (req, res) => {
    try {
        const { id, _id, title, start, end, timezone, active, rewardValue, dailyReward, promotion_settings } = req.body;

        const updateFields = {};
        if (title !== undefined) updateFields.title = title;
        if (start !== undefined) updateFields.start = start;
        if (end !== undefined) updateFields.end = end;
        if (timezone !== undefined) updateFields.timezone = timezone;
        if (active !== undefined) updateFields.active = Boolean(active);

        const parsedReward = rewardValue !== undefined ? Number(rewardValue)
            : dailyReward !== undefined ? Number(dailyReward)
            : promotion_settings !== undefined ? Number(promotion_settings)
            : null;

        if (parsedReward !== null && !isNaN(parsedReward)) {
            updateFields.rewardValue = parsedReward;
            updateFields.promotion_settings = String(parsedReward);
        }

        const promoId = id || _id;
        let promotion = null;

        if (promoId && mongoose.Types.ObjectId.isValid(promoId)) {
            promotion = await Promotion.findByIdAndUpdate(
                promoId,
                { $set: updateFields },
                { new: true, runValidators: true }
            );
        }

        if (!promotion) {
            // Update the single or latest promotion
            promotion = await Promotion.findOneAndUpdate(
                {},
                { $set: updateFields },
                { new: true, runValidators: true }
            );
        }

        if (!promotion) {
            // If none existed, create it
            promotion = await Promotion.create({
                title: title || 'Happy Hour',
                start: start || '16:00',
                end: end || '19:00',
                timezone: timezone || 'Africa/Cairo',
                active: active !== undefined ? Boolean(active) : true,
                rewardValue: parsedReward || 100,
                promotion_settings: String(parsedReward || 100)
            });
        }

        console.log(`[Promotion Controller] Updated promotion: active=${promotion.active}, time=${promotion.start}-${promotion.end}, reward=${promotion.rewardValue}`);

        res.status(200).json({
            success: true,
            data: promotion
        });
    } catch (error) {
        console.error('[Promotion Controller] updatePromotion error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Server Error'
        });
    }
};

exports.deletePromotion = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: 'Invalid promotion ID' });
        }

        const deleted = await Promotion.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Promotion not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Promotion deleted successfully'
        });
    } catch (error) {
        console.error('[Promotion Controller] deletePromotion error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Server Error'
        });
    }
};