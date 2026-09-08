const express = require('express');
const router = express.Router({ mergeParams: true });
const MobileV2Controller = require('../controllers/mobile.controller');

// ==========================================
// V2 MOBILE API ROUTES (Isolated from V1)
// Mount path usually /api/v5/mobile
// ==========================================

// Create a new V2 Job (e.g., from Mobile app)
router.post('/create', MobileV2Controller.mCreateJobV2);

// Get all jobs created by this specific mobile user
router.get('/jobs/:id', MobileV2Controller.mGetMyJobsV2);

// Update status of a job (Pause / Active)
router.post('/updateStatus/:jobId', MobileV2Controller.mUpdateJobStatusV2);

// Delete (Cancel) a job
router.delete('/jobs/:jobId', MobileV2Controller.mDeleteJobV2);

// Note: GetJobsToLike and IncrementLikes are completely REMOVED in V2
// because the mobile app now uses Socket.io to receive jobs and confirm actions.

// Cookie Management (Mobile sends Facebook/Instagram session cookies)
router.post('/cookies/:platform', MobileV2Controller.mUpdateCookies);

module.exports = router;
