const { body } = require('express-validator');

const adminLoginValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required'),
  body('password')
    .notEmpty().withMessage('Password is required')
];

const userLoginValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required'),
  body('password')
    .notEmpty().withMessage('Password is required')
];

module.exports = {
  adminLoginValidator,
  userLoginValidator
};