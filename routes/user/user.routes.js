const express = require("express");
const router = express.Router({ mergeParams: true });
const usersController = require("./user.controller");


router.post(
    '/',
    usersController.CreateUser
)

router.get(
    '/',
    usersController.GetUsers
)

router.get(
    '/firestore',
    usersController.GetFirebaseUsers
)

router.get('/firestore/search', usersController.SearchFirebaseUsers);

router.get(
    '/firestore/lastSignIn',
    usersController.GetUsersByLastSignIn
)

router.get(
    '/firestore/length',
    usersController.GetFirebaseUsersLength
)

router.get(
    '/firestore/:id',
    usersController.GetFirebaseUserById
)

router.get(
    '/:id',
    usersController.GetUserByID
)

router.put(
    '/:id',
    usersController.UpdateUser
)

router.delete(
    '/:id',
    usersController.DeleteUser
)

router.delete(
    '/firestore/:id',
    usersController.DeleteFirebaseUser
)

// Ban (disable) a user
router.put('/firestore/ban/:id', usersController.BanUser);

// Unban (re-enable) a user
router.put('/firestore/unban/:id', usersController.UnbanUser);


router.put('/firestore/addbalance/:id', usersController.AddBalanceToUser);

router.put('/firestore/updateReward/:id', usersController.UpdateDailyReward);

router.get('/users/export', usersController.ExportFirebaseUsersCSV);



module.exports = router;