const mongoose = require('mongoose');

/**
 * Alert Schema for emergency notifications
 * Stores alert history and notification status
 */
const alertSchema = new mongoose.Schema({
  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: [true, 'Trip ID is required']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  type: {
    type: String,
    required: [true, 'Alert type is required'],
    enum: ['AUTOMATIC', 'MANUAL', 'DELAY_DETECTED', 'LOCATION_TIMEOUT'],
    default: 'AUTOMATIC'
  },
  severity: {
    type: String,
    required: [true, 'Severity level is required'],
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'HIGH'
  },
  status: {
    type: String,
    required: [true, 'Alert status is required'],
    enum: ['PENDING', 'SENT', 'DELIVERED', 'ACKNOWLEDGED', 'RESOLVED'],
    default: 'PENDING'
  },
  message: {
    type: String,
    required: [true, 'Alert message is required'],
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  locationAtTrigger: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    },
    address: {
      type: String
    }
  },
  contactsNotified: [{
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact'
    },
    phone: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['PENDING', 'SENT', 'DELIVERED', 'FAILED'],
      default: 'PENDING'
    },
    sentAt: {
      type: Date
    },
    deliveryAttempts: {
      type: Number,
      default: 0
    }
  }],
  notificationChannels: [{
    type: {
      type: String,
      enum: ['SMS', 'EMAIL', 'PUSH', 'WHATSAPP'],
      required: true
    },
    status: {
      type: String,
      enum: ['PENDING', 'SENT', 'DELIVERED', 'FAILED'],
      default: 'PENDING'
    },
    sentAt: {
      type: Date
    },
    response: {
      type: String
    }
  }],
  resolvedAt: {
    type: Date,
    default: null
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  resolutionNotes: {
    type: String,
    maxlength: [500, 'Resolution notes cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

/**
 * Index for efficient alert queries
 */
alertSchema.index({ tripId: 1, createdAt: -1 });
alertSchema.index({ userId: 1, status: 1, createdAt: -1 });
alertSchema.index({ status: 1, createdAt: -1 });

/**
 * Virtual to get trip information
 */
alertSchema.virtual('trip', {
  ref: 'Trip',
  localField: 'tripId',
  foreignField: '_id',
  justOne: true
});

/**
 * Virtual to get user information
 */
alertSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

/**
 * Method to add contact to notification list
 * @param {Object} contact - Contact object with phone and contactId
 */
alertSchema.methods.addContactToNotify = function(contact) {
  const existingContact = this.contactsNotified.find(
    c => c.phone === contact.phone
  );
  
  if (!existingContact) {
    this.contactsNotified.push({
      contactId: contact._id || null,
      phone: contact.phone,
      status: 'PENDING'
    });
  }
  
  return this.save();
};

/**
 * Method to update contact notification status
 * @param {string} phone - Contact phone number
 * @param {string} status - New status
 */
alertSchema.methods.updateContactStatus = function(phone, status) {
  const contact = this.contactsNotified.find(c => c.phone === phone);
  if (contact) {
    contact.status = status;
    if (status === 'SENT') {
      contact.sentAt = new Date();
    }
    contact.deliveryAttempts += 1;
  }
  
  return this.save();
};

/**
 * Method to resolve alert
 * @param {string} userId - User ID resolving the alert
 * @param {string} notes - Resolution notes
 */
alertSchema.methods.resolve = function(userId, notes) {
  this.status = 'RESOLVED';
  this.resolvedAt = new Date();
  this.resolvedBy = userId;
  this.resolutionNotes = notes;
  
  return this.save();
};

/**
 * Method to check if all contacts have been notified
 */
alertSchema.methods.isFullyNotified = function() {
  const pendingContacts = this.contactsNotified.filter(
    c => c.status === 'PENDING'
  );
  return pendingContacts.length === 0;
};

module.exports = mongoose.model('Alert', alertSchema);
