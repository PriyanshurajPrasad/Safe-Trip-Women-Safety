const Trip = require('../models/Trip');
const Alert = require('../models/Alert');
const Contact = require('../models/Contact');
const { catchAsync } = require('../middleware/errorHandler');

/**
 * Trip Controller
 * Handles trip management, location updates, and monitoring
 */

/**
 * Get all trips for a user
 * @route GET /api/trips
 * @access Private
 */
const getTrips = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const skip = (page - 1) * limit;

  // Build query
  const query = { userId: req.user._id };
  
  if (status) {
    query.status = status;
  }

  const trips = await Trip.find(query)
    .sort({ startTime: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('user', 'name email phone');

  const total = await Trip.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      trips,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * Get a single trip by ID
 * @route GET /api/trips/:id
 * @access Private
 */
const getTrip = catchAsync(async (req, res) => {
  const trip = await Trip.findOne({
    _id: req.params.id,
    userId: req.user._id
  })
  .populate('user', 'name email phone');

  if (!trip) {
    return res.status(404).json({
      success: false,
      message: 'Trip not found'
    });
  }

  res.status(200).json({
    success: true,
    data: {
      trip
    }
  });
});

/**
 * Start a new trip
 * @route POST /api/trips/start
 * @access Private
 */
const startTrip = catchAsync(async (req, res) => {
  const {
    source,
    destination,
    estimatedArrivalTime,
    gracePeriodMinutes = 5,
    notes
  } = req.body;

  // Check if user has an active trip
  const activeTrip = await Trip.findOne({
    userId: req.user._id,
    status: 'ACTIVE'
  });

  if (activeTrip) {
    return res.status(400).json({
      success: false,
      message: 'You already have an active trip. Please complete it before starting a new one.'
    });
  }

  // Create new trip
  const trip = new Trip({
    userId: req.user._id,
    source: {
      type: 'Point',
      coordinates: source.coordinates, // [longitude, latitude]
      address: source.address
    },
    destination: {
      type: 'Point',
      coordinates: destination.coordinates, // [longitude, latitude]
      address: destination.address
    },
    currentCoordinates: {
      type: 'Point',
      coordinates: source.coordinates,
      lastUpdated: new Date()
    },
    estimatedArrivalTime: new Date(estimatedArrivalTime),
    gracePeriodMinutes,
    notes
  });

  await trip.save();

  // Populate user data
  await trip.populate('user', 'name email phone');

  res.status(201).json({
    success: true,
    message: 'Trip started successfully',
    data: {
      trip
    }
  });
});

/**
 * Update current location during trip
 * @route PATCH /api/trips/:id/update-location
 * @access Private
 */
const updateLocation = catchAsync(async (req, res) => {
  const { coordinates } = req.body;

  const trip = await Trip.findOne({
    _id: req.params.id,
    userId: req.user._id,
    status: 'ACTIVE'
  });

  if (!trip) {
    return res.status(404).json({
      success: false,
      message: 'Active trip not found'
    });
  }

  // Update location
  await trip.updateLocation(coordinates);

  res.status(200).json({
    success: true,
    message: 'Location updated successfully',
    data: {
      trip
    }
  });
});

/**
 * Extend trip ETA
 * @route PATCH /api/trips/:id/extend
 * @access Private
 */
const extendTrip = catchAsync(async (req, res) => {
  const { additionalMinutes } = req.body;

  const trip = await Trip.findOne({
    _id: req.params.id,
    userId: req.user._id,
    status: 'ACTIVE'
  });

  if (!trip) {
    return res.status(404).json({
      success: false,
      message: 'Active trip not found'
    });
  }

  // Extend ETA
  const newETA = new Date(trip.estimatedArrivalTime);
  newETA.setMinutes(newETA.getMinutes() + additionalMinutes);
  
  trip.estimatedArrivalTime = newETA;
  await trip.save();

  res.status(200).json({
    success: true,
    message: `Trip extended by ${additionalMinutes} minutes`,
    data: {
      trip
    }
  });
});

/**
 * Confirm trip safety (mark as completed)
 * @route POST /api/trips/:id/confirm-safe
 * @access Private
 */
const confirmSafe = catchAsync(async (req, res) => {
  const trip = await Trip.findOne({
    _id: req.params.id,
    userId: req.user._id,
    status: 'ACTIVE'
  });

  if (!trip) {
    return res.status(404).json({
      success: false,
      message: 'Active trip not found'
    });
  }

  // Mark trip as completed
  await trip.markCompleted();

  // Resolve any pending alerts for this trip
  await Alert.updateMany(
    { tripId: trip._id, status: { $in: ['PENDING', 'SENT', 'DELIVERED'] } },
    { 
      status: 'RESOLVED',
      resolvedAt: new Date(),
      resolvedBy: req.user._id,
      resolutionNotes: 'Trip completed safely by user'
    }
  );

  res.status(200).json({
    success: true,
    message: 'Trip marked as completed successfully',
    data: {
      trip
    }
  });
});

/**
 * Cancel trip
 * @route DELETE /api/trips/:id/cancel
 * @access Private
 */
const cancelTrip = catchAsync(async (req, res) => {
  const trip = await Trip.findOne({
    _id: req.params.id,
    userId: req.user._id,
    status: 'ACTIVE'
  });

  if (!trip) {
    return res.status(404).json({
      success: false,
      message: 'Active trip not found'
    });
  }

  trip.status = 'CANCELLED';
  await trip.save();

  // Resolve any pending alerts for this trip
  await Alert.updateMany(
    { tripId: trip._id, status: { $in: ['PENDING', 'SENT', 'DELIVERED'] } },
    { 
      status: 'RESOLVED',
      resolvedAt: new Date(),
      resolvedBy: req.user._id,
      resolutionNotes: 'Trip cancelled by user'
    }
  );

  res.status(200).json({
    success: true,
    message: 'Trip cancelled successfully',
    data: {
      trip
    }
  });
});

/**
 * Get active trip
 * @route GET /api/trips/active
 * @access Private
 */
const getActiveTrip = catchAsync(async (req, res) => {
  const trip = await Trip.findOne({
    userId: req.user._id,
    status: 'ACTIVE'
  })
  .populate('user', 'name email phone');

  if (!trip) {
    return res.status(404).json({
      success: false,
      message: 'No active trip found'
    });
  }

  res.status(200).json({
    success: true,
    data: {
      trip
    }
  });
});

/**
 * Get trip history
 * @route GET /api/trips/history
 * @access Private
 */
const getTripHistory = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, startDate, endDate } = req.query;
  const skip = (page - 1) * limit;

  // Build query
  const query = { 
    userId: req.user._id,
    status: { $in: ['COMPLETED', 'CANCELLED', 'EMERGENCY_TRIGGERED'] }
  };

  // Add date range filter
  if (startDate || endDate) {
    query.startTime = {};
    if (startDate) query.startTime.$gte = new Date(startDate);
    if (endDate) query.startTime.$lte = new Date(endDate);
  }

  const trips = await Trip.find(query)
    .sort({ startTime: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('user', 'name email phone');

  const total = await Trip.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      trips,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * Get trip statistics
 * @route GET /api/trips/statistics
 * @access Private
 */
const getTripStatistics = catchAsync(async (req, res) => {
  const userId = req.user._id;

  const stats = await Trip.aggregate([
    { $match: { userId: userId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgDistance: { $avg: '$distanceTraveled' },
        totalDistance: { $sum: '$distanceTraveled' }
      }
    }
  ]);

  const totalTrips = await Trip.countDocuments({ userId });
  const activeTrips = await Trip.countDocuments({ userId, status: 'ACTIVE' });

  // Format statistics
  const statistics = {
    totalTrips,
    activeTrips,
    byStatus: stats.reduce((acc, stat) => {
      acc[stat._id] = {
        count: stat.count,
        avgDistance: Math.round(stat.avgDistance),
        totalDistance: Math.round(stat.totalDistance)
      };
      return acc;
    }, {})
  };

  res.status(200).json({
    success: true,
    data: {
      statistics
    }
  });
});

/**
 * Manual SOS trigger
 * @route POST /api/sos/manual
 * @access Private
 */
const triggerSOS = catchAsync(async (req, res) => {
  const { reason, location } = req.body;

  // Find active trip
  const trip = await Trip.findOne({
    userId: req.user._id,
    status: 'ACTIVE'
  });

  if (!trip) {
    return res.status(404).json({
      success: false,
      message: 'No active trip found. Please start a trip first.'
    });
  }

  // Trigger emergency on trip
  await trip.triggerEmergency();

  // Get user's emergency contacts
  const contacts = await Contact.find({
    userId: req.user._id,
    isActive: true
  }).sort({ isPrimary: -1, priorityLevel: 1 });

  // Create emergency alert
  const alert = new Alert({
    tripId: trip._id,
    userId: req.user._id,
    type: 'MANUAL',
    severity: 'CRITICAL',
    status: 'PENDING',
    message: reason || 'Manual SOS triggered by user',
    locationAtTrigger: {
      type: 'Point',
      coordinates: location?.coordinates || trip.currentCoordinates.coordinates,
      address: location?.address || 'Current location'
    }
  });

  // Add contacts to notification list
  contacts.forEach(contact => {
    alert.addContactToNotify({
      _id: contact._id,
      phone: contact.phone
    });
  });

  await alert.save();

  // TODO: Integrate with notification service
  // This would trigger SMS/email notifications to contacts

  res.status(200).json({
    success: true,
    message: 'SOS triggered successfully. Emergency contacts have been notified.',
    data: {
      trip,
      alert
    }
  });
});

module.exports = {
  getTrips,
  getTrip,
  startTrip,
  updateLocation,
  extendTrip,
  confirmSafe,
  cancelTrip,
  getActiveTrip,
  getTripHistory,
  getTripStatistics,
  triggerSOS
};
