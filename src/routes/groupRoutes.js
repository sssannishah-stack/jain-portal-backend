const express = require('express');
const router = express.Router();
const { groupController } = require('../controllers');
const { protect, adminOnly, validate } = require('../middleware');
const { 
  createGroupValidator, 
  updateGroupValidator, 
  groupIdValidator,
  addMemberValidator,
  removeMemberValidator
} = require('../validators');

// All routes require admin authentication
router.use(protect, adminOnly);

// CRUD operations
router.route('/')
  .get(groupController.getGroups)
  .post(createGroupValidator, validate, groupController.createGroup);

router.route('/:id')
  .get(groupIdValidator, validate, groupController.getGroup)
  .put(updateGroupValidator, validate, groupController.updateGroup)
  .delete(groupIdValidator, validate, groupController.deleteGroup);

// Member management
router.post('/:id/members', addMemberValidator, validate, groupController.addMember);
router.delete('/:id/members/:userId', removeMemberValidator, validate, groupController.removeMember);

module.exports = router;