const Job = require('../../models/job');
const Ping = require('../../models/ping');
const Blocked = require('../../models/blocked');
const authController = require('../authentication/authentication.controller')



exports.CreateJob = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);

        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const newJob = new Job({
            ...req.body,
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

        const jobs = await Job.find().sort({ createdAt: -1 });
        if (!jobs) return res.status(404).json({ message: 'No Job found' });
        res.status(200).json(jobs);
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

// Mobile API

exports.mCreateJob = async (req, res) => {
    try {
        const { uid } = req.params;

        if (!uid) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        // Check if user is in blockedAP
        const blockedData = await Blocked.findOne();
        if (blockedData && blockedData.blockedAP.includes(uid)) {
            // Return empty response for blocked users
            return res.status(200).json({});
        }

        const newJob = new Job(req.body);
        const savedJob = await newJob.save();
        res.status(201).json(savedJob);
    } catch (error) {
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

        const jobs = await Job.find({
            status: "Active", isLive: true, $or: [
                { country: req.params.country },
                { country: "all" }
            ], $expr: { $lt: ["$likeCount", "$maxCount"] }
        }).sort({ createdAt: -1 });
        if (!jobs) return res.status(404).json({ message: 'No Job found' });
        res.status(200).json(jobs);
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