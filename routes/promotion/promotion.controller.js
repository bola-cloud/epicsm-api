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
        const {
            title,
            startDate,
            endDate,
            start,
            end,
            startTime,
            endTime,
            timezone,
            active,
            rewardValue,
            dailyReward,
            promotion_settings,
            isRecurring
        } = req.body;

        const effectiveRewardValue = Number(rewardValue || dailyReward || promotion_settings || 100);
        const tz = timezone || 'Africa/Cairo';

        const sTime = start || startTime || '16:00';
        const eTime = end || endTime || '19:00';

        // Default to today in the target timezone if startDate is not supplied
        const now = new Date();
        const todayTz = new Intl.DateTimeFormat('en-CA', {
            timeZone: tz,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(now);

        const sDate = startDate || todayTz;
        const eDate = endDate || sDate;

        const PromotionService = require('../../v2/services/promotionService');
        const startAt = PromotionService.parseDateTimeInTz(sDate, sTime, tz);
        let endAt = PromotionService.parseDateTimeInTz(eDate, eTime, tz);
        if (endAt <= startAt) {
            endAt = new Date(endAt.getTime() + 24 * 60 * 60 * 1000);
        }

        const newPromoData = {
            title: title || 'Happy Hour',
            startDate: sDate,
            endDate: eDate,
            start: sTime,
            end: eTime,
            startAt,
            endAt,
            isRecurring: Boolean(isRecurring),
            timezone: tz,
            active: active !== undefined ? Boolean(active) : true,
            rewardValue: effectiveRewardValue,
            promotion_settings: String(effectiveRewardValue)
        };

        const promotion = await Promotion.create(newPromoData);

        console.log(`[Promotion Controller] Created new promotion "${promotion.title}" (${promotion.startDate} ${promotion.start} to ${promotion.endDate} ${promotion.end}, reward: ${promotion.rewardValue})`);

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
        const {
            id,
            _id,
            title,
            startDate,
            endDate,
            start,
            end,
            startTime,
            endTime,
            timezone,
            active,
            rewardValue,
            dailyReward,
            promotion_settings,
            isRecurring
        } = req.body;

        const promoId = id || _id;
        let existing = null;
        if (promoId && mongoose.Types.ObjectId.isValid(promoId)) {
            existing = await Promotion.findById(promoId);
        }
        if (!existing) {
            existing = await Promotion.findOne();
        }

        const updateFields = {};
        if (title !== undefined) updateFields.title = title;
        if (timezone !== undefined) updateFields.timezone = timezone;
        if (active !== undefined) updateFields.active = Boolean(active);
        if (isRecurring !== undefined) updateFields.isRecurring = Boolean(isRecurring);

        const tz = timezone || (existing ? existing.timezone : 'Africa/Cairo') || 'Africa/Cairo';
        const sTime = start || startTime || (existing ? existing.start : '16:00');
        const eTime = end || endTime || (existing ? existing.end : '19:00');

        const now = new Date();
        const todayTz = new Intl.DateTimeFormat('en-CA', {
            timeZone: tz,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(now);

        const sDate = startDate !== undefined ? startDate : (existing && existing.startDate ? existing.startDate : todayTz);
        const eDate = endDate !== undefined ? endDate : (existing && existing.endDate ? existing.endDate : sDate);

        updateFields.startDate = sDate;
        updateFields.endDate = eDate;
        updateFields.start = sTime;
        updateFields.end = eTime;

        const PromotionService = require('../../v2/services/promotionService');
        const startAt = PromotionService.parseDateTimeInTz(sDate, sTime, tz);
        let endAt = PromotionService.parseDateTimeInTz(eDate, eTime, tz);
        if (endAt <= startAt) {
            endAt = new Date(endAt.getTime() + 24 * 60 * 60 * 1000);
        }
        updateFields.startAt = startAt;
        updateFields.endAt = endAt;

        const parsedReward = rewardValue !== undefined ? Number(rewardValue)
            : dailyReward !== undefined ? Number(dailyReward)
            : promotion_settings !== undefined ? Number(promotion_settings)
            : null;

        if (parsedReward !== null && !isNaN(parsedReward)) {
            updateFields.rewardValue = parsedReward;
            updateFields.promotion_settings = String(parsedReward);
        }

        let promotion = null;
        if (existing) {
            promotion = await Promotion.findByIdAndUpdate(
                existing._id,
                { $set: updateFields },
                { new: true, runValidators: true }
            );
        } else {
            promotion = await Promotion.create({
                title: title || 'Happy Hour',
                startDate: sDate,
                endDate: eDate,
                start: sTime,
                end: eTime,
                startAt,
                endAt,
                isRecurring: Boolean(isRecurring),
                timezone: tz,
                active: active !== undefined ? Boolean(active) : true,
                rewardValue: parsedReward || 100,
                promotion_settings: String(parsedReward || 100)
            });
        }

        console.log(`[Promotion Controller] Updated promotion "${promotion.title}": active=${promotion.active}, ${promotion.startDate} ${promotion.start} - ${promotion.endDate} ${promotion.end}, reward=${promotion.rewardValue}`);

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