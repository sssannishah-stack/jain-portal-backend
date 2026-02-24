const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    unique: true
  },
  username: {
    type: String,
    trim: true,
    unique: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 3
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin'],
    default: 'admin'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compare password method - using bcrypt
adminSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    // If password starts with $2a$ or $2b$, it's hashed
    if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$')) {
      return await bcrypt.compare(candidatePassword, this.password);
    }
    // Fallback for plain text passwords in DB
    return this.password === candidatePassword;
  } catch (err) {
    return false;
  }
};

// Remove password from JSON response
adminSchema.methods.toJSON = function() {
  const admin = this.toObject();
  delete admin.password;
  return admin;
};

module.exports = mongoose.model('Admin', adminSchema);