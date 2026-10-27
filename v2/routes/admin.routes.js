const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const adminUserController = require('../controllers/adminUser.controller');
const migrationController = require('../controllers/migration.controller');

// Since this is for the Admin Dashboard, in production you should add Admin Authentication middleware here.
// e.g. router.use(AdminAuthMiddleware);

// --- Jobs Management ---
router.post('/jobs', adminController.createJob);
router.get('/jobs', adminController.getJobs);
router.get('/jobs/:id', adminController.getJobById);
router.put('/jobs/:id/status', adminController.updateJobStatus);
router.delete('/jobs/:id', adminController.deleteJob);
router.post('/jobs/bulk-delete', adminController.bulkDeleteJobs);
router.post('/jobs/pause-all', adminController.pauseAllJobs);

// --- Cookies & Extraction ---
router.post('/cookies', adminController.saveCookies);
router.get('/cookies', adminController.getCookiesStatus);
router.get('/cookies-health', adminController.getCookiesHealth);
router.get('/users-with-cookies', adminController.getUsersWithCookies);
router.get('/extraction-account', adminController.getExtractionAccount);
router.post('/extraction-account', adminController.setExtractionAccount);

// --- V2 Users Management (MongoDB) ---
router.get('/users', adminUserController.getUsers);
router.get('/users/:id', adminUserController.getUserById);
router.put('/users/:id/ban', adminUserController.updateBanStatus);
router.put('/users/:id/balance', adminUserController.updateBalance);
router.put('/users/:id/daily-reward', adminUserController.updateDailyReward);
router.put('/users/:id/vip', adminUserController.updateVipStatus);

// --- Pending Rewards Queue ---
router.get('/rewards/pending', adminUserController.getPendingRewards);

// --- Firebase to MongoDB Migration ---
router.post('/migrate-users', migrationController.migrateAllUsers);
router.post('/sync-user/:uid', migrationController.syncSingleUser);

module.exports = router;

