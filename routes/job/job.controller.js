const Job = require('../../models/job');
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

        const facebookJobs = await Job.find({ platform: 'Facebook' });
        const instagramJobs = await Job.find({ platform: 'Instagram' });

        res.status(200).json({
            facebook: facebookJobs.length,
            instagram: instagramJobs.length
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