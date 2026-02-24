const express = require('express');
const router = express.Router();
const { reportController } = require('../controllers');
const { protect, adminOnly, userOnly } = require('../middleware');

// Admin routes
router.get('/admin/dashboard/stats', protect, adminOnly, reportController.getAdminDashboard);
router.get('/admin/dashboard/top-performers', protect, adminOnly, reportController.getTopPerformers);
router.get('/admin/reports/students', protect, adminOnly, reportController.getStudentReport);
router.get('/admin/reports/groups', protect, adminOnly, reportController.getGroupReport);
router.get('/admin/reports/student/:id', protect, adminOnly, reportController.getStudentDetailReport);
router.get('/admin/reports/group/:id', protect, adminOnly, reportController.getGroupDetailReport);

// User routes
router.get('/user/dashboard', protect, userOnly, reportController.getUserDashboard);
router.get('/user/report', protect, userOnly, reportController.getUserReport);
router.get('/user/family-report', protect, userOnly, reportController.getFamilyReport);

module.exports = router;