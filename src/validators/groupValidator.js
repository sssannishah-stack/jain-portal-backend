const { body, param } = require('express-validator');

const createGroupValidator = [
  body('groupName')
    .trim()
    .notEmpty().withMessage('Group name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Group name must be between 2 and 100 characters'),
  body('groupPassword')
    .trim()
    .notEmpty().withMessage('Group password is required')
    .isLength({ min: 3 }).withMessage('Group password must be at least 3 characters'),
  body('description')
    .optional()
    .trim(),
  body('members')
    .optional()
    .isArray().withMessage('Members must be an array'),
  body('members.*')
    .optional()
    .isMongoId().withMessage('Invalid member ID')
];

const updateGroupValidator = [
  param('id')
    .isMongoId().withMessage('Invalid group ID'),
  body('groupName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Group name must be between 2 and 100 characters'),
  body('groupPassword')
    .optional()
    .trim()
    .isLength({ min: 3 }).withMessage('Group password must be at least 3 characters'),
  body('description')
    .optional()
    .trim(),
  body('members')
    .optional()
    .isArray().withMessage('Members must be an array')
];

const groupIdValidator = [
  param('id')
    .isMongoId().withMessage('Invalid group ID')
];

const addMemberValidator = [
  param('id')
    .isMongoId().withMessage('Invalid group ID'),
  body('userId')
    .isMongoId().withMessage('Invalid user ID')
];

const removeMemberValidator = [
  param('id')
    .isMongoId().withMessage('Invalid group ID'),
  param('userId')
    .isMongoId().withMessage('Invalid user ID')
];

module.exports = {
  createGroupValidator,
  updateGroupValidator,
  groupIdValidator,
  addMemberValidator,
  removeMemberValidator
};