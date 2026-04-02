const mongoose = require('mongoose');

/**
 * Contact Schema for emergency contacts
 * Stores trusted contact information for emergency notifications
 */
const contactSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  name: {
    type: String,
    required: [true, 'Contact name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [
      /^\+?[\d\s\-\(\)]+$/,
      'Please enter a valid phone number'
    ]
  },
  relation: {
    type: String,
    required: [true, 'Relation is required'],
    enum: [
      'FAMILY',
      'FRIEND',
      'COLLEAGUE',
      'NEIGHBOR',
      'SPOUSE',
      'PARENT',
      'SIBLING',
      'OTHER'
    ],
    default: 'OTHER'
  },
  priorityLevel: {
    type: Number,
    required: [true, 'Priority level is required'],
    min: 1,
    max: 5,
    default: 3
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPrimary: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

/**
 * Compound index to ensure unique contacts per user
 */
contactSchema.index({ userId: 1, phone: 1 }, { unique: true });

/**
 * Pre-save middleware to ensure only one primary contact per user
 */
contactSchema.pre('save', async function(next) {
  if (!this.isModified('isPrimary') || !this.isPrimary) {
    return next();
  }

  try {
    await this.constructor.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { isPrimary: false }
    );
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Virtual to get user information
 */
contactSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

module.exports = mongoose.model('Contact', contactSchema);
