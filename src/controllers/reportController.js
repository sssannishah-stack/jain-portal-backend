const { reportService } = require('../services');
const { asyncHandler } = require('../utils');

/**
 * @desc    Get admin dashboard stats
 * @route   GET /api/admin/dashboard/stats
 * @access  Admin
 */
const getAdminDashboard = asyncHandler(async (req, res) => {
  const stats = await reportService.getAdminDashboard();

  res.status(200).json({
    success: true,
    data: stats
  });
});

/**
 * @desc    Get user dashboard stats
 * @route   GET /api/user/dashboard
 * @access  User
 */
const getUserDashboard = asyncHandler(async (req, res) => {
  const familyMemberIds = req.familyMembers || [req.user._id];
  const stats = await reportService.getUserDashboard(req.user._id, familyMemberIds);

  res.status(200).json({
    success: true,
    data: stats
  });
});

/**
 * @desc    Get student-wise report
 * @route   GET /api/admin/reports/students
 * @access  Admin
 */
const getStudentReport = asyncHandler(async (req, res) => {
  const result = await reportService.getStudentReport(req.query);

  res.status(200).json({
    success: true,
    ...result
  });
});

/**
 * @desc    Get group-wise report
 * @route   GET /api/admin/reports/groups
 * @access  Admin
 */
const getGroupReport = asyncHandler(async (req, res) => {
  const result = await reportService.getGroupReport(req.query);

  res.status(200).json({
    success: true,
    ...result
  });
});

/**
 * @desc    Get single student detailed report
 * @route   GET /api/admin/reports/student/:id
 * @access  Admin
 */
const getStudentDetailReport = asyncHandler(async (req, res) => {
  const result = await reportService.getStudentDetailReport(req.params.id, req.query);

  res.status(200).json({
    success: true,
    data: result
  });
});

/**
 * @desc    Get single group detailed report
 * @route   GET /api/admin/reports/group/:id
 * @access  Admin
 */
const getGroupDetailReport = asyncHandler(async (req, res) => {
  const result = await reportService.getGroupDetailReport(req.params.id, req.query);

  res.status(200).json({
    success: true,
    data: result
  });
});

/**
 * @desc    Get top performers
 * @route   GET /api/admin/dashboard/top-performers
 * @access  Admin
 */
const getTopPerformers = asyncHandler(async (req, res) => {
  const result = await reportService.getTopPerformers(req.query);

  res.status(200).json({
    success: true,
    data: result
  });
});

/**
 * @desc    Get user report (own)
 * @route   GET /api/user/report
 * @access  User
 */
const getUserReport = asyncHandler(async (req, res) => {
  const result = await reportService.getStudentDetailReport(req.user._id, req.query);

  res.status(200).json({
    success: true,
    data: result
  });
});

/**
 * @desc    Get family report
 * @route   GET /api/user/family-report
 * @access  User
 */
const getFamilyReport = asyncHandler(async (req, res) => {
  if (!req.familyGroupId) {
    return res.status(200).json({
      success: true,
      data: null,
      message: 'User is not in a family group'
    });
  }

  const result = await reportService.getGroupDetailReport(req.familyGroupId, req.query);

  res.status(200).json({
    success: true,
    data: result
  });
});

module.exports = {
  getAdminDashboard,
  getUserDashboard,
  getStudentReport,
  getGroupReport,
  getStudentDetailReport,
  getGroupDetailReport,
  getTopPerformers,
  getUserReport,
  getFamilyReport
};