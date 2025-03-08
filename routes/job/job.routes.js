const express = require("express");
const router = express.Router({ mergeParams: true });
const JobsController = require("./job.controller");


router.post(
    '/',
    JobsController.CreateJob
)

router.get(
    '/',
    JobsController.GetJobs
)

router.get(
    '/latest',
    JobsController.GetLatestJobs
)

router.get(
    '/:platform',
    JobsController.GetJobsByPlatform
)

router.get(
    '/platform/length',
    JobsController.GetJobsLengthByPlatform
)

router.get(
    '/onlineUsers/length',
    JobsController.GetOnlineUsersLength
)

router.get(
    '/user/:id',
    JobsController.GetJobById
)

router.put(
    '/:id',
    JobsController.UpdateJob
)

router.delete(
    '/:id',
    JobsController.DeleteJob
)

router.delete(
    '/',
    JobsController.BulkDeleteJobs
)

router.get(
    '/search/search',
    JobsController.SearchJobs
)

router.get('/filter/filter', JobsController.FilterJobs);

router.get('/all-ids/all-ids', JobsController.GetFilteredJobIds);

router.get('/search/all-ids/all-ids', JobsController.GetSearchJobIds);

router.get('/filtered/all-ids/all-ids', JobsController.GetFilteredJobIds);

// Routes for mobile app
// add job
router.post(
    '/mobile/create',
    JobsController.mCreateJob
)
// get my jobs
router.get(
    '/mobile/jobs/:id',
    JobsController.mGetMyJobs
)

// update job status
router.post(
    '/mobile/updateStatus/:jobId',
    JobsController.mUpdateJobStatus
)

// delete job
router.delete(
    '/mobile/jobs/:jobId',
    JobsController.mDeleteJob
)

// get jobs to like
router.get(
    '/mobile/jobsToLike/:country/:uid',
    JobsController.mGetJobsToLike
)
// increment like count
router.post(
    '/mobile/incrementLikeCount',
    JobsController.mIncrementJobLikesCount
)

// ping
router.post(
    '/mobile/ping',
    JobsController.mPing
)


module.exports = router;