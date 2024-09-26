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


module.exports = router;