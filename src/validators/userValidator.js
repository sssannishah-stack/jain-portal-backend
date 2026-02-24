const { body, param } = require('express-validator');

const createUserValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 1, max: 100 }).withMessage('Name must be between 1 and 100 characters'),
  body('password')
    .trim()
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 1 }).withMessage('Password must be at least 1 character'),
  body('phone')
    .optional()
    .trim(),
  body('address')
    .optional()
    .trim(),
  body('familyGroupId')
    .optional()
    .custom((value) => {
      if (value === null || value === '' || value === 'null') return true;
      const mongoose = require('mongoose');
      return mongoose.Types.ObjectId.isValid(value);
    }).withMessage('Invalid family group ID')
];

const updateUserValidator = [
  param('id')
    .isMongoId().withMessage('Invalid user ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('Name must be between 1 and 100 characters'),
  body('password')
    .optional()
    .trim()
    .isLength({ min: 1 }).withMessage('Password must be at least 1 character'),
  body('phone')
    .optional()
    .trim(),
  body('address')
    .optional()
    .trim(),
  body('familyGroupId')
    .optional()
    .custom((value) => {
      if (value === null || value === '' || value === 'null') return true;
      const mongoose = require('mongoose');
      return mongoose.Types.ObjectId.isValid(value);
    }).withMessage('Invalid family group ID')
];

const userIdValidator = [
  param('id')
    .isMongoId().withMessage('Invalid user ID')
];

module.exports = {
  createUserValidator,
  updateUserValidator,
  userIdValidator
};