const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
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

// Compound index to prevent duplicate attendance for same user on same date
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

// Index for faster queries
attendanceSchema.index({ status: 1, date: -1 });
attendanceSchema.index({ userId: 1, status: 1 });

// Populate user details
attendanceSchema.pre(/^find/, function(next) {
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

module.exports = mongoose.model('Attendance', attendanceSchema);