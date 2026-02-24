const { groupService } = require('../services');
const { asyncHandler } = require('../utils');

/**
 * @desc    Get all groups
 * @route   GET /api/admin/groups
 * @access  Admin
 */
const getGroups = asyncHandler(async (req, res) => {
  const result = await groupService.getAll(req.query);

  res.status(200).json({
    success: true,
    ...result
  });
});

/**
 * @desc    Get single group
 * @route   GET /api/admin/groups/:id
 * @access  Admin
 */
const getGroup = asyncHandler(async (req, res) => {
  const group = await groupService.getById(req.params.id);

  res.status(200).json({
    success: true,
    data: group
  });
});

/**
 * @desc    Create group
 * @route   POST /api/admin/groups
 * @access  Admin
 */
const createGroup = asyncHandler(async (req, res) => {
  const group = await groupService.create(req.body, req.admin._id);

  res.status(201).json({
    success: true,
    message: 'Group created successfully',
    data: group
  });
});

/**
 * @desc    Update group
 * @route   PUT /api/admin/groups/:id
 * @access  Admin
 */
const updateGroup = asyncHandler(async (req, res) => {
  const group = await groupService.update(req.params.id, req.body);

  res.status(200).json({
    success: true,
    message: 'Group updated successfully',
    data: group
  });
});

/**
 * @desc    Delete group
 * @route   DELETE /api/admin/groups/:id
 * @access  Admin
 */
const deleteGroup = asyncHandler(async (req, res) => {
  await groupService.delete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Group deleted successfully'
  });
});

/**
 * @desc    Add member to group
 * @route   POST /api/admin/groups/:id/members
 * @access  Admin
 */
const addMember = asyncHandler(async (req, res) => {
  const group = await groupService.addMember(req.params.id, req.body.userId);

  res.status(200).json({
    success: true,
    message: 'Member added successfully',
    data: group
  });
});

/**
 * @desc    Remove member from group
 * @route   DELETE /api/admin/groups/:id/members/:userId
 * @access  Admin
 */
const removeMember = asyncHandler(async (req, res) => {
  const group = await groupService.removeMember(req.params.id, req.params.userId);

  res.status(200).json({
    success: true,
    message: 'Member removed successfully',
    data: group
  });
});

module.exports = {
  getGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  addMember,
  removeMember
};