const Job = require('../../models/job');
const Ping = require('../../models/ping');
const Blocked = require('../../models/blocked');
const authController = require('../authentication/authentication.controller')
const admin = require("firebase-admin");

let db = null;
try {
    db = admin.firestore();
} catch (e) {
    console.error("Firebase not initialized in job.controller");
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

        const newJob = new Job({
            ...req.body,
            comments,
            uid: isUser._id,
            country: "all"
        });
        const savedJob = await newJob.save();
        res.status(201).json(savedJob);
    } catch (error) {
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

        const totalCount = await Job.countDocuments();

        const jobs = await Job.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        if (!jobs) return res.status(404).json({ message: 'No Job found' });

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

        const jobs = await Job.find().sort({ createdAt: -1 }).limit(5);
        if (!jobs) return res.status(404).json({ message: 'No Job found' });
        res.status(200).json(jobs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.GetJobsByPlatform = async (req, res) => {
    try {
        const { platform } = req.params;
        const jobs = await Job.find({ platform }).sort({ createdAt: -1 });
        if (!jobs) return res.status(404).json({ message: 'No Job found' });
        res.status(200).json(jobs);
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

        const facebookJobsLength = await Job.countDocuments({ platform: 'Facebook' });
        const instagramJobsLength = await Job.countDocuments({ platform: 'Instagram' });


        res.status(200).json({
            facebook: facebookJobsLength,
            instagram: instagramJobsLength
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

        const onlineUsers = await Ping.countDocuments();

        res.status(200).json({
            onlineUsers: onlineUsers
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.GetJobById = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ message: 'Job not found' });
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

        const updatedJob = await Job.findByIdAndUpdate(
            req.params.id,
            { ...req.body, status: newStatus },
            { new: true, runValidators: true }
        );

        if (!updatedJob) {
            return res.status(404).json({ message: 'Job not found' });
        }

        res.status(201).json(updatedJob);
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

        const deletedJob = await Job.findByIdAndDelete(req.params.id);
        if (!deletedJob) return res.status(404).json({ message: 'Job not found' });
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

        const deleteResults = await Job.deleteMany({ _id: { $in: jobIds } });

        if (deleteResults.deletedCount === 0) {
            return res.status(404).json({ message: 'No jobs found to delete' });
        }

        res.json({
            message: 'Jobs deleted successfully',
            deletedCount: deleteResults.deletedCount
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

        const skipDocs = (page - 1) * limit;

        const searchCriteria = {
            $or: [
                { jobId: { $regex: searchQuery, $options: 'i' } },
                { platform: { $regex: searchQuery, $options: 'i' } },
                { status: { $regex: searchQuery, $options: 'i' } },
                { linkTypeName: { $regex: searchQuery, $options: 'i' } },
                { uid: { $regex: searchQuery, $options: 'i' } },
                { country: { $regex: searchQuery, $options: 'i' } },
                { type: { $regex: searchQuery, $options: 'i' } }
            ]
        };

        if (!isNaN(searchQuery)) {
            searchCriteria.$or.push(
                { likeCount: parseInt(searchQuery) },
                { maxCount: parseInt(searchQuery) }
            );
        }

        const dateQuery = new Date(searchQuery);
        if (!isNaN(dateQuery.getTime())) {
            const startOfDay = new Date(dateQuery.setHours(0, 0, 0, 0));
            const endOfDay = new Date(dateQuery.setHours(23, 59, 59, 999));

            searchCriteria.$or.push(
                {
                    datePublished: {
                        $gte: startOfDay,
                        $lte: endOfDay
                    }
                },
                {
                    createdAt: {
                        $gte: startOfDay,
                        $lte: endOfDay
                    }
                }
            );
        }

        const jobs = await Job.find(searchCriteria)
            .sort({ createdAt: -1 })
            .skip(skipDocs)
            .limit(limit);

        const total = await Job.countDocuments(searchCriteria);

        const totalPages = Math.ceil(total / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        return res.status(200).json({
            success: true,
            jobs,
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

        const jobs = await Job.find(filterCriteria)
            .sort({ createdAt: -1 })
            .skip(skipDocs)
            .limit(limit);

        const total = await Job.countDocuments(filterCriteria);

        const totalPages = Math.ceil(total / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        return res.status(200).json({
            success: true,
            jobs,
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
            message: 'Server error during filtering',
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

        // Get the user from Firestore to check VIP status
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userData = userDoc.data();

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
        const jobs = await Job.find({ uid: req.params.id, status: { $ne: 'Deleted' } }).sort({ createdAt: -1 });
        if (!jobs) return res.status(404).json({ message: 'No Job found' });
        res.status(200).json(jobs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.mDeleteJob = async (req, res) => {
    try {
        const deletedJob = await Job.findOneAndUpdate(
            { jobId: req.params.jobId },
            { ...req.body, status: "Deleted", isLive: false },
            { new: true, runValidators: true }
        );
        if (!deletedJob) return res.status(404).json({ message: 'Job not found' });
        res.status(200).json({ message: 'Job deleted successfully' });
    } catch (error) {
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
            // Update isLive to false
            await Job.findOneAndUpdate(
                { jobId: jobId },
                { $set: { isLive: false } },
                { runValidators: true }
            );

            // Fetch the updated job to include the isLive change in the response
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
