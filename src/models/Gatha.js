const mongoose = require('mongoose');

const gathaSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  gathaType: {
    type: String,
    enum: ['new', 'revision'],
    required: [true, 'Gatha type is required']
  },
  gathaCount: {
    type: Number,
    required: [true, 'Gatha count is required'],
    min: [1, 'Gatha count must be at least 1']
  },
  gathaDetails: {
    type: String,
    trim: true,
    default: ''
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  markedByAdmin: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectedAt: {
    type: Date,
    default: null
  },
  remarks: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

// Index for faster queries
gathaSchema.index({ userId: 1, date: -1 });
gathaSchema.index({ status: 1, date: -1 });
gathaSchema.index({ userId: 1, status: 1, gathaType: 1 });

// Populate user details
gathaSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'userId',
    select: 'name familyGroupId'
  }).populate({
    path: 'markedBy',
    select: 'name'
  }).populate({
    path: 'approvedBy',
    select: 'name'
  });
  next();
});

module.exports = mongoose.model('Gatha', gathaSchema);