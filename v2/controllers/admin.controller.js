const JobV2 = require('../models/JobV2');
const { AdminCookie } = require('../core/JobWorker');
const User = require('../../models/user');
const mongoose = require('mongoose');

// Singleton model to store which user's cookies to use for extraction
const ExtractionAccountSchema = new mongoose.Schema({
    platform: { type: String, unique: true },   // 'facebook' | 'instagram'
    userId: { type: String, default: null },     // MongoDB User _id
    email: { type: String, default: null },      // for display only
});
const ExtractionAccount = mongoose.models.ExtractionAccount
    || mongoose.model('ExtractionAccount', ExtractionAccountSchema);

module.exports._ExtractionAccount = ExtractionAccount;

exports.createJob = async (req, res) => {
    try {
        const { targetLink, platform, actionType, maxCount, isVip, comments } = req.body;
        
        if (!targetLink || !platform || !actionType || !maxCount) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const jobData = {
            targetLink,
            platform: platform.toLowerCase(),
            actionType: actionType.toLowerCase(),
            maxCount: parseInt(maxCount),
            isVip: isVip || false,
            comments: Array.isArray(comments) ? comments : [],
            creatorId: "----admin----",
            isLive: false, // It will be live once ID is resolved
            resolutionStatus: 'pending' // Tell worker to resolve it
        };

        const job = new JobV2(jobData);
        await job.save();

        res.status(201).json({ message: "Job created and pending ID resolution.", job });
    } catch (error) {
        console.error("[Admin V2] Create Job Error:", error);
        res.status(500).json({ message: error.message });
    }
};

exports.getJobs = async (req, res) => {
    try {
        const jobs = await JobV2.find().sort({ createdAt: -1 }).limit(100);
        res.status(200).json(jobs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.saveCookies = async (req, res) => {
    try {
        const { platform, cookieString } = req.body;
        
        if (!platform || !cookieString) {
            return res.status(400).json({ message: "Platform and cookieString required" });
        }

        await AdminCookie.findOneAndUpdate(
            { platform: platform.toLowerCase() },
            { cookieString },
            { upsert: true, new: true }
        );

        res.status(200).json({ message: `${platform} cookies saved successfully.` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getCookiesStatus = async (req, res) => {
    try {
        const cookies = await AdminCookie.find();
        const status = cookies.map(c => ({
            platform: c.platform,
            isSet: !!c.cookieString
        }));
        res.status(200).json(status);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/v4/admin/v2/users-with-cookies?platform=facebook
exports.getUsersWithCookies = async (req, res) => {
    try {
        const { platform } = req.query;
        const field = platform === 'instagram' ? 'instagramCookies' : 'facebookCookies';

        const users = await User.find({ [field]: { $exists: true, $ne: '' } })
            .select('_id email nom prenom photo facebookCookies instagramCookies')
            .lean();

        // Return safe info (don't expose full cookie string, just first 30 chars)
        const safe = users.map(u => ({
            _id: u._id,
            email: u.email,
            name: `${u.prenom || ''} ${u.nom || ''}`.trim() || u.email,
            photo: u.photo,
            cookiePreview: (u[field] || '').slice(0, 40) + '...'
        }));

        res.status(200).json(safe);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/v4/admin/v2/extraction-account
exports.getExtractionAccount = async (req, res) => {
    try {
        const accounts = await ExtractionAccount.find();
        res.status(200).json(accounts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST /api/v4/admin/v2/extraction-account
// Body: { platform: 'facebook', userId: '...' }
exports.setExtractionAccount = async (req, res) => {
    try {
        const { platform, userId } = req.body;

        if (!platform || !userId) {
            return res.status(400).json({ message: 'platform and userId are required' });
        }

        const user = await User.findById(userId).select('email nom prenom');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const account = await ExtractionAccount.findOneAndUpdate(
            { platform: platform.toLowerCase() },
            {
                platform: platform.toLowerCase(),
                userId,
                email: user.email
            },
            { upsert: true, new: true }
        );

        res.status(200).json({
            message: `Extraction account for ${platform} set to ${user.email}`,
            account
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
