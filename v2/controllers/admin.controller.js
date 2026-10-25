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
        const { targetLink, platform, actionType, type, linkTypeName, maxCount, isVip, comments } = req.body;
        
        if (!targetLink || !platform || !actionType || !maxCount) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const jobData = {
            targetLink,
            platform: platform.toLowerCase(),
            actionType: actionType.toLowerCase(),
            type: type || 'post',
            linkTypeName: linkTypeName || 'Like',
            maxCount: parseInt(maxCount),
            isVip: isVip || false,
            comments: Array.isArray(comments) ? comments.filter(c => c.trim().length > 0) : [],
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
        const { 
            page = 1, 
            limit = 20, 
            searchQuery, 
            platformFilter, 
            statusFilter, 
            errorFilter, 
            vipFilter, 
            startDate, 
            endDate 
        } = req.query;

        const query = {};

        // Search Query (Regex match against multiple fields & robust URL normalization)
        if (searchQuery) {
            const trimmed = searchQuery.trim();
            const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const searchPatterns = new Set();
            searchPatterns.add(escapeRegex(trimmed));

            // Strip query parameters and hash (e.g. ?_rdr, ?mibextid=..., #ref)
            const cleanUrl = trimmed.split('?')[0].split('#')[0].replace(/\/+$/, '');
            if (cleanUrl) {
                searchPatterns.add(escapeRegex(cleanUrl));
            }

            // Strip protocol and common subdomains (www., m., mobile., l., web.)
            const normalized = cleanUrl.replace(/^(https?:\/\/)?(www\.|m\.|mobile\.|l\.|web\.)?/i, '');
            if (normalized) {
                searchPatterns.add(escapeRegex(normalized));
            }

            // Path/slug part of the URL
            if (normalized.includes('/')) {
                const slug = normalized.substring(normalized.indexOf('/') + 1).replace(/\/+$/, '');
                if (slug.length >= 3) {
                    searchPatterns.add(escapeRegex(slug));
                }
            }

            const orConditions = [];
            for (const pat of searchPatterns) {
                orConditions.push({ targetLink: { $regex: pat, $options: 'i' } });
            }
            if (mongoose.Types.ObjectId.isValid(trimmed)) {
                orConditions.push({ _id: new mongoose.Types.ObjectId(trimmed) });
            }
            orConditions.push(
                { target_id: { $regex: escapeRegex(trimmed), $options: 'i' } },
                { mediaId: { $regex: escapeRegex(trimmed), $options: 'i' } },
                { userPk: { $regex: escapeRegex(trimmed), $options: 'i' } },
                { jobId: { $regex: escapeRegex(trimmed), $options: 'i' } }
            );

            query.$or = orConditions;
        }

        // Platform Filter
        if (platformFilter && platformFilter !== 'All') {
            query.platform = platformFilter.toLowerCase();
        }

        // Status Filter
        if (statusFilter && statusFilter !== 'All') {
            const sf = statusFilter.toLowerCase();
            if (sf === 'active') {
                query.status = { $regex: '^active$', $options: 'i' };
                query.$expr = { $lt: ["$likeCount", "$maxCount"] };
            } else if (sf === 'completed') {
                query.$or = [
                    { status: { $regex: '^completed$', $options: 'i' } },
                    { $expr: { $gte: ["$likeCount", "$maxCount"] } }
                ];
            } else {
                query.status = { $regex: `^${statusFilter}$`, $options: 'i' };
            }
        }

        // Error Filter
        if (errorFilter && errorFilter !== 'All') {
            if (errorFilter === 'Errors') {
                query.resolutionStatus = 'fallback';
            } else if (errorFilter === 'No Errors') {
                query.resolutionStatus = { $ne: 'fallback' };
            }
        }

        // VIP Filter
        if (vipFilter && vipFilter !== 'All') {
            if (vipFilter === 'VIP') query.isVip = true;
            if (vipFilter === 'Normal') query.isVip = { $ne: true };
        }

        // Date Range Filter
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const limitNum = parseInt(limit);

        const totalCount = await JobV2.countDocuments(query);
        const jobs = await JobV2.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        res.status(200).json({
            jobs,
            totalCount,
            totalPages: Math.ceil(totalCount / limitNum),
            currentPage: parseInt(page)
        });
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

        // Auto-retry fallback jobs that failed due to cookie issues
        await JobV2.updateMany(
            { platform: platform.toLowerCase(), resolutionStatus: 'fallback' },
            { $set: { resolutionStatus: 'pending', isLive: false } }
        );

        res.status(200).json({ message: `${platform} cookies saved successfully. Retrying any failed jobs.` });
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

        // Auto-retry fallback jobs that failed due to cookie issues
        await JobV2.updateMany(
            { platform: platform.toLowerCase(), resolutionStatus: 'fallback' },
            { $set: { resolutionStatus: 'pending', isLive: false } }
        );

        res.status(200).json({
            message: `Extraction account for ${platform} set to ${user.email}`,
            account
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getJobById = async (req, res) => {
    try {
        const job = await JobV2.findById(req.params.id);
        if (!job) return res.status(404).json({ message: "Job not found" });
        res.status(200).json(job);
    } catch (error) {
        console.error("Error in getJobById:", error);
        res.status(500).json({ message: error.message });
    }
};

exports.updateJobStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['Active', 'Paused', 'Stopped'].includes(status)) {
            return res.status(400).json({ message: "Invalid status. Must be Active, Paused, or Stopped" });
        }
        
        const job = await JobV2.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        
        if (!job) return res.status(404).json({ message: "Job not found" });
        res.status(200).json(job);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteJob = async (req, res) => {
    try {
        const job = await JobV2.findByIdAndDelete(req.params.id);
        if (!job) return res.status(404).json({ message: "Job not found" });
        res.status(200).json({ message: "Job deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.bulkDeleteJobs = async (req, res) => {
    try {
        const { jobIds } = req.body;
        if (!Array.isArray(jobIds) || jobIds.length === 0) {
            return res.status(400).json({ message: "jobIds array is required" });
        }
        await JobV2.deleteMany({ _id: { $in: jobIds } });
        res.status(200).json({ message: "Jobs deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.pauseAllJobs = async (req, res) => {
    try {
        const result = await JobV2.updateMany(
            { status: { $in: ['Active', 'active'] } },
            { $set: { status: 'Paused' } }
        );
        res.status(200).json({ message: `Successfully paused ${result.modifiedCount} active jobs.` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
