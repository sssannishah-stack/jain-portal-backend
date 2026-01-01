import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ============================================
// DATABASE CONNECTION
// ============================================
let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    isConnected = true;
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// ============================================
// MONGOOSE SCHEMAS & MODELS
// ============================================

// Admin Schema
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// User/Student Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  password: { type: String, required: true },
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', default: null },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
});

// Compound index for unique name+password combination
userSchema.index({ name: 1, password: 1 }, { unique: true });

// Family/Group Schema
const familySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
});

// Attendance Schema
const attendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null if marked by admin
  markedByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  approvedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

// Gatha Schema
const gathaSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  type: { type: String, enum: ['new', 'revision'], required: true },
  count: { type: Number, required: true, min: 1 },
  gathaNames: [{ type: String }], // Optional: names of gathas
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  markedByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  approvedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

// Create Models
const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Family = mongoose.models.Family || mongoose.model('Family', familySchema);
const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
const Gatha = mongoose.models.Gatha || mongoose.model('Gatha', gathaSchema);

// ============================================
// MIDDLEWARE
// ============================================

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

const adminMiddleware = async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const getDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

// Analytics Helper
const calculateAnalytics = async (userIds, startDate, endDate) => {
  const { start, end } = getDateRange(startDate, endDate);
  
  const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  
  const attendanceStats = await Attendance.aggregate([
    {
      $match: {
        userId: { $in: userIds },
        date: { $gte: start, $lte: end },
        status: 'approved'
      }
    },
    {
      $group: {
        _id: '$userId',
        totalAttendance: { $sum: 1 }
      }
    }
  ]);

  const gathaStats = await Gatha.aggregate([
    {
      $match: {
        userId: { $in: userIds },
        date: { $gte: start, $lte: end },
        status: 'approved'
      }
    },
    {
      $group: {
        _id: { userId: '$userId', type: '$type' },
        totalCount: { $sum: '$count' }
      }
    }
  ]);

  return { attendanceStats, gathaStats, totalDays };
};

// ============================================
// ROUTES
// ============================================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Jain Portal API is running' });
});

// -------------------- ADMIN AUTH --------------------

// Initial Admin Setup (use once, then disable)
app.post('/api/admin/setup', async (req, res) => {
  try {
    await connectDB();
    const { username, password, name, setupKey } = req.body;
    
    if (setupKey !== process.env.ADMIN_SETUP_KEY) {
      return res.status(403).json({ success: false, message: 'Invalid setup key' });
    }
    
    const existingAdmin = await Admin.findOne();
    if (existingAdmin) {
      return res.status(400).json({ success: false, message: 'Admin already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await Admin.create({ username, password: hashedPassword, name });
    
    res.json({ success: true, message: 'Admin created successfully', adminId: admin._id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin Login
app.post('/api/admin/login', async (req, res) => {
  try {
    await connectDB();
    const { username, password } = req.body;
    
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    const token = generateToken({ id: admin._id, role: 'admin', name: admin.name });
    
    res.json({ 
      success: true, 
      token, 
      admin: { id: admin._id, name: admin.name, username: admin.username }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add Second Admin (by existing admin)
app.post('/api/admin/add', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const { username, password, name } = req.body;
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await Admin.create({ username, password: hashedPassword, name });
    
    res.json({ success: true, message: 'Admin added successfully', admin: { id: admin._id, name, username } });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------- USER MANAGEMENT --------------------

// Create User
app.post('/api/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const { name, password } = req.body;
    
    // Check if name+password combination exists
    const existing = await User.findOne({ name, password });
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: 'A user with this name and password combination already exists. Please use a different password.' 
      });
    }
    
    const user = await User.create({ 
      name, 
      password, 
      createdBy: req.user.id 
    });
    
    res.json({ success: true, user: { id: user._id, name: user.name, password: user.password } });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'This name and password combination already exists' 
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get All Users
app.get('/api/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const users = await User.find({ isActive: true })
      .populate('familyId', 'name')
      .select('name password familyId createdAt');
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update User
app.put('/api/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const { name, password, isActive } = req.body;
    
    // Check for duplicate name+password if changing
    if (name && password) {
      const existing = await User.findOne({ name, password, _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(400).json({ 
          success: false, 
          message: 'This name and password combination already exists' 
        });
      }
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id, 
      { name, password, isActive }, 
      { new: true }
    );
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete User (soft delete)
app.delete('/api/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    await User.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'User deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------- FAMILY/GROUP MANAGEMENT --------------------

// Create Family
app.post('/api/families', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const { name, description, memberIds } = req.body;
    
    const family = await Family.create({ 
      name, 
      description, 
      members: memberIds || [],
      createdBy: req.user.id 
    });
    
    // Update users with family reference
    if (memberIds && memberIds.length > 0) {
      await User.updateMany(
        { _id: { $in: memberIds } },
        { familyId: family._id }
      );
    }
    
    res.json({ success: true, family });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Family name already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get All Families
app.get('/api/families', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const families = await Family.find().populate('members', 'name password');
    res.json({ success: true, families });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update Family Members
app.put('/api/families/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const { name, description, memberIds } = req.body;
    
    // Remove old members from family
    await User.updateMany(
      { familyId: req.params.id },
      { familyId: null }
    );
    
    // Update family
    const family = await Family.findByIdAndUpdate(
      req.params.id,
      { name, description, members: memberIds },
      { new: true }
    ).populate('members', 'name password');
    
    // Add new members to family
    if (memberIds && memberIds.length > 0) {
      await User.updateMany(
        { _id: { $in: memberIds } },
        { familyId: family._id }
      );
    }
    
    res.json({ success: true, family });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete Family
app.delete('/api/families/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    
    // Remove family reference from users
    await User.updateMany(
      { familyId: req.params.id },
      { familyId: null }
    );
    
    await Family.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Family deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------- USER AUTH --------------------

// User Login
app.post('/api/user/login', async (req, res) => {
  try {
    await connectDB();
    const { name, password } = req.body;
    
    const user = await User.findOne({ name, password, isActive: true })
      .populate({
        path: 'familyId',
        populate: { path: 'members', select: 'name _id' }
      });
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid name or password' });
    }
    
    const familyMembers = user.familyId ? user.familyId.members : [{ _id: user._id, name: user.name }];
    
    const token = generateToken({ 
      id: user._id, 
      role: 'user', 
      name: user.name,
      familyId: user.familyId?._id || null
    });
    
    res.json({ 
      success: true, 
      token, 
      user: { 
        id: user._id, 
        name: user.name,
        familyId: user.familyId?._id || null,
        familyName: user.familyId?.name || null,
        familyMembers
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Family Members (for logged in user)
app.get('/api/user/family-members', authMiddleware, async (req, res) => {
  try {
    await connectDB();
    
    if (req.user.familyId) {
      const family = await Family.findById(req.user.familyId)
        .populate('members', 'name _id');
      res.json({ success: true, members: family.members, familyName: family.name });
    } else {
      const user = await User.findById(req.user.id).select('name _id');
      res.json({ success: true, members: [user], familyName: null });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------- ATTENDANCE --------------------

// Mark Attendance (User)
app.post('/api/attendance', authMiddleware, async (req, res) => {
  try {
    await connectDB();
    const { userId, date } = req.body;

    // ✅ VALIDATION - More detailed error messages
    if (!userId || !date) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields',
        received: { userId, date }
      });
    }

    // Verify user can mark for this userId (same user or family member)
    if (req.user.role === 'user') {
      const targetUser = await User.findById(userId);
      if (!targetUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      
      // Check if same family or same user
      const loggedInUser = await User.findById(req.user.id);
      const isSameFamily = targetUser.familyId && 
                          loggedInUser.familyId && 
                          targetUser.familyId.toString() === loggedInUser.familyId.toString();
      const isSameUser = targetUser._id.toString() === req.user.id;
      
      if (!isSameFamily && !isSameUser) {
        return res.status(403).json({ success: false, message: 'Cannot mark attendance for this user' });
      }
    }
    
    // Check for existing attendance on same date
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(attendanceDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const existing = await Attendance.findOne({
      userId,
      date: { $gte: attendanceDate, $lt: nextDay }
    });
    
    if (existing) {
      return res.status(400).json({ success: false, message: 'Attendance already marked for this date' });
    }
    
    const attendance = await Attendance.create({
      userId,
      date: attendanceDate,
      markedBy: req.user.role === 'user' ? req.user.id : null,
      markedByAdmin: req.user.role === 'admin' ? req.user.id : null,
      status: req.user.role === 'admin' ? 'approved' : 'pending',
      approvedBy: req.user.role === 'admin' ? req.user.id : null,
      approvedAt: req.user.role === 'admin' ? new Date() : null
    });
    
    res.json({ success: true, attendance });
  } catch (error) {
    console.error('❌ Attendance Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark Attendance by Admin (for user who forgot phone)
app.post('/api/admin/attendance', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const { userId, date } = req.body;
    
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(attendanceDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const existing = await Attendance.findOne({
      userId,
      date: { $gte: attendanceDate, $lt: nextDay }
    });
    
    if (existing) {
      return res.status(400).json({ success: false, message: 'Attendance already marked for this date' });
    }
    
    const attendance = await Attendance.create({
      userId,
      date: attendanceDate,
      markedByAdmin: req.user.id,
      status: 'approved',
      approvedBy: req.user.id,
      approvedAt: new Date()
    });
    
    res.json({ success: true, attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Pending Attendance (Admin)
app.get('/api/admin/attendance/pending', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const pending = await Attendance.find({ status: 'pending' })
      .populate('userId', 'name')
      .populate('markedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, pending });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Approve/Reject Attendance (Admin)
app.put('/api/admin/attendance/:id/approve', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const { status } = req.body; // 'approved' or 'rejected'
    
    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        approvedBy: req.user.id,
        approvedAt: new Date()
      },
      { new: true }
    ).populate('userId', 'name');
    
    res.json({ success: true, attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Bulk Approve Attendance
app.post('/api/admin/attendance/bulk-approve', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const { ids, status } = req.body;
    
    await Attendance.updateMany(
      { _id: { $in: ids } },
      { 
        status,
        approvedBy: req.user.id,
        approvedAt: new Date()
      }
    );
    
    res.json({ success: true, message: `${ids.length} attendance records ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------- GATHA --------------------

// Add Gatha (User)
app.post('/api/gatha', authMiddleware, async (req, res) => {
  try {
    await connectDB();
    const { userId, date, type, count, gathaNames } = req.body;
    
    // Verify user can mark for this userId
    if (req.user.role === 'user') {
      const targetUser = await User.findById(userId);
      if (!targetUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      
      const loggedInUser = await User.findById(req.user.id);
      const isSameFamily = targetUser.familyId && 
                          loggedInUser.familyId && 
                          targetUser.familyId.toString() === loggedInUser.familyId.toString();
      const isSameUser = targetUser._id.toString() === req.user.id;
      
      if (!isSameFamily && !isSameUser) {
        return res.status(403).json({ success: false, message: 'Cannot add gatha for this user' });
      }
    }
    
    const gathaDate = new Date(date);
    gathaDate.setHours(0, 0, 0, 0);
    
    const gatha = await Gatha.create({
      userId,
      date: gathaDate,
      type,
      count,
      gathaNames: gathaNames || [],
      markedBy: req.user.role === 'user' ? req.user.id : null,
      markedByAdmin: req.user.role === 'admin' ? req.user.id : null,
      status: req.user.role === 'admin' ? 'approved' : 'pending',
      approvedBy: req.user.role === 'admin' ? req.user.id : null,
      approvedAt: req.user.role === 'admin' ? new Date() : null
    });
    
    res.json({ success: true, gatha });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add Gatha by Admin
app.post('/api/admin/gatha', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const { userId, date, type, count, gathaNames } = req.body;
    
    const gathaDate = new Date(date);
    gathaDate.setHours(0, 0, 0, 0);
    
    const gatha = await Gatha.create({
      userId,
      date: gathaDate,
      type,
      count,
      gathaNames: gathaNames || [],
      markedByAdmin: req.user.id,
      status: 'approved',
      approvedBy: req.user.id,
      approvedAt: new Date()
    });
    
    res.json({ success: true, gatha });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Pending Gatha (Admin)
app.get('/api/admin/gatha/pending', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const pending = await Gatha.find({ status: 'pending' })
      .populate('userId', 'name')
      .populate('markedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, pending });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Approve/Reject Gatha (Admin)
app.put('/api/admin/gatha/:id/approve', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const { status } = req.body;
    
    const gatha = await Gatha.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        approvedBy: req.user.id,
        approvedAt: new Date()
      },
      { new: true }
    ).populate('userId', 'name');
    
    res.json({ success: true, gatha });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Bulk Approve Gatha
app.post('/api/admin/gatha/bulk-approve', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const { ids, status } = req.body;
    
    await Gatha.updateMany(
      { _id: { $in: ids } },
      { 
        status,
        approvedBy: req.user.id,
        approvedAt: new Date()
      }
    );
    
    res.json({ success: true, message: `${ids.length} gatha records ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------- REPORTS & ANALYTICS --------------------

// User Report (for logged in user - self or family)
app.get('/api/user/report', authMiddleware, async (req, res) => {
  try {
    await connectDB();
    const { startDate, endDate, userId } = req.query;
    
    let targetUserIds = [];
    
    if (req.user.familyId) {
      const family = await Family.findById(req.user.familyId);
      targetUserIds = family.members;
    } else {
      targetUserIds = [req.user.id];
    }
    
    // If specific userId requested, verify access
    if (userId) {
      const hasAccess = targetUserIds.some(id => id.toString() === userId);
      if (!hasAccess) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
      targetUserIds = [userId];
    }
    
    const { start, end } = getDateRange(startDate, endDate);
    
    // Get attendance
    const attendance = await Attendance.find({
      userId: { $in: targetUserIds },
      date: { $gte: start, $lte: end },
      status: 'approved'
    }).populate('userId', 'name').sort({ date: -1 });
    
    // Get gatha
    const gatha = await Gatha.find({
      userId: { $in: targetUserIds },
      date: { $gte: start, $lte: end },
      status: 'approved'
    }).populate('userId', 'name').sort({ date: -1 });
    
    // Calculate summary
    const summary = {};
    targetUserIds.forEach(id => {
      summary[id.toString()] = {
        totalAttendance: 0,
        newGatha: 0,
        revisionGatha: 0
      };
    });
    
    attendance.forEach(a => {
      if (summary[a.userId._id.toString()]) {
        summary[a.userId._id.toString()].totalAttendance++;
      }
    });
    
    gatha.forEach(g => {
      if (summary[g.userId._id.toString()]) {
        if (g.type === 'new') {
          summary[g.userId._id.toString()].newGatha += g.count;
        } else {
          summary[g.userId._id.toString()].revisionGatha += g.count;
        }
      }
    });
    
    res.json({ 
      success: true, 
      attendance, 
      gatha, 
      summary,
      dateRange: { start, end }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin Reports - All Students
app.get('/api/admin/reports/students', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const { startDate, endDate } = req.query;
    const { start, end } = getDateRange(startDate, endDate);
    
    const users = await User.find({ isActive: true }).select('name _id familyId');
    const userIds = users.map(u => u._id);
    
    // Aggregate attendance
    const attendanceAgg = await Attendance.aggregate([
      {
        $match: {
          userId: { $in: userIds },
          date: { $gte: start, $lte: end },
          status: 'approved'
        }
      },
      {
        $group: {
          _id: '$userId',
          totalAttendance: { $sum: 1 },
          dates: { $push: '$date' }
        }
      }
    ]);
    
    // Aggregate gatha
    const gathaAgg = await Gatha.aggregate([
      {
        $match: {
          userId: { $in: userIds },
          date: { $gte: start, $lte: end },
          status: 'approved'
        }
      },
      {
        $group: {
          _id: { userId: '$userId', type: '$type' },
          totalCount: { $sum: '$count' }
        }
      }
    ]);
    
    // Build report
    const report = users.map(user => {
      const attData = attendanceAgg.find(a => a._id.toString() === user._id.toString());
      const newGatha = gathaAgg.find(g => 
        g._id.userId.toString() === user._id.toString() && g._id.type === 'new'
      );
      const revisionGatha = gathaAgg.find(g => 
        g._id.userId.toString() === user._id.toString() && g._id.type === 'revision'
      );
      
      return {
        userId: user._id,
        name: user.name,
        familyId: user.familyId,
        totalAttendance: attData?.totalAttendance || 0,
        newGatha: newGatha?.totalCount || 0,
        revisionGatha: revisionGatha?.totalCount || 0,
        totalGatha: (newGatha?.totalCount || 0) + (revisionGatha?.totalCount || 0)
      };
    });
    
    // Calculate totals
    const totals = {
      totalAttendance: report.reduce((sum, r) => sum + r.totalAttendance, 0),
      totalNewGatha: report.reduce((sum, r) => sum + r.newGatha, 0),
      totalRevisionGatha: report.reduce((sum, r) => sum + r.revisionGatha, 0)
    };
    
    res.json({ 
      success: true, 
      report, 
      totals,
      dateRange: { start, end },
      totalStudents: users.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin Reports - By Family/Group
app.get('/api/admin/reports/families', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const { startDate, endDate } = req.query;
    const { start, end } = getDateRange(startDate, endDate);
    
    const families = await Family.find().populate('members', 'name _id');
    
    // Get individual students (not in any family)
    const usersInFamilies = families.flatMap(f => f.members.map(m => m._id.toString()));
    const individualUsers = await User.find({ 
      isActive: true, 
      _id: { $nin: usersInFamilies } 
    }).select('name _id');
    
    const report = [];
    
    // Family reports
    for (const family of families) {
      const memberIds = family.members.map(m => m._id);
      
      const attCount = await Attendance.countDocuments({
        userId: { $in: memberIds },
        date: { $gte: start, $lte: end },
        status: 'approved'
      });
      
      const gathaAgg = await Gatha.aggregate([
        {
          $match: {
            userId: { $in: memberIds },
            date: { $gte: start, $lte: end },
            status: 'approved'
          }
        },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$count' }
          }
        }
      ]);
      
      const newGatha = gathaAgg.find(g => g._id === 'new')?.total || 0;
      const revisionGatha = gathaAgg.find(g => g._id === 'revision')?.total || 0;
      
      report.push({
        type: 'family',
        id: family._id,
        name: family.name,
        memberCount: family.members.length,
        members: family.members.map(m => ({ id: m._id, name: m.name })),
        totalAttendance: attCount,
        newGatha,
        revisionGatha,
        totalGatha: newGatha + revisionGatha
      });
    }
    
    // Individual student reports
    for (const user of individualUsers) {
      const attCount = await Attendance.countDocuments({
        userId: user._id,
        date: { $gte: start, $lte: end },
        status: 'approved'
      });
      
      const gathaAgg = await Gatha.aggregate([
        {
          $match: {
            userId: user._id,
            date: { $gte: start, $lte: end },
            status: 'approved'
          }
        },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$count' }
          }
        }
      ]);
      
      const newGatha = gathaAgg.find(g => g._id === 'new')?.total || 0;
      const revisionGatha = gathaAgg.find(g => g._id === 'revision')?.total || 0;
      
      report.push({
        type: 'individual',
        id: user._id,
        name: user.name,
        memberCount: 1,
        members: [{ id: user._id, name: user.name }],
        totalAttendance: attCount,
        newGatha,
        revisionGatha,
        totalGatha: newGatha + revisionGatha
      });
    }
    
    // Grand totals
    const grandTotals = {
      totalAttendance: report.reduce((sum, r) => sum + r.totalAttendance, 0),
      totalNewGatha: report.reduce((sum, r) => sum + r.newGatha, 0),
      totalRevisionGatha: report.reduce((sum, r) => sum + r.revisionGatha, 0),
      totalFamilies: families.length,
      totalIndividuals: individualUsers.length
    };
    
    res.json({ 
      success: true, 
      report, 
      grandTotals,
      dateRange: { start, end }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Export Report Data
app.get('/api/admin/reports/export', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const { startDate, endDate, type, id } = req.query;
    const { start, end } = getDateRange(startDate, endDate);
    
    let userIds = [];
    let reportName = '';
    
    if (type === 'family' && id) {
      const family = await Family.findById(id).populate('members', 'name _id');
      userIds = family.members.map(m => m._id);
      reportName = `Family_${family.name}`;
    } else if (type === 'student' && id) {
      const user = await User.findById(id);
      userIds = [user._id];
      reportName = `Student_${user.name}`;
    } else {
      const users = await User.find({ isActive: true });
      userIds = users.map(u => u._id);
      reportName = 'All_Students';
    }
    
    const attendance = await Attendance.find({
      userId: { $in: userIds },
      date: { $gte: start, $lte: end },
      status: 'approved'
    }).populate('userId', 'name').sort({ date: 1 });
    
    const gatha = await Gatha.find({
      userId: { $in: userIds },
      date: { $gte: start, $lte: end },
      status: 'approved'
    }).populate('userId', 'name').sort({ date: 1 });
    
    // Format for CSV export
    const attendanceData = attendance.map(a => ({
      date: a.date.toISOString().split('T')[0],
      studentName: a.userId.name,
      type: 'Attendance'
    }));
    
    const gathaData = gatha.map(g => ({
      date: g.date.toISOString().split('T')[0],
      studentName: g.userId.name,
      type: g.type === 'new' ? 'New Gatha' : 'Revision Gatha',
      count: g.count
    }));
    
    res.json({ 
      success: true, 
      reportName,
      dateRange: { 
        start: start.toISOString().split('T')[0], 
        end: end.toISOString().split('T')[0] 
      },
      attendance: attendanceData,
      gatha: gathaData
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------- DASHBOARD ANALYTICS --------------------

// Admin Dashboard Stats
app.get('/api/admin/dashboard', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    
    // Today's stats
    const todayAttendance = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      status: 'approved'
    });
    
    const todayGatha = await Gatha.aggregate([
      {
        $match: {
          date: { $gte: today, $lt: tomorrow },
          status: 'approved'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$count' }
        }
      }
    ]);
    
    // Monthly stats
    const monthlyAttendance = await Attendance.countDocuments({
      date: { $gte: thisMonthStart, $lte: thisMonthEnd },
      status: 'approved'
    });
    
    const monthlyGatha = await Gatha.aggregate([
      {
        $match: {
          date: { $gte: thisMonthStart, $lte: thisMonthEnd },
          status: 'approved'
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$count' }
        }
      }
    ]);
    
    // Pending approvals
    const pendingAttendance = await Attendance.countDocuments({ status: 'pending' });
    const pendingGatha = await Gatha.countDocuments({ status: 'pending' });
    
    // Total counts
    const totalStudents = await User.countDocuments({ isActive: true });
    const totalFamilies = await Family.countDocuments();
    
    // Weekly trend (last 7 days)
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);
    
    const weeklyTrend = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: weekAgo, $lte: tomorrow },
          status: 'approved'
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.json({
      success: true,
      today: {
        attendance: todayAttendance,
        gatha: todayGatha[0]?.total || 0
      },
      monthly: {
        attendance: monthlyAttendance,
        newGatha: monthlyGatha.find(g => g._id === 'new')?.total || 0,
        revisionGatha: monthlyGatha.find(g => g._id === 'revision')?.total || 0
      },
      pending: {
        attendance: pendingAttendance,
        gatha: pendingGatha
      },
      totals: {
        students: totalStudents,
        families: totalFamilies
      },
      weeklyTrend
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// User Dashboard Stats
app.get('/api/user/dashboard', authMiddleware, async (req, res) => {
  try {
    await connectDB();
    
    let targetUserIds = [];
    
    if (req.user.familyId) {
      const family = await Family.findById(req.user.familyId);
      targetUserIds = family.members;
    } else {
      targetUserIds = [req.user.id];
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    
    // Today's status
    const todayAttendance = await Attendance.find({
      userId: { $in: targetUserIds },
      date: { $gte: today, $lt: tomorrow }
    }).populate('userId', 'name');
    
    // Monthly stats
    const monthlyAttendance = await Attendance.countDocuments({
      userId: { $in: targetUserIds },
      date: { $gte: thisMonthStart, $lte: thisMonthEnd },
      status: 'approved'
    });
    
    const monthlyGatha = await Gatha.aggregate([
      {
        $match: {
          userId: { $in: targetUserIds.map(id => new mongoose.Types.ObjectId(id)) },
          date: { $gte: thisMonthStart, $lte: thisMonthEnd },
          status: 'approved'
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$count' }
        }
      }
    ]);
    
    // Pending items
    const pendingAttendance = await Attendance.countDocuments({
      userId: { $in: targetUserIds },
      status: 'pending'
    });
    
    const pendingGatha = await Gatha.countDocuments({
      userId: { $in: targetUserIds },
      status: 'pending'
    });
    
    // Streak calculation (consecutive days)
    const allAttendance = await Attendance.find({
      userId: { $in: targetUserIds },
      status: 'approved'
    }).sort({ date: -1 }).limit(30);
    
    let streak = 0;
    let checkDate = new Date(today);
    
    for (let i = 0; i < 30; i++) {
      const hasAttendance = allAttendance.some(a => {
        const aDate = new Date(a.date);
        return aDate.toDateString() === checkDate.toDateString();
      });
      
      if (hasAttendance) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    res.json({
      success: true,
      today: {
        attendance: todayAttendance.map(a => ({
          userId: a.userId._id,
          name: a.userId.name,
          status: a.status
        }))
      },
      monthly: {
        attendance: monthlyAttendance,
        newGatha: monthlyGatha.find(g => g._id === 'new')?.total || 0,
        revisionGatha: monthlyGatha.find(g => g._id === 'revision')?.total || 0
      },
      pending: {
        attendance: pendingAttendance,
        gatha: pendingGatha
      },
      streak
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// For local development only
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// ✅ Export for Vercel
export default app;
