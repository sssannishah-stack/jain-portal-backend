const { attendanceService, gathaService } = require('../services');
const { asyncHandler } = require('../utils');

/**
 * @desc    Get all pending approvals
 * @route   GET /api/admin/pending-approvals
 * @access  Admin
 */
const getPendingApprovals = asyncHandler(async (req, res) => {
  const { type } = req.query;

  let attendance = { data: [], total: 0 };
  let gatha = { data: [], total: 0 };

  if (!type || type === 'attendance' || type === 'all') {
    attendance = await attendanceService.getPending(req.query);
  }

  if (!type || type === 'gatha' || type === 'all') {
    gatha = await gathaService.getPending(req.query);
  }

  res.status(200).json({
    success: true,
    data: {
      attendance: attendance.data,
      gatha: gatha.data
    },
    total: {
      attendance: attendance.total,
      gatha: gatha.total,
      all: attendance.total + gatha.total
    }
  });
});

/**
 * @desc    Bulk approve
 * @route   POST /api/admin/bulk-approve
 * @access  Admin
 */
const bulkApprove = asyncHandler(async (req, res) => {
  const { type, ids } = req.body;
  let result;

  if (type === 'attendance') {
    result = await attendanceService.bulkApprove(ids, req.admin._id);
  } else if (type === 'gatha') {
    result = await gathaService.bulkApprove(ids, req.admin._id);
  } else {
    return res.status(400).json({
      success: false,
      message: 'Invalid type. Must be "attendance" or "gatha"'
    });
  }

  res.status(200).json({
    success: true,
    message: `${result.modifiedCount} records approved`,
    ...result
  });
});

module.exports = {
  getPendingApprovals,
  bulkApprove
};