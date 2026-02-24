const { protect, adminOnly, userOnly, superAdminOnly } = require('./auth');
const errorHandler = require('./errorHandler');
const validate = require('./validate');

module.exports = {
  protect,
  adminOnly,
  userOnly,
  superAdminOnly,
  errorHandler,
  validate
};