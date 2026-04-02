/**
 * Centralized Error Handling Middleware
 * Provides consistent error responses across the application
 */

/**
 * Custom Error Classes
 */
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error Handler
 * Handles Mongoose and Express Validator errors
 */
const handleValidationError = (err) => {
  let errors = [];
  
  if (err.name === 'ValidationError') {
    // Mongoose validation errors
    errors = Object.values(err.errors).map(val => ({
      field: val.path,
      message: val.message
    }));
  } else if (err.errors) {
    // Express Validator errors
    errors = Object.values(err.errors);
  }

  return new AppError(`Validation failed: ${errors.map(e => e.message).join(', ')}`, 400);
};

/**
 * Duplicate Key Error Handler
 * Handles MongoDB duplicate key errors
 */
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  
  return new AppError(`Duplicate field value: ${field} with value: ${value}. Please use another value.`, 400);
};

/**
 * Cast Error Handler
 * Handles MongoDB cast errors (invalid ObjectID, etc.)
 */
const handleCastError = (err) => {
  return new AppError(`Invalid ${err.path}: ${err.value}`, 400);
};

/**
 * JWT Error Handler
 * Handles JWT related errors
 */
const handleJWTError = () => {
  return new AppError('Invalid token. Please log in again.', 401);
};

/**
 * JWT Expired Error Handler
 */
const handleJWTExpiredError = () => {
  return new AppError('Your token has expired. Please log in again.', 401);
};

/**
 * Development Error Response
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

/**
 * Production Error Response
 */
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  } else {
    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err);
    
    res.status(500).json({
      success: false,
      message: 'Something went wrong!'
    });
  }
};

/**
 * Global Error Handler Middleware
 */
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (error.name === 'ValidationError' || error.errors) {
      error = handleValidationError(error);
    } else if (error.code === 11000) {
      error = handleDuplicateKeyError(error);
    } else if (error.name === 'CastError') {
      error = handleCastError(error);
    } else if (error.name === 'JsonWebTokenError') {
      error = handleJWTError();
    } else if (error.name === 'TokenExpiredError') {
      error = handleJWTExpiredError();
    }

    sendErrorProd(error, res);
  }
};

/**
 * 404 Not Found Handler
 */
const notFound = (req, res, next) => {
  const err = new AppError(`Can't find ${req.originalUrl} on this server!`, 404);
  next(err);
};

/**
 * Async Error Wrapper
 * Wraps async functions to automatically catch errors
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * Error Logging Utility
 */
const logError = (err, req) => {
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  AppError,
  globalErrorHandler,
  notFound,
  catchAsync,
  logError
};
