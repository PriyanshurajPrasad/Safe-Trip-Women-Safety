const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema for SafeCheck application
 * Stores user authentication and profile information
 */
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email address'
    ]
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [
      /^\+?[\d\s\-\(\)]+$/,
      'Please enter a valid phone number'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false
  },
  profilePictureUrl: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

/**
 * Hash password before saving
 */
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Method to compare password for authentication
 * @param {string} candidatePassword - Password to compare
 * @returns {Promise<boolean>} - Returns true if passwords match
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Virtual to get user's active trips
 */
userSchema.virtual('activeTrips', {
  ref: 'Trip',
  localField: '_id',
  foreignField: 'userId',
  match: { status: 'ACTIVE' }
});

/**
 * Virtual to get user's emergency contacts
 */
userSchema.virtual('contacts', {
  ref: 'Contact',
  localField: '_id',
  foreignField: 'userId'
});

module.exports = mongoose.model('User', userSchema);
