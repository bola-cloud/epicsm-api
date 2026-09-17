require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/user');
const JobV2 = require('./v2/models/JobV2');

mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true })
.then(async () => {
    try {
        // Find user with cookies
        const user = await User.findOne({ 
            $or: [
                { facebookCookies: { $exists: true, $ne: '' } },
                { instagramCookies: { $exists: true, $ne: '' } }
            ]
        });

        if (!user) {
            console.log("No user found with cookies.");
            process.exit(1);
        }

        const uid = user._id.toString();
        const creatorId = user.uid || uid;

        console.log(`Found user! Seeding jobs for creatorId: ${creatorId}`);

        const dummyJobs = [
            {
                jobId: "SEED_" + Date.now() + "_1",
                targetLink: "https://m.facebook.com/watch/?v=123456789",
                platform: "facebook",
                actionType: "like",
                type: "post",
                linkTypeName: "Like",
                maxCount: 150,
                isVip: false,
                creatorId: creatorId,
                status: "Active",
                resolutionStatus: "resolved"
            },
            {
                jobId: "SEED_" + Date.now() + "_2",
                targetLink: "https://m.facebook.com/zuck",
                platform: "facebook",
                actionType: "follow",
                type: "page/profile",
                linkTypeName: "FollowAccount",
                maxCount: 200,
                isVip: true,
                creatorId: creatorId,
                status: "Active",
                resolutionStatus: "resolved"
            },
            {
                jobId: "SEED_" + Date.now() + "_3",
                targetLink: "https://m.facebook.com/photo/?fbid=987654321",
                platform: "facebook",
                actionType: "comment",
                type: "post",
                linkTypeName: "Comment",
                maxCount: 50,
                isVip: false,
                creatorId: creatorId,
                comments: ["Wow, so cool!", "Awesome picture!"],
                status: "Active",
                resolutionStatus: "resolved"
            },
            {
                jobId: "SEED_" + Date.now() + "_4",
                targetLink: "https://www.instagram.com/p/C1234567/",
                platform: "instagram",
                actionType: "like",
                type: "post",
                linkTypeName: "InstaLike",
                maxCount: 300,
                isVip: false,
                creatorId: creatorId,
                status: "Active",
                resolutionStatus: "resolved"
            }
        ];

        // Insert jobs
        for(let jobData of dummyJobs) {
            const job = new JobV2(jobData);
            await job.save();
        }

        console.log("SUCCESS_SEED: " + creatorId);

    } catch (err) {
        console.error(err);
    }
    process.exit(0);
});
