const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    trim: true,
    minlength: [1, 'Password must be at least 1 character']
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  address: {
    type: String,
    trim: true,
    default: ''
  },
  familyGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyGroup',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null  // Changed from required to default null
  }
}, {
  timestamps: true
});

// Compound unique index for name + password combination
userSchema.index({ name: 1, password: 1 }, { unique: true });

// Populate familyGroupId by default
userSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'familyGroupId',
    select: 'groupName groupPassword'
  });
  next();
});

module.exports = mongoose.model('User', userSchema);