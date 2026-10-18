const express = require('express');
const router = express.Router({ mergeParams: true });
const MobileV2Controller = require('../controllers/mobile.controller');
const UserV2Controller = require('../controllers/userV2.controller');

// ==========================================
// V2 MOBILE API ROUTES (Isolated from V1)
// Mount path usually /api/v4/mobile_v2
// ==========================================

// --- Authentication & Profile Sync ---
// Called immediately after Google Sign-In in Mobile to register or sync user
router.post('/auth/google-sync', UserV2Controller.mGoogleAuthSync);

// Update FCM push token when refreshed
router.post('/fcm-token', UserV2Controller.mUpdateFcmToken);

// --- Profile & Rewards ---
// Get user profile and reward status (supports GET /profile?uid=... or GET /profile/:uid)
router.get('/profile', UserV2Controller.mGetProfile);
router.get('/profile/:uid', UserV2Controller.mGetProfile);

// Claim daily reward (immediate non-blocking 200 OK + delayed credit)
router.post('/rewards/claim', UserV2Controller.mClaimDailyReward);

// --- Jobs & Orders ---
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

