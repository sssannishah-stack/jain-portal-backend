const { attendanceService } = require('../services');
const { asyncHandler } = require('../utils');

/**
 * @desc    Mark attendance (User)
 * @route   POST /api/user/attendance
 * @access  User
 */
const markAttendance = asyncHandler(async (req, res) => {
  const familyMemberIds = req.familyMembers || [];
  const result = await attendanceService.mark(
    req.body,
    req.user._id,
    familyMemberIds.map(id => id.toString())
  );

  res.status(201).json({
    success: true,
    message: 'Attendance marked successfully',
    data: result.results,
    errors: result.errors
  });
});

/**
 * @desc    Get own attendance (User)
 * @route   GET /api/user/attendance
 * @access  User
 */
const getOwnAttendance = asyncHandler(async (req, res) => {
  const result = await attendanceService.getOwn(req.user._id, req.query);

  res.status(200).json({
    success: true,
    ...result
  });
});

/**
 * @desc    Get family attendance (User)
 * @route   GET /api/user/attendance/family
 * @access  User
 */
const getFamilyAttendance = asyncHandler(async (req, res) => {
  const familyMemberIds = req.familyMembers || [req.user._id];
  const result = await attendanceService.getFamily(familyMemberIds, req.query);

  res.status(200).json({
    success: true,
    ...result
  });
});

/**
 * @desc    Get pending attendance (Admin)
 * @route   GET /api/admin/attendance/pending
 * @access  Admin
 */
const getPendingAttendance = asyncHandler(async (req, res) => {
  const result = await attendanceService.getPending(req.query);

  res.status(200).json({
    success: true,
    ...result
  });
});

/**
 * @desc    Approve attendance (Admin)
 * @route   PUT /api/admin/attendance/:id/approve
 * @access  Admin
 */
const approveAttendance = asyncHandler(async (req, res) => {
  const attendance = await attendanceService.approve(req.params.id, req.admin._id);

  res.status(200).json({
    success: true,
    message: 'Attendance approved',
    data: attendance
  });
});

/**
 * @desc    Reject attendance (Admin)
 * @route   PUT /api/admin/attendance/:id/reject
 * @access  Admin
 */
const rejectAttendance = asyncHandler(async (req, res) => {
  const attendance = await attendanceService.reject(
    req.params.id,
    req.admin._id,
    req.body.remarks
  );

  res.status(200).json({
    success: true,
    message: 'Attendance rejected',
    data: attendance
  });
});

/**
 * @desc    Bulk approve attendance (Admin)
 * @route   POST /api/admin/attendance/bulk-approve
 * @access  Admin
 */
const bulkApproveAttendance = asyncHandler(async (req, res) => {
  const result = await attendanceService.bulkApprove(req.body.ids, req.admin._id);

  res.status(200).json({
    success: true,
    message: `${result.modifiedCount} attendance records approved`,
    ...result
  });
});

/**
 * @desc    Add attendance for user (Admin)
 * @route   POST /api/admin/attendance/add-for-user
 * @access  Admin
 */
const addAttendanceForUser = asyncHandler(async (req, res) => {
  const attendance = await attendanceService.addForUser(req.body, req.admin._id);

  res.status(201).json({
    success: true,
    message: 'Attendance added successfully',
    data: attendance
  });
});

module.exports = {
  markAttendance,
  getOwnAttendance,
  getFamilyAttendance,
  getPendingAttendance,
  approveAttendance,
  rejectAttendance,
  bulkApproveAttendance,
  addAttendanceForUser
};