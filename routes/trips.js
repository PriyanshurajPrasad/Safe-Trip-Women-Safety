const express = require('express');
const router = express.Router();

const tripController = require('../controllers/tripController');
const { authenticate } = require('../middleware/auth');
const {
  validateTripCreation,
  validateLocationUpdate,
  validateTripExtension,
  validateMongoId,
  validatePagination
} = require('../middleware/validation');

/**
 * Trip Management Routes
 * Handles trip creation, monitoring, and management
 */

/**
 * @route   GET /api/trips
 * @desc    Get all trips for authenticated user
 * @access  Private
 */
router.get('/', authenticate, validatePagination, tripController.getTrips);

/**
 * @route   GET /api/trips/active
 * @desc    Get currently active trip
 * @access  Private
 */
router.get('/active', authenticate, tripController.getActiveTrip);

/**
 * @route   GET /api/trips/history
 * @desc    Get trip history
 * @access  Private
 */
router.get('/history', authenticate, validatePagination, tripController.getTripHistory);

/**
 * @route   GET /api/trips/statistics
 * @desc    Get trip statistics
 * @access  Private
 */
router.get('/statistics', authenticate, tripController.getTripStatistics);

/**
 * @route   GET /api/trips/:id
 * @desc    Get single trip by ID
 * @access  Private
 */
router.get('/:id', authenticate, validateMongoId('id'), tripController.getTrip);

/**
 * @route   POST /api/trips/start
 * @desc    Start a new trip
 * @access  Private
 */
router.post('/start', authenticate, validateTripCreation, tripController.startTrip);

/**
 * @route   PATCH /api/trips/:id/update-location
 * @desc    Update current location during trip
 * @access  Private
 */
router.patch('/:id/update-location', authenticate, validateMongoId('id'), validateLocationUpdate, tripController.updateLocation);

/**
 * @route   PATCH /api/trips/:id/extend
 * @desc    Extend trip ETA
 * @access  Private
 */
router.patch('/:id/extend', authenticate, validateMongoId('id'), validateTripExtension, tripController.extendTrip);

/**
 * @route   POST /api/trips/:id/confirm-safe
 * @desc    Confirm trip safety (mark as completed)
 * @access  Private
 */
router.post('/:id/confirm-safe', authenticate, validateMongoId('id'), tripController.confirmSafe);

/**
 * @route   DELETE /api/trips/:id/cancel
 * @desc    Cancel active trip
 * @access  Private
 */
router.delete('/:id/cancel', authenticate, validateMongoId('id'), tripController.cancelTrip);

module.exports = router;
