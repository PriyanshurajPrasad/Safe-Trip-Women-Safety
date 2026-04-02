const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation Result Handler Middleware
 * Processes validation results and returns formatted errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages
    });
  }
  
  next();
};

/**
 * User Registration Validation
 */
const validateUserRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('phone')
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage('Please provide a valid phone number')
    .isLength({ min: 10, max: 20 })
    .withMessage('Phone number must be between 10 and 20 characters'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  handleValidationErrors
];

/**
 * User Login Validation
 */
const validateUserLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

/**
 * Contact Creation/Update Validation
 */
const validateContact = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('phone')
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage('Please provide a valid phone number')
    .isLength({ min: 10, max: 20 })
    .withMessage('Phone number must be between 10 and 20 characters'),
  
  body('relation')
    .isIn(['FAMILY', 'FRIEND', 'COLLEAGUE', 'NEIGHBOR', 'SPOUSE', 'PARENT', 'SIBLING', 'OTHER'])
    .withMessage('Invalid relation type'),
  
  body('priorityLevel')
    .isInt({ min: 1, max: 5 })
    .withMessage('Priority level must be between 1 and 5'),
  
  handleValidationErrors
];

/**
 * Trip Creation Validation
 */
const validateTripCreation = [
  body('source.address')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Source address must be between 5 and 200 characters'),
  
  body('source.coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Source coordinates must be an array of [longitude, latitude]'),
  
  body('source.coordinates.*')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Coordinates must be valid decimal numbers'),
  
  body('destination.address')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Destination address must be between 5 and 200 characters'),
  
  body('destination.coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Destination coordinates must be an array of [longitude, latitude]'),
  
  body('destination.coordinates.*')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Coordinates must be valid decimal numbers'),
  
  body('estimatedArrivalTime')
    .isISO8601()
    .withMessage('Estimated arrival time must be a valid ISO date')
    .custom((value) => {
      const arrivalTime = new Date(value);
      const now = new Date();
      if (arrivalTime <= now) {
        throw new Error('Estimated arrival time must be in the future');
      }
      return true;
    }),
  
  body('gracePeriodMinutes')
    .optional()
    .isInt({ min: 1, max: 60 })
    .withMessage('Grace period must be between 1 and 60 minutes'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  
  handleValidationErrors
];

/**
 * Location Update Validation
 */
const validateLocationUpdate = [
  body('coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be an array of [longitude, latitude]'),
  
  body('coordinates.*')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Coordinates must be valid decimal numbers'),
  
  handleValidationErrors
];

/**
 * Trip Extension Validation
 */
const validateTripExtension = [
  body('additionalMinutes')
    .isInt({ min: 1, max: 120 })
    .withMessage('Additional time must be between 1 and 120 minutes'),
  
  handleValidationErrors
];

/**
 * MongoDB ID Validation
 */
const validateMongoId = (paramName = 'id') => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName} format`),
  
  handleValidationErrors
];

/**
 * Pagination Validation
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

/**
 * SOS Trigger Validation
 */
const validateSOSTrigger = [
  body('reason')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters'),
  
  body('location')
    .optional()
    .isObject()
    .withMessage('Location must be an object'),
  
  body('location.coordinates')
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage('Location coordinates must be an array of [longitude, latitude]'),
  
  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateContact,
  validateTripCreation,
  validateLocationUpdate,
  validateTripExtension,
  validateMongoId,
  validatePagination,
  validateSOSTrigger,
  handleValidationErrors
};
