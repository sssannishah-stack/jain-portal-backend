const authValidator = require('./authValidator');
const userValidator = require('./userValidator');
const groupValidator = require('./groupValidator');
const attendanceValidator = require('./attendanceValidator');
const gathaValidator = require('./gathaValidator');

module.exports = {
  ...authValidator,
  ...userValidator,
  ...groupValidator,
  ...attendanceValidator,
  ...gathaValidator
};