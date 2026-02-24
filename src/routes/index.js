const express = require('express');
const router = express.Router();

// Import all controllers directly
const {
  authController,
  userController,
  groupController,
  attendanceController,
  gathaController,
  reportController,
  adminController
} = require('../controllers');

const { protect, adminOnly, userOnly, validate } = require('../middleware');
const validators = require('../validators');

// 🔎 DEBUG: Log all controllers to catch undefined ones
// Comment these 2 lines later
console.log('Exported Controllers:', {
  authController: typeof authController,
  userController: typeof userController,
  groupController: typeof groupController,
  attendanceController: typeof attendanceController,
  gathaController: typeof gathaController,
  reportController: typeof reportController,
  adminController: typeof adminController,
});
if (!userController) {
  console.error('❌ userController is undefined! Check src/controllers/index.js → userController export');
  throw new Error('userController not imported correctly');
}

// ==================== AUTH ROUTES ====================
router.post('/auth/admin/login', safeify(authController?.adminLogin, 'authController.adminLogin'));
router.post('/auth/user/login', safeify(authController?.userLogin, 'authController.userLogin'));
router.get('/auth/verify-token', protect, safeify(authController?.verifyToken, 'authController.verifyToken'));
router.post('/auth/logout', protect, safeify(authController?.logout, 'authController.logout'));

// ==================== ADMIN - USER MANAGEMENT ====================
router.get('/admin/users', protect, adminOnly, safeify(userController?.getUsers, 'userController.getUsers'));
router.post('/admin/users', protect, adminOnly, validators.createUserValidator, validate, safeify(userController?.createUser, 'userController.createUser'));
router.get('/admin/users/without-group', protect, adminOnly, safeify(userController?.getUsersWithoutGroup, 'userController.getUsersWithoutGroup'));
router.get('/admin/users/:id', protect, adminOnly, safeify(userController?.getUser, 'userController.getUser'));
router.put('/admin/users/:id', protect, adminOnly, validators.updateUserValidator, validate, safeify(userController?.updateUser, 'userController.updateUser')); // ⛳ Line 52: Likely Culprit
router.delete('/admin/users/:id', protect, adminOnly, safeify(userController?.deleteUser, 'userController.deleteUser'));
router.get('/admin/users/:id/credentials', protect, adminOnly, safeify(userController?.getCredentials, 'userController.getCredentials'));

// ==================== ADMIN - GROUP MANAGEMENT ====================
router.get('/admin/groups', protect, adminOnly, safeify(groupController?.getGroups, 'groupController.getGroups'));
router.post('/admin/groups', protect, adminOnly, validators.createGroupValidator, validate, safeify(groupController?.createGroup, 'groupController.createGroup'));
router.get('/admin/groups/:id', protect, adminOnly, safeify(groupController?.getGroup, 'groupController.getGroup'));
router.put('/admin/groups/:id', protect, adminOnly, validators.updateGroupValidator, validate, safeify(groupController?.updateGroup, 'groupController.updateGroup'));
router.delete('/admin/groups/:id', protect, adminOnly, safeify(groupController?.deleteGroup, 'groupController.deleteGroup'));
router.post('/admin/groups/:id/members', protect, adminOnly, safeify(groupController?.addMember, 'groupController.addMember'));
router.delete('/admin/groups/:id/members/:userId', protect, adminOnly, safeify(groupController?.removeMember, 'groupController.removeMember'));

// ==================== ADMIN - APPROVALS ====================
router.get('/admin/pending-approvals', protect, adminOnly, safeify(adminController?.getPendingApprovals, 'adminController.getPendingApprovals'));
router.post('/admin/bulk-approve', protect, adminOnly, safeify(adminController?.bulkApprove, 'adminController.bulkApprove'));

// ==================== ADMIN - ATTENDANCE ====================
router.put('/admin/attendance/:id/approve', protect, adminOnly, safeify(attendanceController?.approveAttendance, 'attendanceController.approveAttendance'));
router.put('/admin/attendance/:id/reject', protect, adminOnly, safeify(attendanceController?.rejectAttendance, 'attendanceController.rejectAttendance'));
router.post('/admin/attendance/add-for-user', protect, adminOnly, validators.adminAddAttendanceValidator, validate, safeify(attendanceController?.addAttendanceForUser, 'attendanceController.addAttendanceForUser'));

// ==================== ADMIN - GATHA ====================
router.put('/admin/gatha/:id/approve', protect, adminOnly, safeify(gathaController?.approveGatha, 'gathaController.approveGatha'));
router.put('/admin/gatha/:id/reject', protect, adminOnly, safeify(gathaController?.rejectGatha, 'gathaController.rejectGatha'));
router.post('/admin/gatha/add-for-user', protect, adminOnly, validators.adminAddGathaValidator, validate, safeify(gathaController?.addGathaForUser, 'gathaController.addGathaForUser'));

// ==================== ADMIN - DASHBOARD & REPORTS ====================
router.get('/admin/dashboard/stats', protect, adminOnly, safeify(reportController?.getAdminDashboard, 'reportController.getAdminDashboard'));
router.get('/admin/dashboard/top-performers', protect, adminOnly, safeify(reportController?.getTopPerformers, 'reportController.getTopPerformers'));
router.get('/admin/reports/students', protect, adminOnly, safeify(reportController?.getStudentReport, 'reportController.getStudentReport'));
router.get('/admin/reports/groups', protect, adminOnly, safeify(reportController?.getGroupReport, 'reportController.getGroupReport'));
router.get('/admin/reports/student/:id', protect, adminOnly, safeify(reportController?.getStudentDetailReport, 'reportController.getStudentDetailReport'));
router.get('/admin/reports/group/:id', protect, adminOnly, safeify(reportController?.getGroupDetailReport, 'reportController.getGroupDetailReport'));

// ==================== USER - ATTENDANCE ====================
router.post('/user/attendance', protect, userOnly, validators.markAttendanceValidator, validate, safeify(attendanceController?.markAttendance, 'attendanceController.markAttendance'));
router.get('/user/attendance', protect, userOnly, safeify(attendanceController?.getOwnAttendance, 'attendanceController.getOwnAttendance'));
router.get('/user/attendance/family', protect, userOnly, safeify(attendanceController?.getFamilyAttendance, 'attendanceController.getFamilyAttendance'));

// ==================== USER - GATHA ====================
router.post('/user/gatha', protect, userOnly, validators.addGathaValidator, validate, safeify(gathaController?.addGatha, 'gathaController.addGatha'));
router.get('/user/gatha', protect, userOnly, safeify(gathaController?.getOwnGatha, 'gathaController.getOwnGatha'));
router.get('/user/gatha/family', protect, userOnly, safeify(gathaController?.getFamilyGatha, 'gathaController.getFamilyGatha'));

// ==================== USER - DASHBOARD & REPORTS ====================
router.get('/user/dashboard', protect, userOnly, safeify(reportController?.getUserDashboard, 'reportController.getUserDashboard'));
router.get('/user/report', protect, userOnly, safeify(reportController?.getUserReport, 'reportController.getUserReport'));
router.get('/user/family-report', protect, userOnly, safeify(reportController?.getFamilyReport, 'reportController.getFamilyReport'));
router.get('/user/family-dashboard', protect, userOnly, safeify(reportController?.getUserDashboard, 'reportController.getUserDashboard'));

module.exports = router;

// 🔐 Helper: Prevents "cannot read .put() of undefined"
function safeify(handler, name) {
  if (typeof handler !== 'function') {
    console.error(`❌ Handler missing: ${name}`);
    return (req, res, next) => {
      const err = new Error(`Handler not implemented: ${name}`);
      err.status = 501;
      next(err);
    };
  }
  return handler;
}