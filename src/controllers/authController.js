const { authService } = require('../services');
const { asyncHandler } = require('../utils');

/**
 * @desc    Admin Login
 * @route   POST /api/auth/admin/login
 * @access  Public
 */
const adminLogin = asyncHandler(async (req, res) => {
  const { name, password } = req.body;
  const result = await authService.adminLogin(name, password);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    ...result
  });
});

/**
 * @desc    User Login
 * @route   POST /api/auth/user/login
 * @access  Public
 */
const userLogin = asyncHandler(async (req, res) => {
  const { name, password } = req.body;
  const result = await authService.userLogin(name, password);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    ...result
  });
});

/**
 * @desc    Verify Token
 * @route   GET /api/auth/verify-token
 * @access  Private
 */
const verifyToken = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Token is valid',
    userType: req.userType,
    data: req.admin || req.user
  });
});

/**
 * @desc    Logout
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = {
  adminLogin,
  userLogin,
  verifyToken,
  logout
};