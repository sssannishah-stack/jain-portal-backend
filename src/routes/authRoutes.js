const express = require('express');
const router = express.Router();
const { authController } = require('../controllers');
const { protect, validate } = require('../middleware');
const { adminLoginValidator, userLoginValidator } = require('../validators');

// Admin login
router.post('/admin/login', adminLoginValidator, validate, authController.adminLogin);

// User login
router.post('/user/login', userLoginValidator, validate, authController.userLogin);

// Verify token
router.get('/verify-token', protect, authController.verifyToken);

// Logout
router.post('/logout', protect, authController.logout);

module.exports = router;