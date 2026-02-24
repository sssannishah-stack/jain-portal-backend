const { body, param, query } = require('express-validator');

const markAttendanceValidator = [
  body('date')
    .notEmpty().withMessage('Date is required')
    .isISO8601().withMessage('Invalid date format'),
  body('userIds')
    .isArray({ min: 1 }).withMessage('At least one user ID is required'),
  body('userIds.*')
    .isMongoId().withMessage('Invalid user ID')
];

const adminAddAttendanceValidator = [
  body('date')
    .notEmpty().withMessage('Date is required')
    .isISO8601().withMessage('Invalid date format'),
  body('userId')
    .isMongoId().withMessage('Invalid user ID'),
  body('autoApprove')
    .optional()
    .isBoolean().withMessage('Auto approve must be boolean')
];

const attendanceIdValidator = [
  param('id')
    .isMongoId().withMessage('Invalid attendance ID')
];

const attendanceQueryValidator = [
  query('startDate')
    .optional()
    .isISO8601().withMessage('Invalid start date format'),
  query('endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date format'),
  query('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected']).withMessage('Invalid status'),
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

module.exports = {
  markAttendanceValidator,
  adminAddAttendanceValidator,
  attendanceIdValidator,
  attendanceQueryValidator
};