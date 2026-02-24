const express = require('express');
const router = express.Router();
const { attendanceController } = require('../controllers');
const { protect, adminOnly, userOnly, validate } = require('../middleware');
const { 
  markAttendanceValidator, 
  adminAddAttendanceValidator, 
  attendanceIdValidator,
  attendanceQueryValidator
} = require('../validators');

// User routes
router.post(
  '/mark', 
  protect, 
  userOnly, 
  markAttendanceValidator, 
  validate, 
  attendanceController.markAttendance
);

router.get(
  '/my', 
  protect, 
  userOnly, 
  attendanceQueryValidator, 
  validate, 
  attendanceController.getOwnAttendance
);

router.get(
  '/family', 
  protect, 
  userOnly, 
  attendanceQueryValidator, 
  validate, 
  attendanceController.getFamilyAttendance
);

// Admin routes
router.get(
  '/pending', 
  protect, 
  adminOnly, 
  attendanceQueryValidator, 
  validate, 
  attendanceController.getPendingAttendance
);

router.put(
  '/:id/approve', 
  protect, 
  adminOnly, 
  attendanceIdValidator, 
  validate, 
  attendanceController.approveAttendance
);

router.put(
  '/:id/reject', 
  protect, 
  adminOnly, 
  attendanceIdValidator, 
  validate, 
  attendanceController.rejectAttendance
);

router.post(
  '/bulk-approve', 
  protect, 
  adminOnly, 
  attendanceController.bulkApproveAttendance
);

router.post(
  '/add-for-user', 
  protect, 
  adminOnly, 
  adminAddAttendanceValidator, 
  validate, 
  attendanceController.addAttendanceForUser
);

module.exports = router;