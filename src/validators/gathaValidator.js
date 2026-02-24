const { body, param, query } = require('express-validator');

const addGathaValidator = [
  body('date')
    .notEmpty().withMessage('Date is required')
    .isISO8601().withMessage('Invalid date format'),
  body('userIds')
    .isArray({ min: 1 }).withMessage('At least one user ID is required'),
  body('userIds.*')
    .isMongoId().withMessage('Invalid user ID'),
  body('gathaType')
    .notEmpty().withMessage('Gatha type is required')
    .isIn(['new', 'revision']).withMessage('Gatha type must be "new" or "revision"'),
  body('gathaCount')
    .notEmpty().withMessage('Gatha count is required')
    .isInt({ min: 1 }).withMessage('Gatha count must be at least 1'),
  body('gathaDetails')
    .optional()
    .trim()
];

const adminAddGathaValidator = [
  body('date')
    .notEmpty().withMessage('Date is required')
    .isISO8601().withMessage('Invalid date format'),
  body('userId')
    .isMongoId().withMessage('Invalid user ID'),
  body('gathaType')
    .notEmpty().withMessage('Gatha type is required')
    .isIn(['new', 'revision']).withMessage('Gatha type must be "new" or "revision"'),
  body('gathaCount')
    .notEmpty().withMessage('Gatha count is required')
    .isInt({ min: 1 }).withMessage('Gatha count must be at least 1'),
  body('gathaDetails')
    .optional()
    .trim(),
  body('autoApprove')
    .optional()
    .isBoolean().withMessage('Auto approve must be boolean')
];

const gathaIdValidator = [
  param('id')
    .isMongoId().withMessage('Invalid gatha ID')
];

const gathaQueryValidator = [
  query('startDate')
    .optional()
    .isISO8601().withMessage('Invalid start date format'),
  query('endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date format'),
  query('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected']).withMessage('Invalid status'),
  query('gathaType')
    .optional()
    .isIn(['new', 'revision']).withMessage('Invalid gatha type'),
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

module.exports = {
  addGathaValidator,
  adminAddGathaValidator,
  gathaIdValidator,
  gathaQueryValidator
};