const express = require('express');
const router = express.Router();

const tripController = require('../controllers/tripController');
const { authenticate } = require('../middleware/auth');
const { validateSOSTrigger } = require('../middleware/validation');

/**
 * SOS (Emergency) Routes
 * Handles manual emergency triggers and SOS functionality
 */

/**
 * @route   POST /api/sos/manual
 * @desc    Manually trigger SOS emergency
 * @access  Private
 */
router.post('/manual', authenticate, validateSOSTrigger, tripController.triggerSOS);

module.exports = router;
