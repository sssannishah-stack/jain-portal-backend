const { userService } = require('../services');
const { asyncHandler } = require('../utils');

/**
 * @desc    Get all users
 * @route   GET /api/admin/users
 * @access  Admin
 */
const getUsers = asyncHandler(async (req, res) => {
  const result = await userService.getAll(req.query);

  res.status(200).json({
    success: true,
    ...result
  });
});

/**
 * @desc    Get single user
 * @route   GET /api/admin/users/:id
 * @access  Admin
 */
const getUser = asyncHandler(async (req, res) => {
  const user = await userService.getById(req.params.id);

  res.status(200).json({
    success: true,
    data: user
  });
});

/**
 * @desc    Create user
 * @route   POST /api/admin/users
 * @access  Admin
 */
const createUser = asyncHandler(async (req, res) => {
  // Get admin ID from request (set by auth middleware)
  const adminId = req.admin?._id || null;
  
  const user = await userService.create(req.body, adminId);

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: user
  });
});

/**
 * @desc    Update user
 * @route   PUT /api/admin/users/:id
 * @access  Admin
 */
const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.update(req.params.id, req.body);

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: user
  });
});

/**
 * @desc    Delete user
 * @route   DELETE /api/admin/users/:id
 * @access  Admin
 */
const deleteUser = asyncHandler(async (req, res) => {
  await userService.delete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'User deleted successfully'
  });
});

/**
 * @desc    Get user credentials
 * @route   GET /api/admin/users/:id/credentials
 * @access  Admin
 */
const getCredentials = asyncHandler(async (req, res) => {
  const credentials = await userService.getCredentials(req.params.id);

  res.status(200).json({
    success: true,
    data: credentials
  });
});

/**
 * @desc    Get users without group
 * @route   GET /api/admin/users/without-group
 * @access  Admin
 */
const getUsersWithoutGroup = asyncHandler(async (req, res) => {
  const users = await userService.getUsersWithoutGroup();

  res.status(200).json({
    success: true,
    data: users
  });
});

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getCredentials,
  getUsersWithoutGroup
};