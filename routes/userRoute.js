const express = require('express')
const router = express.Router();
const userController = require('../controllers/user/authController')

router.route('/user')
        .post(userController.fetchUser)


module.exports=router