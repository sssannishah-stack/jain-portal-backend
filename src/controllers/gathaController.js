// src/controllers/gathaController.js

const { gathaService } = require('../services');
const { asyncHandler } = require('../utils');

/**
 * @desc    Add/Submit Gatha (User)
 * @route   POST /api/user/gatha
 * @access  User
 */
const addGatha = asyncHandler(async (req, res) => {
  const familyMemberIds = req.familyMembers || [];
  const result = await gathaService.add(
    req.body,
    req.user._id,
    familyMemberIds.map(id => id.toString())
  );

  res.status(201).json({
    success: true,
    message: 'Gatha submitted successfully',
    data: result.results,
    errors: result.errors
  });
});

/**
 * @desc    Get own Gatha records (User)
 * @route   GET /api/user/gatha
 * @access  User
 */
const getOwnGatha = asyncHandler(async (req, res) => {
  const result = await gathaService.getOwn(req.user._id, req.query);

  res.status(200).json({
    success: true,
    ...result
  });
});

/**
 * @desc    Get family Gatha records (User)
 * @route   GET /api/user/gatha/family
 * @access  User
 */
const getFamilyGatha = asyncHandler(async (req, res) => {
  const familyMemberIds = req.familyMembers || [req.user._id];
  const result = await gathaService.getFamily(familyMemberIds, req.query);

  res.status(200).json({
    success: true,
    ...result
  });
});

/**
 * @desc    Get pending Gatha submissions (Admin)
 * @route   GET /api/admin/gatha/pending
 * @access  Admin
 */
const getPendingGatha = asyncHandler(async (req, res) => {
  const result = await gathaService.getPending(req.query);

  res.status(200).json({
    success: true,
    ...result
  });
});

/**
 * @desc    Approve Gatha (Admin)
 * @route   PUT /api/admin/gatha/:id/approve
 * @access  Admin
 */
const approveGatha = asyncHandler(async (req, res) => {
  const gatha = await gathaService.approve(req.params.id, req.admin._id);

  res.status(200).json({
    success: true,
    message: 'Gatha approved successfully',
    data: gatha
  });
});

/**
 * @desc    Reject Gatha (Admin)
 * @route   PUT /api/admin/gatha/:id/reject
 * @access  Admin
 */
const rejectGatha = asyncHandler(async (req, res) => {
  const gatha = await gathaService.reject(
    req.params.id,
    req.admin._id,
    req.body.remarks
  );

  res.status(200).json({
    success: true,
    message: 'Gatha rejected',
    data: gatha
  });
});

/**
 * @desc    Bulk approve Gatha (Admin)
 * @route   POST /api/admin/gatha/bulk-approve
 * @access  Admin
 */
const bulkApproveGatha = asyncHandler(async (req, res) => {
  const result = await gathaService.bulkApprove(req.body.ids, req.admin._id);

  res.status(200).json({
    success: true,
    message: `${result.modifiedCount} gatha records approved`,
    ...result
  });
});

/**
 * @desc    Add Gatha for user (Admin)
 * @route   POST /api/admin/gatha/add-for-user
 * @access  Admin
 */
const addGathaForUser = asyncHandler(async (req, res) => {
  const gatha = await gathaService.addForUser(req.body, req.admin._id);

  res.status(201).json({
    success: true,
    message: 'Gatha added for user successfully',
    data: gatha
  });
});

// ✅ EXPORT ALL FUNCTIONS
module.exports = {
  addGatha,
  getOwnGatha,
  getFamilyGatha,
  getPendingGatha,
  approveGatha,
  rejectGatha,
  bulkApproveGatha,
  addGathaForUser
};