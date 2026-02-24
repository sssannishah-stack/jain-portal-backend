const mongoose = require('mongoose');

const familyGroupSchema = new mongoose.Schema({
  groupName: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true
  },
  groupPassword: {
    type: String,
    required: [true, 'Group password is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Populate members by default
familyGroupSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'members',
    select: 'name phone isActive'
  });
  next();
});

// Get member count virtual
familyGroupSchema.virtual('memberCount').get(function() {
  return this.members ? this.members.length : 0;
});

// Ensure virtuals are included in JSON
familyGroupSchema.set('toJSON', { virtuals: true });
familyGroupSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('FamilyGroup', familyGroupSchema);