const Promotion = require("../../models/promotion");
const cron = require('node-cron');
const admin = require("firebase-admin");

let db = null;
try {
    db = admin.firestore();
} catch (e) {
    console.error("Firebase not initialized in promotion.controller");
}

let startCronJob = null;
let endCronJob = null;

async function updateDailyRewardForAllUsers(newDailyRewardValue) {
    // Get all user documents
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();

    // Create a batch
    const batch = db.batch();

    // Add update operations to batch
    snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { dailyRewards: newDailyRewardValue });
    });

    // Commit the batch
    await batch.commit();
    console.log(`Updated dailyReward to ${newDailyRewardValue} for ${snapshot.size} users`);
}

exports.getPromotion = async (req, res) => {
    try {
        const promotion = await Promotion.findOne();

        if (!promotion) {
            return res.status(404).json({
                success: false,
                error: 'Promotion not found'
            });
        }

        res.status(200).json({
            success: true,
            data: promotion
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

exports.createPromotion = async (req, res) => {
    try {
        const promotion = await Promotion.create(req.body);

        if (promotion.active) {
            await scheduleRewardUpdates(promotion);
        }

        res.status(201).json({
            success: true,
            data: promotion
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);

            return res.status(400).json({
                success: false,
                error: messages
            });
        } else {
            return res.status(500).json({
                success: false,
                error: 'Server Error'
            });
        }
    }
};

exports.updatePromotion = async (req, res) => {
    try {
        const { start, end, timezone, active } = req.body;

        const updateFields = {};
        if (start !== undefined) updateFields.start = start;
        if (end !== undefined) updateFields.end = end;
        if (timezone !== undefined) updateFields.timezone = timezone;
        if (active !== undefined) updateFields.active = active;

        const oldPromotion = await Promotion.findOne({});

        const promotion = await Promotion.findOneAndUpdate(
            {},
            updateFields,
            { new: true, runValidators: true }
        );

        if (!promotion) {
            return res.status(404).json({ success: false, error: 'Promotion not found' });
        }

        if (active === true && (!oldPromotion || !oldPromotion.active)) {
            console.log("Running cron1")

            await scheduleRewardUpdates(promotion);
        } else if (active === false && oldPromotion && oldPromotion.active) {
            console.log("Running cron2")

            await cancelScheduledRewardUpdates();
            await updateDailyRewardForAllUsers(50);
        } else if (active === true && (start !== undefined || end !== undefined)) {
            console.log("Running cron3")

            await cancelScheduledRewardUpdates();
            await scheduleRewardUpdates(promotion);
        }

        res.status(200).json({ success: true, data: promotion });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

exports.deletePromotion = async (req, res) => {
    try {
        const promotion = await Promotion.findById(req.params.id);

        if (!promotion) {
            return res.status(404).json({
                success: false,
                error: 'Promotion not found'
            });
        }

        await promotion.remove();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

async function updatePromotionSettings(dailyReward) {
    try {
        const promotion = await Promotion.findOneAndUpdate(
            {},
            {
                promotion_settings: dailyReward,
            },
            { new: true }
        );

        if (!promotion) {
            console.warn('No promotion document found to update');
            return null;
        }

        console.log(`Updated promotion settings to ${dailyReward}`);
        return promotion;
    } catch (error) {
        console.error(`Error updating promotion settings: ${error.message}`);
        throw error;
    }
}

async function scheduleRewardUpdates(promotion) {
    await cancelScheduledRewardUpdates();

    const { start, end, timezone } = promotion;

    console.log(`Setting up promotion with timezone: ${timezone}`);

    const now = new Date();

    let startTime, endTime;

    // Handle time-only format (HH:MM)
    if (typeof start === 'string' && /^\d{1,2}:\d{2}$/.test(start)) {
        const [startHours, startMinutes] = start.split(':').map(Number);
        console.log(`Parsed start time: ${startHours}:${startMinutes}`);

        if (typeof end === 'string' && /^\d{1,2}:\d{2}$/.test(end)) {
            const [endHours, endMinutes] = end.split(':').map(Number);
            console.log(`Parsed end time: ${endHours}:${endMinutes}`);

            // First, check if the current time is within the promotion time range
            const currentTimeInTimezone = new Date(new Date().toLocaleString("en-US", { timeZone: timezone }));
            const currentHours = currentTimeInTimezone.getHours();
            const currentMinutes = currentTimeInTimezone.getMinutes();
            const currentTimeMinutes = currentHours * 60 + currentMinutes;

            const startTimeMinutes = startHours * 60 + startMinutes;
            const endTimeMinutes = endHours * 60 + endMinutes;

            console.log(`Current time in ${timezone}: ${currentHours}:${currentMinutes}`);
            console.log(`Checking if ${currentTimeMinutes} is between ${startTimeMinutes} and ${endTimeMinutes}`);

            // Handle case where promotion spans midnight
            const isPromotionActive = startTimeMinutes <= endTimeMinutes
                ? (currentTimeMinutes >= startTimeMinutes && currentTimeMinutes < endTimeMinutes)
                : (currentTimeMinutes >= startTimeMinutes || currentTimeMinutes < endTimeMinutes);

            if (isPromotionActive) {
                // Update daily reward value to 100 when promotion is active
                await updatePromotionSettings(100);
                await updateDailyRewardForAllUsers(100);
                console.log(`Promotion active now in ${timezone}: Daily rewards set to 100`);
            } else {
                console.log(`Promotion not currently active in ${timezone}`);
                // Ensure rewards are at default value outside promotion hours
                await updatePromotionSettings(50);
                await updateDailyRewardForAllUsers(50);
            }

            // Schedule daily start cron job
            const startCronExpression = `0 ${startMinutes} ${startHours} * * *`;
            console.log(`Setting up daily cron for start time: ${startCronExpression} in timezone ${timezone}`);

            try {
                startCronJob = cron.schedule(startCronExpression, async () => {
                    console.log(`Daily promotion start time reached in ${timezone}`);
                    await updatePromotionSettings(100);
                    await updateDailyRewardForAllUsers(100);
                    console.log('Promotion started: Daily rewards increased to 100');
                }, {
                    scheduled: true,
                    timezone: timezone || 'UTC'
                });

                console.log(`Scheduled daily reward increase via cron: ${startCronExpression} in ${timezone}`);
            } catch (error) {
                console.error('Error scheduling start cron job:', error);
            }

            // Schedule daily end cron job
            const endCronExpression = `0 ${endMinutes} ${endHours} * * *`;
            console.log(`Setting up daily cron for end time: ${endCronExpression} in timezone ${timezone}`);

            try {
                endCronJob = cron.schedule(endCronExpression, async () => {
                    console.log(`Daily promotion end time reached in ${timezone}`);
                    await updatePromotionSettings(50);
                    await updateDailyRewardForAllUsers(50);
                    console.log('Promotion ended: Daily rewards reset to 50');
                }, {
                    scheduled: true,
                    timezone: timezone || 'UTC'
                });

                console.log(`Scheduled daily reward reset via cron: ${endCronExpression} in ${timezone}`);
            } catch (error) {
                console.error('Error scheduling end cron job:', error);
            }

            return;
        }
    }

    console.error('Invalid promotion time format. Expected HH:MM format for start and end times.');
    return;
}

async function cancelScheduledRewardUpdates() {
    try {
        if (typeof startCronJob !== 'undefined' && startCronJob !== null) {
            startCronJob.stop();
            startCronJob = null;
            console.log('Successfully cancelled scheduled reward increase cron job');
        } else {
            console.log('No active start cron job to cancel');
        }

        if (typeof endCronJob !== 'undefined' && endCronJob !== null) {
            endCronJob.stop();
            endCronJob = null;
            console.log('Successfully cancelled scheduled reward reset cron job');
        } else {
            console.log('No active end cron job to cancel');
        }

        // Return success status to caller
        return { success: true, message: 'All scheduled cron jobs cancelled successfully' };
    } catch (error) {
        console.error('Error while cancelling scheduled cron jobs:', error);
        // Still set the cron jobs to null to ensure clean state
        startCronJob = null;
        endCronJob = null;
        // Return error status
        return { success: false, message: `Error cancelling cron jobs: ${error.message}` };
    }
}