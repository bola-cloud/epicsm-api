const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');

// Since this is for the Admin Dashboard, in production you should add Admin Authentication middleware here.
// e.g. router.use(AdminAuthMiddleware);

router.post('/jobs', adminController.createJob);
router.get('/jobs', adminController.getJobs);
router.get('/jobs/:id', adminController.getJobById);
router.put('/jobs/:id/status', adminController.updateJobStatus);
router.delete('/jobs/:id', adminController.deleteJob);
router.post('/jobs/bulk-delete', adminController.bulkDeleteJobs);
router.post('/jobs/pause-all', adminController.pauseAllJobs);

router.post('/cookies', adminController.saveCookies);
router.get('/cookies', adminController.getCookiesStatus);

// Extraction Account: select which user's cookies to use for ID resolution
router.get('/users-with-cookies', adminController.getUsersWithCookies);
router.get('/extraction-account', adminController.getExtractionAccount);
router.post('/extraction-account', adminController.setExtractionAccount);

module.exports = router;
