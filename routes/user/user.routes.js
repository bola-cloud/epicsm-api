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


module.exports = router;