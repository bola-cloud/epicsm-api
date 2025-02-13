const express = require("express")
const router = express.Router({ mergeParams: true })
const logger = require("../logging/logger")


router.use((req, res, next) => {
  logger.debug("Logging request headers :");
  logger.debug(req.headers);

  next();
});

// -------------------------------------------------------
// Unprotected routes
// -------------------------------------------------------
router.use('/', require("./authentication/authentication.routes"));
router.use('/users', require("./user/user.routes"));
router.use('/accounts', require("./socialmedia/socialmedia.routes"));
router.use('/jobs', require("./job/job.routes"));
router.use('/stats', require("./statistique/statistique.routes"));
router.use('/settings', require("./settings/settings.routes"));
router.use('/blocked', require("./blocked/blocked.routes"));

// -------------------------------------------------------
// Protected routes
// -------------------------------------------------------




module.exports = router;

