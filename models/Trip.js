const mongoose = require('mongoose');

/**
 * Trip Schema for SafeCheck monitoring system
 * Stores trip information and real-time monitoring data
 */
const tripSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  source: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: [true, 'Source coordinates are required'],
      validate: {
        validator: function(coords) {
          return coords.length === 2 && 
                 coords[0] >= -180 && coords[0] <= 180 && 
                 coords[1] >= -90 && coords[1] <= 90;
        },
        message: 'Invalid coordinates format'
      }
    },
    address: {
      type: String,
      required: [true, 'Source address is required'],
      trim: true
    }
  },
  destination: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: [true, 'Destination coordinates are required'],
      validate: {
        validator: function(coords) {
          return coords.length === 2 && 
                 coords[0] >= -180 && coords[0] <= 180 && 
                 coords[1] >= -90 && coords[1] <= 90;
        },
        message: 'Invalid coordinates format'
      }
    },
    address: {
      type: String,
      required: [true, 'Destination address is required'],
      trim: true
    }
  },
  currentCoordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: function() {
        return this.source.coordinates;
      },
      validate: {
        validator: function(coords) {
          return coords.length === 2 && 
                 coords[0] >= -180 && coords[0] <= 180 && 
                 coords[1] >= -90 && coords[1] <= 90;
        },
        message: 'Invalid coordinates format'
      }
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  startTime: {
    type: Date,
    required: [true, 'Start time is required'],
    default: Date.now
  },
  estimatedArrivalTime: {
    type: Date,
    required: [true, 'Estimated arrival time is required']
  },
  actualArrivalTime: {
    type: Date,
    default: null
  },
  gracePeriodMinutes: {
    type: Number,
    required: [true, 'Grace period is required'],
    min: 1,
    max: 60,
    default: 5
  },
  status: {
    type: String,
    required: [true, 'Trip status is required'],
    enum: ['ACTIVE', 'COMPLETED', 'DELAYED', 'EMERGENCY_TRIGGERED', 'CANCELLED'],
    default: 'ACTIVE'
  },
  emergencyTriggeredAt: {
    type: Date,
    default: null
  },
  lastLocationUpdate: {
    type: Date,
    default: Date.now
  },
  distanceTraveled: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

/**
 * Geospatial index for location queries
 */
tripSchema.index({ 'currentCoordinates.coordinates': '2dsphere' });
tripSchema.index({ 'destination.coordinates': '2dsphere' });
tripSchema.index({ 'source.coordinates': '2dsphere' });

/**
 * Compound index for active trips monitoring
 */
tripSchema.index({ userId: 1, status: 1, startTime: -1 });

/**
 * Virtual to check if trip is overdue
 */
tripSchema.virtual('isOverdue').get(function() {
  if (this.status !== 'ACTIVE') return false;
  
  const now = new Date();
  const deadline = new Date(this.estimatedArrivalTime);
  deadline.setMinutes(deadline.getMinutes() + this.gracePeriodMinutes);
  
  return now > deadline;
});

/**
 * Virtual to get remaining time until deadline
 */
tripSchema.virtual('timeUntilDeadline').get(function() {
  if (this.status !== 'ACTIVE') return 0;
  
  const now = new Date();
  const deadline = new Date(this.estimatedArrivalTime);
  deadline.setMinutes(deadline.getMinutes() + this.gracePeriodMinutes);
  
  return Math.max(0, deadline.getTime() - now.getTime());
});

/**
 * Virtual to get user information
 */
tripSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

/**
 * Pre-save middleware to validate estimated arrival time
 */
tripSchema.pre('save', function(next) {
  if (this.estimatedArrivalTime <= this.startTime) {
    return next(new Error('Estimated arrival time must be after start time'));
  }
  next();
});

/**
 * Method to update current location
 * @param {Array} coordinates - New coordinates [longitude, latitude]
 */
tripSchema.methods.updateLocation = function(coordinates) {
  this.currentCoordinates.coordinates = coordinates;
  this.currentCoordinates.lastUpdated = new Date();
  this.lastLocationUpdate = new Date();
  
  // Calculate distance traveled (simplified calculation)
  if (this.currentCoordinates.coordinates && coordinates) {
    const distance = this.calculateDistance(
      this.currentCoordinates.coordinates,
      coordinates
    );
    this.distanceTraveled += distance;
  }
  
  return this.save();
};

/**
 * Calculate distance between two coordinates (in meters)
 * @param {Array} coord1 - First coordinates [longitude, latitude]
 * @param {Array} coord2 - Second coordinates [longitude, latitude]
 * @returns {number} Distance in meters
 */
tripSchema.methods.calculateDistance = function(coord1, coord2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = coord1[1] * Math.PI / 180;
  const φ2 = coord2[1] * Math.PI / 180;
  const Δφ = (coord2[1] - coord1[1]) * Math.PI / 180;
  const Δλ = (coord2[0] - coord1[0]) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};

/**
 * Method to mark trip as completed
 */
tripSchema.methods.markCompleted = function() {
  this.status = 'COMPLETED';
  this.actualArrivalTime = new Date();
  return this.save();
};

/**
 * Method to trigger emergency
 */
tripSchema.methods.triggerEmergency = function() {
  this.status = 'EMERGENCY_TRIGGERED';
  this.emergencyTriggeredAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Trip', tripSchema);
