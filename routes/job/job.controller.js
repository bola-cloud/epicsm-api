const mongoose = require('mongoose');
const Job = require('../../models/job');
const JobV2 = require('../../v2/models/JobV2');
const Ping = require('../../models/ping');
const Blocked = require('../../models/blocked');
const authController = require('../authentication/authentication.controller')


function formatV2Job(j) {
    if (!j) return null;
    const isCompleted = (typeof j.maxCount === 'number' && typeof j.likeCount === 'number' && j.maxCount > 0 && j.likeCount >= j.maxCount) ||
        j.status === 'Completed' || j.status === 'completed';
    const isFallback = j.resolutionStatus === 'fallback';
    const resolvedId = j.target_id || j.mediaId || j.userPk;
    return {
        _id: j._id,
        jobId: j.jobId,
        link: j.targetLink,
        targetLink: j.targetLink,
        platform: j.platform ? j.platform.charAt(0).toUpperCase() + j.platform.slice(1).toLowerCase() : 'Facebook',
        type: j.type || 'post',
        linkTypeName: j.linkTypeName || (j.actionType ? j.actionType.charAt(0).toUpperCase() + j.actionType.slice(1).toLowerCase() : 'Like'),
        actionType: j.actionType,
        maxCount: j.maxCount,
        likeCount: j.likeCount || 0,
        isVip: Boolean(j.isVip),
        status: isCompleted ? 'Completed' : ((j.status === 'active' || j.status === 'Active') ? 'Active' : (j.status || 'Off')),
        isLive: (j.status === 'active' || j.status === 'Active') && !isCompleted,
        createdAt: j.createdAt,
        datePublished: j.createdAt || new Date(),
        uid: j.creatorId || j.uid || '----admin----',
        creatorId: j.creatorId || j.uid || '----admin----',
        comments: j.comments || [],
        country: j.country || 'all',
        resolutionStatus: j.resolutionStatus || 'resolved',
        resolutionError: j.resolutionError || null,
        executionMethod: isFallback ? 'رابط مباشر (Fallback)' : (resolvedId ? 'سكربت آلي (Script Resolved)' : 'نظام V2 الذكي'),
        target_id: j.target_id,
        mediaId: j.mediaId,
        userPk: j.userPk,
        resolvedId: resolvedId,
        version: 'V2',
        isV2: true
    };
}


exports.CreateJob = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);

        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const comments = Array.isArray(req.body.comments)
            ? req.body.comments.filter(comment => typeof comment === 'string' && comment.trim().length > 0)
            : [];

        const targetLink = req.body.link || req.body.targetLink;
        if (!targetLink) {
            return res.status(400).json({ message: 'Link is required' });
        }

        const platform = (req.body.platform || 'facebook').toLowerCase();
        let actionType = 'like';
        const typeStr = (req.body.linkTypeName || req.body.type || '').toLowerCase();
        if (typeStr.includes('follow') || typeStr.includes('friend')) {
            actionType = 'follow';
        } else if (typeStr.includes('comment')) {
            actionType = 'comment';
        } else if (typeStr.includes('view')) {
            actionType = 'view';
        } else if (typeStr.includes('share')) {
            actionType = 'share';
        }

        const { createNewJobV2 } = require('../../v2/index');
        const jobData = {
            targetLink,
            platform,
            actionType,
            type: req.body.type || 'post',
            linkTypeName: req.body.linkTypeName || 'Like',
            maxCount: parseInt(req.body.maxCount) || 1,
            isVip: Boolean(req.body.isVip),
            comments,
            country: req.body.country || 'all',
            creatorId: isUser._id ? isUser._id.toString() : '----admin----',
            resolutionStatus: 'pending'
        };

        const savedJob = await createNewJobV2(jobData);
        console.log(`[Dashboard CreateJob] Routed new dashboard job to V2 (JobV2 _id: ${savedJob._id}, isVip: ${savedJob.isVip})`);

        res.status(201).json(formatV2Job(savedJob));
    } catch (error) {
        console.error('[Dashboard CreateJob] Error creating V2 job:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.GetJobs = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);
        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [v2Count, v1Count] = await Promise.all([
            JobV2.countDocuments(),
            Job.countDocuments()
        ]);
        const totalCount = v2Count + v1Count;

        let jobs = [];
        if (skip < v2Count) {
            const v2Limit = Math.min(limit, v2Count - skip);
            const rawV2 = await JobV2.find().sort({ createdAt: -1 }).skip(skip).limit(v2Limit).lean();
            jobs.push(...rawV2.map(formatV2Job));

            if (jobs.length < limit) {
                const remaining = limit - jobs.length;
                const rawV1 = await Job.find().sort({ createdAt: -1 }).limit(remaining).lean();
                jobs.push(...rawV1.map(j => ({ ...j, version: 'V1', isV2: false })));
            }
        } else {
            const v1Skip = skip - v2Count;
            const rawV1 = await Job.find().sort({ createdAt: -1 }).skip(v1Skip).limit(limit).lean();
            jobs.push(...rawV1.map(j => ({ ...j, version: 'V1', isV2: false })));
        }

        res.status(200).json({
            jobs,
            pagination: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.GetLatestJobs = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);

        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const [v2Jobs, v1Jobs] = await Promise.all([
            JobV2.find().sort({ createdAt: -1 }).limit(10).lean(),
            Job.find().sort({ createdAt: -1 }).limit(10).lean()
        ]);

        const mappedV2 = v2Jobs.map(formatV2Job);
        const mappedV1 = v1Jobs.map(j => ({
            ...j,
            version: 'V1',
            isV2: false
        }));

        const combined = [...mappedV2, ...mappedV1]
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
            .slice(0, 10);

        res.status(200).json(combined);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.GetJobsByPlatform = async (req, res) => {
    try {
        const { platform } = req.params;
        const platRegex = new RegExp(`^${platform}$`, 'i');
        const [v2Jobs, v1Jobs] = await Promise.all([
            JobV2.find({ platform: platRegex }).sort({ createdAt: -1 }).lean(),
            Job.find({ platform: platRegex }).sort({ createdAt: -1 }).lean()
        ]);

        const combined = [...v2Jobs.map(formatV2Job), ...v1Jobs.map(j => ({ ...j, version: 'V1', isV2: false }))]
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        res.status(200).json(combined);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.GetJobsLengthByPlatform = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);

        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const [fbV1, fbV2, igV1, igV2] = await Promise.all([
            Job.countDocuments({ platform: { $regex: /^facebook$/i } }),
            JobV2.countDocuments({ platform: { $regex: /^facebook$/i } }),
            Job.countDocuments({ platform: { $regex: /^instagram$/i } }),
            JobV2.countDocuments({ platform: { $regex: /^instagram$/i } })
        ]);

        const facebookJobsLength = fbV1 + fbV2;
        const instagramJobsLength = igV1 + igV2;

        res.status(200).json({
            facebook: facebookJobsLength,
            instagram: instagramJobsLength,
            v1: { facebook: fbV1, instagram: igV1 },
            v2: { facebook: fbV2, instagram: igV2 }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.GetOnlineUsersLength = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);

        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const InMemoryManager = require('../../v2/core/InMemoryManager');
        const onlineUsers = InMemoryManager.getActiveCount();

        res.status(200).json({
            onlineUsers: onlineUsers
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.GetJobById = async (req, res) => {
    try {
        const id = req.params.id;
        let job = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            const j2 = await JobV2.findById(id).lean();
            if (j2) job = formatV2Job(j2);
            if (!job) {
                job = await Job.findById(id).lean();
            }
        }
        if (!job) {
            const j2 = await JobV2.findOne({ jobId: id }).lean();
            if (j2) job = formatV2Job(j2);
        }
        if (!job) {
            job = await Job.findOne({ jobId: id }).lean();
        }

        if (!job) return res.status(404).json({ message: 'Job not found' });

        // Fetch execution actions from JobActionV2 (who completed this order and how)
        try {
            const JobActionV2 = require('../../v2/models/JobActionV2');
            const User = require('../../models/user');

            const queryJobIds = [job.jobId];
            if (job._id) queryJobIds.push(job._id.toString());

            const actions = await JobActionV2.find({ jobId: { $in: queryJobIds } })
                .sort({ createdAt: -1 })
                .limit(100)
                .lean();

            const userIds = [...new Set(actions.map(a => a.userId).filter(Boolean))];
            const users = await User.find(
                { uid: { $in: userIds } },
                { uid: 1, email: 1, name: 1, photo: 1 }
            ).lean();
            const userMap = new Map();
            users.forEach(u => userMap.set(u.uid, u));

            const enrichedActions = actions.map(a => {
                const u = userMap.get(a.userId);
                let execMethod = 'Worker App';
                if (a.reason) {
                    if (a.reason.includes('script') || a.reason.includes('direct')) {
                        execMethod = 'سكريبت مباشر (Script Direct)';
                    } else if (a.reason.includes('fallback')) {
                        execMethod = 'متصفح يدوي (Fallback)';
                    } else {
                        execMethod = a.reason;
                    }
                }
                return {
                    _id: a._id,
                    userId: a.userId,
                    userName: u?.name || 'مستخدم',
                    userEmail: u?.email || a.userId,
                    userPhoto: u?.photo || '',
                    status: a.status,
                    reason: a.reason || 'Normal interaction',
                    executionMethod: execMethod,
                    createdAt: a.createdAt
                };
            });

            job.actions = enrichedActions;
            job.actionsCount = actions.length;
        } catch (actionErr) {
            console.error('[GetJobById] Error fetching actions:', actionErr.message);
            job.actions = [];
            job.actionsCount = 0;
        }

        res.status(200).json(job);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.UpdateJob = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);

        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { isLive } = req.body;
        const newStatus = isLive ? "Active" : "Off";
        const id = req.params.id;

        let updatedJob = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            updatedJob = await Job.findByIdAndUpdate(
                id,
                { ...req.body, status: newStatus },
                { new: true, runValidators: true }
            );
            if (!updatedJob) {
                const v2Status = isLive ? "active" : "paused";
                const j2 = await JobV2.findByIdAndUpdate(
                    id,
                    { ...req.body, status: v2Status },
                    { new: true }
                );
                if (j2) updatedJob = formatV2Job(j2);
            }
        }
        if (!updatedJob) {
            const v2Status = isLive ? "active" : "paused";
            const j2 = await JobV2.findOneAndUpdate(
                { jobId: id },
                { ...req.body, status: v2Status },
                { new: true }
            );
            if (j2) updatedJob = formatV2Job(j2);
        }

        if (!updatedJob) {
            return res.status(404).json({ message: 'Job not found' });
        }

        res.status(200).json(updatedJob);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.DeleteJob = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);

        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const id = req.params.id;
        let deleted = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            deleted = await Job.findByIdAndDelete(id);
            if (!deleted) {
                deleted = await JobV2.findByIdAndDelete(id);
            }
        }
        if (!deleted) {
            deleted = await JobV2.findOneAndDelete({ jobId: id });
        }
        if (!deleted) {
            deleted = await Job.findOneAndDelete({ jobId: id });
        }

        if (!deleted) return res.status(404).json({ message: 'Job not found' });
        res.json({ message: 'Job deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.BulkDeleteJobs = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);

        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { jobIds } = req.body;

        if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
            return res.status(400).json({ message: 'No job IDs provided' });
        }

        const validObjectIds = jobIds.filter(id => mongoose.Types.ObjectId.isValid(id));
        const [deleteV1, deleteV2] = await Promise.all([
            Job.deleteMany({ _id: { $in: jobIds } }),
            JobV2.deleteMany({ $or: [{ _id: { $in: validObjectIds } }, { jobId: { $in: jobIds } }] })
        ]);

        const totalDeleted = (deleteV1.deletedCount || 0) + (deleteV2.deletedCount || 0);

        if (totalDeleted === 0) {
            return res.status(404).json({ message: 'No jobs found to delete' });
        }

        res.json({
            message: 'Jobs deleted successfully',
            deletedCount: totalDeleted
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.SearchJobs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const searchQuery = req.query.q || '';
        const trimmed = searchQuery.trim();
        const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const escaped = escapeRegex(trimmed);

        const searchPatterns = new Set();
        searchPatterns.add(escaped);

        const cleanUrl = trimmed.split('?')[0].split('#')[0].replace(/\/+$/, '');
        if (cleanUrl) {
            searchPatterns.add(escapeRegex(cleanUrl));
        }

        const normalized = cleanUrl.replace(/^(https?:\/\/)?(www\.|m\.|mobile\.|l\.|web\.)?/i, '');
        if (normalized) {
            searchPatterns.add(escapeRegex(normalized));
        }

        if (normalized.includes('/')) {
            const slug = normalized.substring(normalized.indexOf('/') + 1).replace(/\/+$/, '');
            if (slug.length >= 3) {
                searchPatterns.add(escapeRegex(slug));
            }
        }

        const skipDocs = (page - 1) * limit;

        const searchCriteriaV1 = {
            $or: [
                { jobId: { $regex: escaped, $options: 'i' } },
                { platform: { $regex: escaped, $options: 'i' } },
                { status: { $regex: escaped, $options: 'i' } },
                { linkTypeName: { $regex: escaped, $options: 'i' } },
                { uid: { $regex: escaped, $options: 'i' } },
                { country: { $regex: escaped, $options: 'i' } },
                { type: { $regex: escaped, $options: 'i' } }
            ]
        };

        const searchCriteriaV2 = {
            $or: [
                { jobId: { $regex: escaped, $options: 'i' } },
                { platform: { $regex: escaped, $options: 'i' } },
                { status: { $regex: escaped, $options: 'i' } },
                { linkTypeName: { $regex: escaped, $options: 'i' } },
                { actionType: { $regex: escaped, $options: 'i' } },
                { creatorId: { $regex: escaped, $options: 'i' } },
                { type: { $regex: escaped, $options: 'i' } }
            ]
        };

        if (mongoose.Types.ObjectId.isValid(trimmed)) {
            searchCriteriaV1.$or.push({ _id: new mongoose.Types.ObjectId(trimmed) });
            searchCriteriaV2.$or.push({ _id: new mongoose.Types.ObjectId(trimmed) });
        }

        for (const pat of searchPatterns) {
            searchCriteriaV1.$or.push({ link: { $regex: pat, $options: 'i' } });
            searchCriteriaV2.$or.push({ targetLink: { $regex: pat, $options: 'i' } });
        }

        if (!isNaN(searchQuery) && trimmed !== '') {
            const numVal = parseInt(searchQuery);
            searchCriteriaV1.$or.push({ likeCount: numVal }, { maxCount: numVal });
            searchCriteriaV2.$or.push({ likeCount: numVal }, { maxCount: numVal });
        }

        const dateQuery = new Date(searchQuery);
        if (!isNaN(dateQuery.getTime())) {
            const startOfDay = new Date(dateQuery.setHours(0, 0, 0, 0));
            const endOfDay = new Date(dateQuery.setHours(23, 59, 59, 999));

            const dateCond = {
                $or: [
                    { datePublished: { $gte: startOfDay, $lte: endOfDay } },
                    { createdAt: { $gte: startOfDay, $lte: endOfDay } }
                ]
            };
            searchCriteriaV1.$or.push(...dateCond.$or);
            searchCriteriaV2.$or.push({ createdAt: { $gte: startOfDay, $lte: endOfDay } });
        }

        const [v2Matches, v1Matches, countV2, countV1] = await Promise.all([
            JobV2.find(searchCriteriaV2).sort({ createdAt: -1 }).limit(limit * page).lean(),
            Job.find(searchCriteriaV1).sort({ createdAt: -1 }).limit(limit * page).lean(),
            JobV2.countDocuments(searchCriteriaV2),
            Job.countDocuments(searchCriteriaV1)
        ]);

        const total = countV2 + countV1;
        const mappedV2 = v2Matches.map(formatV2Job);
        const mappedV1 = v1Matches.map(j => ({ ...j, version: 'V1', isV2: false }));
        const allMatched = [...mappedV2, ...mappedV1].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        const paginated = allMatched.slice(skipDocs, skipDocs + limit);

        const totalPages = Math.ceil(total / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        return res.status(200).json({
            success: true,
            jobs: paginated,
            pagination: {
                total,
                page,
                totalPages,
                hasNextPage,
                hasPrevPage,
                limit
            }
        });

    } catch (error) {
        console.error('Search error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during search',
            error: error.message
        });
    }
};

exports.FilterJobs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skipDocs = (page - 1) * limit;

        const filterCriteriaV1 = {};
        const filterCriteriaV2 = {};

        if (req.query.platformFilter) {
            filterCriteriaV1.platform = { $regex: req.query.platformFilter, $options: 'i' };
            filterCriteriaV2.platform = { $regex: req.query.platformFilter, $options: 'i' };
        }

        if (req.query.statusFilter) {
            const sf = req.query.statusFilter.toLowerCase();
            if (sf === 'active') {
                filterCriteriaV1.status = 'Active';
                filterCriteriaV1.$expr = { $lt: ["$likeCount", "$maxCount"] };
                filterCriteriaV2.status = { $regex: /^active$/i };
                filterCriteriaV2.$expr = { $lt: ["$likeCount", "$maxCount"] };
            } else if (sf === 'completed') {
                filterCriteriaV1.$or = [
                    { status: 'Completed' },
                    { $expr: { $gte: ["$likeCount", "$maxCount"] } }
                ];
                filterCriteriaV2.$or = [
                    { status: { $regex: /^completed$/i } },
                    { $expr: { $gte: ["$likeCount", "$maxCount"] } }
                ];
            } else {
                filterCriteriaV1.status = req.query.statusFilter;
                filterCriteriaV2.status = { $regex: new RegExp(`^${req.query.statusFilter}$`, 'i') };
            }
        }

        if (req.query.jobIdFilter) {
            filterCriteriaV1.jobId = { $regex: req.query.jobIdFilter, $options: 'i' };
            filterCriteriaV2.jobId = { $regex: req.query.jobIdFilter, $options: 'i' };
        }

        if (req.query.linkTypeNameFilter) {
            filterCriteriaV1.linkTypeName = { $regex: req.query.linkTypeNameFilter, $options: 'i' };
            filterCriteriaV2.$or = [
                { linkTypeName: { $regex: req.query.linkTypeNameFilter, $options: 'i' } },
                { actionType: { $regex: req.query.linkTypeNameFilter, $options: 'i' } }
            ];
        }

        if (req.query.uidFilter) {
            filterCriteriaV1.uid = { $regex: req.query.uidFilter, $options: 'i' };
            filterCriteriaV2.creatorId = { $regex: req.query.uidFilter, $options: 'i' };
        }

        if (req.query.minLikes) {
            const minL = parseInt(req.query.minLikes);
            filterCriteriaV1.likeCount = { $gte: minL };
            filterCriteriaV2.likeCount = { $gte: minL };
        }

        if (req.query.minMaxCount) {
            const minM = parseInt(req.query.minMaxCount);
            filterCriteriaV1.maxCount = { $gte: minM };
            filterCriteriaV2.maxCount = { $gte: minM };
        }

        if (req.query.startDate || req.query.endDate) {
            const dateObj = {};
            if (req.query.startDate) {
                const startDate = new Date(req.query.startDate);
                startDate.setHours(0, 0, 0, 0);
                dateObj.$gte = startDate;
            }
            if (req.query.endDate) {
                const endDate = new Date(req.query.endDate);
                endDate.setHours(23, 59, 59, 999);
                dateObj.$lte = endDate;
            }
            filterCriteriaV1.datePublished = dateObj;
            filterCriteriaV2.createdAt = dateObj;
        }

        if (req.query.isVipFilter === 'true') {
            filterCriteriaV1.isVip = true;
            filterCriteriaV2.isVip = true;
        } else if (req.query.isVipFilter === 'false') {
            filterCriteriaV1.$or = [{ isVip: false }, { isVip: { $exists: false } }];
            filterCriteriaV2.$or = [{ isVip: false }, { isVip: { $exists: false } }];
        }

        const [v2Filtered, v1Filtered, countV2, countV1] = await Promise.all([
            JobV2.find(filterCriteriaV2).sort({ createdAt: -1 }).limit(limit * page).lean(),
            Job.find(filterCriteriaV1).sort({ createdAt: -1 }).limit(limit * page).lean(),
            JobV2.countDocuments(filterCriteriaV2),
            Job.countDocuments(filterCriteriaV1)
        ]);

        const total = countV2 + countV1;
        const mappedV2 = v2Filtered.map(formatV2Job);
        const mappedV1 = v1Filtered.map(j => ({ ...j, version: 'V1', isV2: false }));
        const allMatched = [...mappedV2, ...mappedV1].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        const paginated = allMatched.slice(skipDocs, skipDocs + limit);

        const totalPages = Math.ceil(total / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        return res.status(200).json({
            success: true,
            jobs: paginated,
            pagination: {
                total,
                page,
                totalPages,
                hasNextPage,
                hasPrevPage,
                limit
            }
        });
    } catch (error) {
        console.error('Filter error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during filter',
            error: error.message
        });
    }
};


exports.GetAllJobIds = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);
        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Only fetch the _id field for efficiency
        const jobs = await Job.find({}, { _id: 1 });

        // Extract the job IDs
        const jobIds = jobs.map(job => job._id.toString());

        res.status(200).json({
            jobIds,
            count: jobIds.length
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.GetFilteredJobIds = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);
        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const filterCriteria = {};

        if (req.query.platformFilter) {
            filterCriteria.platform = { $regex: req.query.platformFilter, $options: 'i' };
        }

        if (req.query.statusFilter) {
            filterCriteria.status = req.query.statusFilter;
        }

        if (req.query.jobIdFilter) {
            filterCriteria.jobId = { $regex: req.query.jobIdFilter, $options: 'i' };
        }

        if (req.query.linkTypeNameFilter) {
            filterCriteria.linkTypeName = { $regex: req.query.linkTypeNameFilter, $options: 'i' };
        }

        if (req.query.uidFilter) {
            filterCriteria.uid = { $regex: req.query.uidFilter, $options: 'i' };
        }

        if (req.query.minLikes) {
            filterCriteria.likeCount = { $gte: parseInt(req.query.minLikes) };
        }

        if (req.query.minMaxCount) {
            filterCriteria.maxCount = { $gte: parseInt(req.query.minMaxCount) };
        }

        if (req.query.startDate || req.query.endDate) {
            filterCriteria.datePublished = {};

            if (req.query.startDate) {
                const startDate = new Date(req.query.startDate);
                startDate.setHours(0, 0, 0, 0);
                filterCriteria.datePublished.$gte = startDate;
            }

            if (req.query.endDate) {
                const endDate = new Date(req.query.endDate);
                endDate.setHours(23, 59, 59, 999);
                filterCriteria.datePublished.$lte = endDate;
            }
        }

        if (req.query.liveFilter && req.query.liveFilter !== 'all') {
            filterCriteria.isLive = req.query.liveFilter === 'true';
        }

        if (req.query.isVipFilter === 'true') {
            filterCriteria.isVip = true;
        } else if (req.query.isVipFilter === 'false') {
            filterCriteria.$or = [
                { isVip: false },
                { isVip: { $exists: false } }
            ];
        }

        // Get all job IDs without pagination - we're using lean() for better performance
        // and only selecting the _id field
        const jobs = await Job.find(filterCriteria)
            .select('_id')
            .lean();

        // Extract the job IDs
        const jobIds = jobs.map(job => job._id.toString());

        return res.status(200).json({
            success: true,
            jobIds,
            count: jobIds.length
        });

    } catch (error) {
        console.error('GetFilteredJobIds error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while getting filtered job IDs',
            error: error.message
        });
    }
};

// For search results
exports.GetSearchJobIds = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);
        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { q } = req.query;

        if (!q) {
            return res.status(400).json({ message: 'Search query is required' });
        }

        // Create a search query similar to your existing search endpoint
        // Adjust this based on your actual search implementation
        const searchQuery = {
            $or: [
                { title: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } },
                { platform: { $regex: q, $options: 'i' } },
                { jobId: { $regex: q, $options: 'i' } },
                // Add other fields you want to search
            ]
        };

        // Only fetch the _id field for efficiency
        const jobs = await Job.find(searchQuery, { _id: 1 });

        // Extract the job IDs
        const jobIds = jobs.map(job => job._id.toString());

        res.status(200).json({
            jobIds,
            count: jobIds.length
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// Mobile API
exports.mCreateJob = async (req, res) => {
    try {
        const MobileV2Controller = require('../../v2/controllers/mobile.controller');
        return await MobileV2Controller.mCreateJobV2(req, res);
    } catch (error) {
        console.error('Error creating job via legacy route forwarding:', error);
        return res.status(500).json({ message: error.message });
    }
};

exports.mCreateJob_legacy = async (req, res) => {
    try {
        const { uid } = req.body;

        if (!uid) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        // Check if user is in blockedAP
        const blockedData = await Blocked.findOne();
        if (blockedData && blockedData.blockedAP.includes(uid)) {
            // Return empty response for blocked users
            return res.status(200).json({});
        }

        // Get the user from MongoDB to check VIP status
        const User = require('../../models/user');
        const userData = await User.findOne({ uid }).lean();

        if (!userData) {
            return res.status(404).json({ message: 'User not found' });
        }

        const comments = Array.isArray(req.body.comments)
            ? req.body.comments.filter(comment => typeof comment === 'string' && comment.trim().length > 0)
            : [];

        const jobData = {
            ...req.body,
            comments,
        };

        if (userData.isVip) {
            jobData.isVip = true;
        }

        const newJob = new Job(jobData);
        const savedJob = await newJob.save();

        res.status(201).json(savedJob);
    } catch (error) {
        console.error('Error creating job:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.mGetMyJobs = async (req, res) => {
    try {
        const JobV2 = require('../../v2/models/JobV2');
        const [v1Jobs, v2Jobs] = await Promise.all([
            Job.find({ uid: req.params.id, status: { $ne: 'Deleted' } }).sort({ createdAt: -1 }).lean(),
            JobV2.find({ creatorId: req.params.id, status: { $nin: ['Cancelled', 'Deleted'] } }).sort({ createdAt: -1 }).lean()
        ]);

        const mappedV2 = (v2Jobs || []).map(j => ({
            ...j,
            uid: j.creatorId,
            link: j.targetLink,
            datePublished: j.createdAt,
            isLive: j.status === 'Active'
        }));

        const combined = [...mappedV2, ...(v1Jobs || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.status(200).json(combined);
    } catch (error) {
        console.error('Error fetching my jobs:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.mDeleteJob = async (req, res) => {
    try {
        const JobV2 = require('../../v2/models/JobV2');
        const [deletedV1, deletedV2] = await Promise.all([
            Job.findOneAndUpdate(
                { jobId: req.params.jobId },
                { ...req.body, status: "Deleted", isLive: false },
                { new: true }
            ),
            JobV2.findOneAndUpdate(
                { jobId: req.params.jobId },
                { status: "Cancelled" },
                { new: true }
            )
        ]);

        if (!deletedV1 && !deletedV2) {
            return res.status(404).json({ message: 'Job not found' });
        }
        res.status(200).json({ message: 'Job deleted successfully' });
    } catch (error) {
        console.error('Error deleting job:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.mGetJobsToLike = async (req, res) => {
    try {
        const { uid } = req.params;

        if (!uid) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        // Check if user is in blockedPL
        const blockedData = await Blocked.findOne();
        if (blockedData && blockedData.blockedPL.includes(uid)) {
            // Return empty response for blocked users
            return res.status(200).json({});
        }

        let jobs = await Job.find({
            status: "Active",
            isLive: true,
            $or: [
                { country: req.params.country },
                { country: "all" }
            ],
            $expr: { $lt: ["$likeCount", "$maxCount"] }
        });

        if (!jobs || jobs.length === 0) {
            return res.status(404).json({ message: 'No Job found' });
        }

        jobs = jobs.filter(job => {
            const typeName = (job.linkTypeName || '').toLowerCase();
            if (typeName.includes('comment')) {
                return Array.isArray(job.comments) && job.comments.length > 0;
            }
            return true;
        });

        if (jobs.length === 0) {
            return res.status(404).json({ message: 'No Job found' });
        }

        // Sort jobs: first by isVip (true first), then by createdAt (newest first)
        const sortedJobs = jobs.sort((a, b) => {
            if (a.isVip === true && b.isVip !== true) return -1;
            if (a.isVip !== true && b.isVip === true) return 1;

            return b.createdAt - a.createdAt;
        });

        res.status(200).json(sortedJobs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// exports.mIncrementJobLikesCount = async (req, res) => {
//     try {
//         const updatedJob = await Job.findOneAndUpdate(
//             { jobId: req.body.jobId },
//             { $inc: { likeCount: 1 } },
//             { new: true, runValidators: true }
//         );

//         if (!updatedJob) return res.status(404).json({ message: 'Job not found' });
//         res.status(200).json(updatedJob);
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

exports.mIncrementJobLikesCount = async (req, res) => {
    try {
        const { jobId } = req.body;

        // First, increment the likeCount
        const updatedJob = await Job.findOneAndUpdate(
            { jobId: jobId },
            { $inc: { likeCount: 1 } },
            { new: true, runValidators: true }
        );

        if (!updatedJob) return res.status(404).json({ message: 'Job not found' });

        // Check if likeCount has reached or exceeded maxCount
        if (updatedJob.likeCount >= updatedJob.maxCount) {
            // Update isLive to false, status to Completed, and set finishDate
            await Job.findOneAndUpdate(
                { jobId: jobId },
                { $set: { isLive: false, status: "Completed", finishDate: new Date() } },
                { runValidators: true }
            );

            // Fetch the updated job to include the changes in the response
            const finalUpdatedJob = await Job.findOne({ jobId: jobId });
            return res.status(200).json(finalUpdatedJob);
        }

        // If likeCount hasn't reached maxCount, return the initially updated job
        res.status(200).json(updatedJob);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.mUpdateJobStatus = async (req, res) => {
    try {
        const { isLive } = req.body;
        const newStatus = isLive ? "Active" : "Off";

        const deletedJob = await Job.findOneAndUpdate(
            { jobId: req.params.jobId },
            { ...req.body, status: newStatus, isLive: isLive },
            { new: true, runValidators: true }
        );
        if (!deletedJob) return res.status(404).json({ message: 'Job not found' });
        res.status(200).json({ message: 'Job deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.mPing = async (req, res) => {
    try {
        const savedPing = await Ping.findOneAndUpdate(
            { uid: req.body.uid }, // Search criteria based on unique field
            { $set: req.body }, // Data to update or insert
            {
                upsert: true, // Create if doesn't exist
                new: true, // Return the updated/created document
                runValidators: true // Run model validations on update
            }
        );
        res.status(200).json(savedPing);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
