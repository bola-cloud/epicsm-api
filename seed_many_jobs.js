require('dotenv').config();
const mongoose = require('mongoose');
const JobV2 = require('./v2/models/JobV2');

mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true })
.then(async () => {
    try {
        const creatorId = "mejcpkcvJtfOuN4i1gjP5vEg5zz2";
        console.log(`Seeding 45 jobs for creatorId: ${creatorId} to test pagination`);

        const jobsToInsert = [];
        const platforms = ['facebook', 'instagram'];
        const fbTypes = ['post', 'page/profile', 'group'];
        const fbObjectives = {
            'post': ['Like', 'Love', 'Care', 'Haha', 'Comment', 'Share'],
            'page/profile': ['FollowAccount'],
            'group': ['JoinGroup']
        };
        const instaTypes = ['post', 'page/profile'];
        const instaObjectives = {
            'post': ['InstaLike', 'InstaComment'],
            'page/profile': ['InstaFollowAccount']
        };

        for (let i = 1; i <= 45; i++) {
            const isFb = Math.random() > 0.5;
            const platform = isFb ? 'facebook' : 'instagram';
            
            const types = isFb ? fbTypes : instaTypes;
            const type = types[Math.floor(Math.random() * types.length)];
            
            const objectives = isFb ? fbObjectives[type] : instaObjectives[type];
            const linkTypeName = objectives[Math.floor(Math.random() * objectives.length)];
            
            let actionType = 'like';
            if (linkTypeName.toLowerCase().includes('follow') || linkTypeName === 'JoinGroup') actionType = 'follow';
            if (linkTypeName.toLowerCase().includes('comment')) actionType = 'comment';
            if (linkTypeName.toLowerCase().includes('share')) actionType = 'share';

            const comments = actionType === 'comment' ? [`Comment ${i} A`, `Comment ${i} B`] : [];

            jobsToInsert.push({
                jobId: "PAGINATION_SEED_" + Date.now() + "_" + i,
                targetLink: `https://${platform}.com/test/${i}`,
                platform: platform,
                actionType: actionType,
                type: type,
                linkTypeName: linkTypeName,
                maxCount: Math.floor(Math.random() * 500) + 50,
                isVip: Math.random() > 0.8,
                creatorId: creatorId,
                status: "Active",
                resolutionStatus: "resolved",
                comments: comments
            });
        }

        // Insert jobs
        for(let jobData of jobsToInsert) {
            const job = new JobV2(jobData);
            await job.save();
        }

        console.log(`SUCCESS_SEED: Inserted ${jobsToInsert.length} jobs.`);

    } catch (err) {
        console.error(err);
    }
    process.exit(0);
});
