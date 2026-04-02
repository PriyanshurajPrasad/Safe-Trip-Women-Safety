const express = require('express');
const router = express.Router();

/**
 * Main API Routes Index
 * Consolidates all route modules
 */

// Import route modules
const authRoutes = require('./auth');
const contactRoutes = require('./contacts');
const tripRoutes = require('./trips');
const sosRoutes = require('./sos');

/**
 * @route   GET /api/health
 * @desc    API health check endpoint
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SafeCheck API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

/**
 * @route   GET /api
 * @desc    API information and available endpoints
 * @access  Public
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SafeCheck Women\'s Safety API',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register new user',
        'POST /api/auth/login': 'User login',
        'GET /api/auth/profile': 'Get user profile',
        'PATCH /api/auth/profile': 'Update user profile',
        'PATCH /api/auth/change-password': 'Change password',
        'POST /api/auth/logout': 'User logout',
        'POST /api/auth/refresh': 'Refresh JWT token',
        'DELETE /api/auth/delete-account': 'Delete user account'
      },
      contacts: {
        'GET /api/contacts': 'Get all contacts',
        'GET /api/contacts/emergency-list': 'Get emergency contacts list',
        'GET /api/contacts/primary': 'Get primary contact',
        'GET /api/contacts/:id': 'Get single contact',
        'POST /api/contacts': 'Create new contact',
        'PATCH /api/contacts/:id': 'Update contact',
        'DELETE /api/contacts/:id': 'Delete contact',
        'PATCH /api/contacts/:id/set-primary': 'Set primary contact',
        'PATCH /api/contacts/update-priorities': 'Update priorities'
      },
      trips: {
        'GET /api/trips': 'Get all trips',
        'GET /api/trips/active': 'Get active trip',
        'GET /api/trips/history': 'Get trip history',
        'GET /api/trips/statistics': 'Get trip statistics',
        'GET /api/trips/:id': 'Get single trip',
        'POST /api/trips/start': 'Start new trip',
        'PATCH /api/trips/:id/update-location': 'Update location',
        'PATCH /api/trips/:id/extend': 'Extend trip',
        'POST /api/trips/:id/confirm-safe': 'Confirm safety',
        'DELETE /api/trips/:id/cancel': 'Cancel trip'
      },
      sos: {
        'POST /api/sos/manual': 'Manual SOS trigger'
      }
    }
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/contacts', contactRoutes);
router.use('/trips', tripRoutes);
router.use('/sos', sosRoutes);

module.exports = router;
