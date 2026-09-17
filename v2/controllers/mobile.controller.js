const JobV2 = require('../models/JobV2');
const JobActionV2 = require('../models/JobActionV2');
const Blocked = require('../../models/blocked');
const { createNewJobV2 } = require('../index');
const admin = require("firebase-admin");

let db = null;
try {
    db = admin.firestore();
} catch (e) {
    console.error("Firebase not initialized in mobile.controller v2");
}

exports.mCreateJobV2 = async (req, res) => {
    try {
        const { uid } = req.body;

        if (!uid) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        // Check if user is in blockedAP
        const blockedData = await Blocked.findOne();
        if (blockedData && blockedData.blockedAP && blockedData.blockedAP.includes(uid)) {
            return res.status(200).json({});
        }

        // Get the user from Firestore to check VIP status (Bypass for E2E Testing)
        let isVipUser = false;
        if (uid === 'TEST_E2E') {
            isVipUser = true;
        } else {
            const userRef = db.collection('users').doc(uid);
            const userDoc = await userRef.get();

            if (!userDoc.exists) {
                return res.status(404).json({ message: 'User not found' });
            }
            isVipUser = userDoc.data().isVip;
        }

        const comments = Array.isArray(req.body.comments)
            ? req.body.comments.filter(comment => typeof comment === 'string' && comment.trim().length > 0)
            : [];

        const jobData = {
            ...req.body,
            comments,
            creatorId: uid, // Track who created it from mobile
        };

        // Map legacy Flutter mobile fields to V2 Schema fields
        if (req.body.link && !jobData.targetLink) {
            jobData.targetLink = req.body.link;
        }
        
        // Map platform to lowercase
        if (jobData.platform) {
            jobData.platform = jobData.platform.toLowerCase();
        }

        // Map linkTypeName or type to actionType
        const legacyType = (req.body.linkTypeName || req.body.type || '').toLowerCase();
        if (legacyType.includes('follow') || legacyType.includes('friend')) {
            jobData.actionType = 'follow';
        } else if (legacyType.includes('comment')) {
            jobData.actionType = 'comment';
        } else if (legacyType.includes('view')) {
            jobData.actionType = 'view';
        } else if (legacyType.includes('share')) {
            jobData.actionType = 'share';
        } else {
            jobData.actionType = 'like'; // Default to like for (Like, Love, Care, Haha, InstaLike, etc)
        }

        if (isVipUser) {
            jobData.isVip = true;
        }

        // ==========================================
        // V2 ID EXTRACTION LOGIC
        // ==========================================
        try {
            const IDExtractor = require('../core/IDExtractor');
            const User = require('../../models/user');
            const { _ExtractionAccount } = require('../controllers/admin.controller');
            
            const platform = (jobData.platform || '').toLowerCase();
            const link = jobData.targetLink || jobData.link;

            if (platform === 'facebook' && link) {
                // If mediaId already provided (Instagram like shortcode decode), skip
                // For Facebook we always need cookies - use the admin-selected extraction account first
                let cookies = null;
                
                const extractionAccount = await _ExtractionAccount.findOne({ platform: 'facebook' });
                if (extractionAccount && extractionAccount.userId) {
                    const extractorUser = await User.findById(extractionAccount.userId);
                    if (extractorUser && extractorUser.facebookCookies) {
                        cookies = extractorUser.facebookCookies;
                        console.log(`[V2 Mobile API] Using extraction account (${extractorUser.email}) for Facebook ID resolution`);
                    }
                }
                
                // Fallback to job creator's own cookies
                if (!cookies && uid !== 'TEST_E2E') {
                    const mongoUser = await User.findById(uid);
                    if (mongoUser && mongoUser.facebookCookies) {
                        cookies = mongoUser.facebookCookies;
                    }
                }
                
                const extracted = await IDExtractor.extractFacebookTarget(link, cookies);
                if (extracted && extracted.target_id) {
                    jobData.target_id = extracted.target_id;
                }

            } else if (platform === 'instagram' && link) {
                // If mediaId already sent by mobile (decoded from shortcode), skip extraction
                if (jobData.mediaId) {
                    console.log(`[V2 Mobile API] mediaId already provided by mobile (${jobData.mediaId}), skipping extraction`);
                } else {
                    // Need to extract: for 'follow' we need userPk (requires cookies)
                    let cookies = null;
                    
                    const extractionAccount = await _ExtractionAccount.findOne({ platform: 'instagram' });
                    if (extractionAccount && extractionAccount.userId) {
                        const extractorUser = await User.findById(extractionAccount.userId);
                        if (extractorUser && extractorUser.instagramCookies) {
                            cookies = extractorUser.instagramCookies;
                            console.log(`[V2 Mobile API] Using extraction account (${extractorUser.email}) for Instagram ID resolution`);
                        }
                    }
                    
                    // Fallback to job creator's own cookies
                    if (!cookies && uid !== 'TEST_E2E') {
                        const mongoUser = await User.findById(uid);
                        if (mongoUser && mongoUser.instagramCookies) {
                            cookies = mongoUser.instagramCookies;
                        }
                    }
                    
                    const extracted = await IDExtractor.extractInstagramTarget(link, cookies);
                    if (extracted) {
                        jobData.mediaId = extracted.mediaId;
                        jobData.userPk = extracted.userPk;
                    }
                }
            }
        } catch (extractError) {
            console.error('[V2 Mobile API] ID Extraction failed, proceeding with raw link:', extractError.message);
        }

        // Use the exposed function to create and push to queue
        const savedJob = await createNewJobV2(jobData);

        res.status(201).json(savedJob);
    } catch (error) {
        console.error('[V2 Mobile API] Error creating job:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.mGetMyJobsV2 = async (req, res) => {
    try {
        const { id } = req.params; // This is the uid
        const { platform, page, limit } = req.query; // Pagination and filtering

        // Build the query
        const query = { creatorId: id, status: { $ne: 'Deleted' } };
        
        if (platform && platform.toLowerCase() !== 'all') {
            query.platform = platform.toLowerCase();
        }

        // Pagination setup (defaults to page 1, limit 20)
        const pageNumber = parseInt(page) || 1;
        const pageSize = parseInt(limit) || 20;
        const skip = (pageNumber - 1) * pageSize;

        // Get total count for pagination metadata
        const totalJobs = await JobV2.countDocuments(query);
        const totalPages = Math.ceil(totalJobs / pageSize) || 1;

        // Find jobs created by this user with pagination
        const jobs = await JobV2.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageSize);

        // Map V2 schema to V1 schema shape for mobile compatibility
        const mappedJobs = jobs.map(job => {
            const j = job.toObject();
            
            // Generate valid fallback for linkTypeName if not explicitly set
            let linkTypeName = j.linkTypeName;
            if (!linkTypeName) {
                if (j.actionType === 'follow') linkTypeName = 'FollowAccount';
                else if (j.actionType === 'view') linkTypeName = 'View';
                else if (j.actionType === 'share') linkTypeName = 'Share';
                else if (j.actionType === 'comment') linkTypeName = 'Comment';
                else linkTypeName = 'Like';
            }

            // ENFORCE strict types for the mobile app (mobile only supports these)
            const validTypes = ['post', 'page/profile', 'profile', 'group'];
            let mappedType = j.type;
            
            // If the type in DB is invalid (like 'comment', 'like', 'follow', etc.), force it to a valid one
            if (!validTypes.includes(mappedType)) {
                if (linkTypeName === 'FollowAccount' || linkTypeName === 'InstaFollowAccount') {
                    mappedType = 'page/profile';
                } else if (linkTypeName === 'JoinGroup') {
                    mappedType = 'group';
                } else {
                    mappedType = 'post';
                }
            }

            return {
                ...j,
                link: j.targetLink,
                type: mappedType,
                linkTypeName: linkTypeName,
                uid: j.creatorId,
                datePublished: j.createdAt,
                isLive: j.status === 'Active'
            };
        });

        // Return the paginated response object
        res.status(200).json({
            currentPage: pageNumber,
            totalPages: totalPages,
            totalJobs: totalJobs,
            data: mappedJobs
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.mUpdateJobStatusV2 = async (req, res) => {
    try {
        const { isLive } = req.body;
        const newStatus = isLive ? "Active" : "Paused"; // Using Paused in V2 instead of Off

        const updatedJob = await JobV2.findOneAndUpdate(
            { jobId: req.params.jobId },
            { status: newStatus },
            { new: true, runValidators: true }
        );
        if (!updatedJob) return res.status(404).json({ message: 'Job not found' });
        res.status(200).json({ message: 'Job status updated successfully', job: updatedJob });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.mDeleteJobV2 = async (req, res) => {
    try {
        // Soft delete the job by marking it Cancelled or Deleted
        const deletedJob = await JobV2.findOneAndUpdate(
            { jobId: req.params.jobId },
            { status: "Cancelled" }, // V2 uses Cancelled for deleted jobs to keep records
            { new: true, runValidators: true }
        );
        
        if (!deletedJob) return res.status(404).json({ message: 'Job not found' });

        // Cleanup pending actions to free up users
        await JobActionV2.deleteMany({ jobId: req.params.jobId, status: 'pending' });

        res.status(200).json({ message: 'Job deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.mUpdateCookies = async (req, res) => {
    try {
        const { platform } = req.params; // 'facebook' or 'instagram'
        const { uid, cookies } = req.body;

        if (!uid || !cookies) {
            return res.status(400).json({ message: 'UID and cookies are required' });
        }

        if (platform !== 'facebook' && platform !== 'instagram') {
            return res.status(400).json({ message: 'Invalid platform. Must be facebook or instagram' });
        }

        const updateField = platform === 'facebook' ? 'facebookCookies' : 'instagramCookies';
        
        const User = require('../../models/user');
        
        const updateData = {};
        updateData[updateField] = cookies;
        
        const setOnInsertData = {};

        // Try to find if user exists first to avoid overwriting their real email
        const existingUser = await User.findOne({ uid: uid });
        
        if (!existingUser) {
            // User doesn't exist in MongoDB yet, try to get from Firebase Firestore
            try {
                if (db) {
                    const userDoc = await db.collection('users').doc(uid).get();
                    if (userDoc.exists) {
                        const data = userDoc.data();
                        setOnInsertData['email'] = data.email || `${uid}@mobile.worker`;
                        setOnInsertData['nom'] = data.nom || '';
                        setOnInsertData['prenom'] = data.prenom || '';
                    } else {
                        setOnInsertData['email'] = `${uid}@mobile.worker`;
                    }
                } else {
                    setOnInsertData['email'] = `${uid}@mobile.worker`;
                }
            } catch (fbError) {
                setOnInsertData['email'] = `${uid}@mobile.worker`;
            }
        }

        const updatedUser = await User.findOneAndUpdate(
            { uid: uid },
            { 
                $set: updateData,
                ...(Object.keys(setOnInsertData).length > 0 && { $setOnInsert: setOnInsertData })
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        // Auto-retry fallback jobs that failed due to cookie issues
        const JobV2 = require('../models/JobV2');
        await JobV2.updateMany(
            { platform: platform.toLowerCase(), resolutionStatus: 'fallback' },
            { $set: { resolutionStatus: 'pending', isLive: false } }
        );

        res.status(200).json({ message: `${platform} cookies updated successfully. Retrying any failed jobs.` });
    } catch (error) {
        console.error('[V2 Mobile API] Error updating cookies:', error);
        res.status(500).json({ message: error.message });
    }
};
