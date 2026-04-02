const express = require('express');
const router = express.Router();

const contactController = require('../controllers/contactController');
const { authenticate } = require('../middleware/auth');
const {
  validateContact,
  validateMongoId,
  validatePagination
} = require('../middleware/validation');

/**
 * Contact Management Routes
 * Handles CRUD operations for emergency contacts
 */

/**
 * @route   GET /api/contacts
 * @desc    Get all contacts for authenticated user
 * @access  Private
 */
router.get('/', authenticate, validatePagination, contactController.getContacts);

/**
 * @route   GET /api/contacts/emergency-list
 * @desc    Get emergency contact list sorted by priority
 * @access  Private
 */
router.get('/emergency-list', authenticate, contactController.getEmergencyContacts);

/**
 * @route   GET /api/contacts/primary
 * @desc    Get primary contact
 * @access  Private
 */
router.get('/primary', authenticate, contactController.getPrimaryContact);

/**
 * @route   GET /api/contacts/:id
 * @desc    Get single contact by ID
 * @access  Private
 */
router.get('/:id', authenticate, validateMongoId('id'), contactController.getContact);

/**
 * @route   POST /api/contacts
 * @desc    Create a new emergency contact
 * @access  Private
 */
router.post('/', authenticate, validateContact, contactController.createContact);

/**
 * @route   PATCH /api/contacts/:id
 * @desc    Update contact details
 * @access  Private
 */
router.patch('/:id', authenticate, validateMongoId('id'), validateContact, contactController.updateContact);

/**
 * @route   DELETE /api/contacts/:id
 * @desc    Delete (soft delete) contact
 * @access  Private
 */
router.delete('/:id', authenticate, validateMongoId('id'), contactController.deleteContact);

/**
 * @route   PATCH /api/contacts/:id/set-primary
 * @desc    Set contact as primary
 * @access  Private
 */
router.patch('/:id/set-primary', authenticate, validateMongoId('id'), contactController.setPrimaryContact);

/**
 * @route   PATCH /api/contacts/update-priorities
 * @desc    Bulk update contact priorities
 * @access  Private
 */
router.patch('/update-priorities', authenticate, contactController.updatePriorities);

module.exports = router;
