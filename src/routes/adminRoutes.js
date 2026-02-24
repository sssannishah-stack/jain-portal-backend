const express = require('express');
const router = express.Router();
const { adminController, attendanceController, gathaController, reportController } = require('../controllers');
const { protect, adminOnly } = require('../middleware');

// All routes require admin authentication
router.use(protect, adminOnly);

// Dashboard
router.get('/dashboard/stats', reportController.getAdminDashboard);
router.get('/dashboard/top-performers', reportController.getTopPerformers);

// Pending approvals
router.get('/pending-approvals', adminController.getPendingApprovals);
router.post('/bulk-approve', adminController.bulkApprove);

// Attendance management
router.put('/attendance/:id/approve', attendanceController.approveAttendance);
router.put('/attendance/:id/reject', attendanceController.rejectAttendance);
router.post('/attendance/add-for-user', attendanceController.addAttendanceForUser);

// Gatha management
router.put('/gatha/:id/approve', gathaController.approveGatha);
router.put('/gatha/:id/reject', gathaController.rejectGatha);
router.post('/gatha/add-for-user', gathaController.addGathaForUser);

// Reports
router.get('/reports/students', reportController.getStudentReport);
router.get('/reports/groups', reportController.getGroupReport);
router.get('/reports/student/:id', reportController.getStudentDetailReport);
router.get('/reports/group/:id', reportController.getGroupDetailReport);

module.exports = router;