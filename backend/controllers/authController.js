const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { catchAsync } = require('../middleware/errorHandler');

/**
 * Authentication Controller
 * Handles user registration, login, and token management
 */

/**
 * Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
const register = catchAsync(async (req, res) => {
  console.log('Registration request body:', req.body);
  const { name, email, phone, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { phone }]
  });

  if (existingUser) {
    if (existingUser.email === email) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered'
      });
    }
    if (existingUser.phone === phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is already registered'
      });
    }
  }

  // Create new user
  const user = new User({
    name,
    email,
    phone,
    password
  });

  await user.save();

  // Generate JWT token
  const token = generateToken(user._id);

  // Remove password from response
  user.password = undefined;

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user,
      token
    }
  });
});

/**
 * Login user
 * @route POST /api/auth/login
 * @access Public
 */
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  // Find user by email and include password
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  // Check if user is active
  if (!user.isActive) {
    return res.status(401).json({
      success: false,
      message: 'Account is deactivated. Please contact support.'
    });
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate JWT token
  const token = generateToken(user._id);

  // Remove password from response
  user.password = undefined;

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user,
      token
    }
  });
});

/**
 * Get current user profile
 * @route GET /api/auth/profile
 * @access Private
 */
const getProfile = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('contacts', 'name phone relation priorityLevel isPrimary')
    .populate('activeTrips', 'destination estimatedArrivalTime status');

  res.status(200).json({
    success: true,
    data: {
      user
    }
  });
});

/**
 * Update user profile
 * @route PATCH /api/auth/profile
 * @access Private
 */
const updateProfile = catchAsync(async (req, res) => {
  const allowedFields = ['name', 'phone', 'profilePictureUrl'];
  const updateData = {};

  // Only allow specific fields to be updated
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  // Check if phone is being updated and if it's already in use
  if (updateData.phone) {
    const existingUser = await User.findOne({
      phone: updateData.phone,
      _id: { $ne: req.user._id }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is already in use'
      });
    }
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updateData,
    { new: true, runValidators: true }
  ).populate('contacts', 'name phone relation priorityLevel isPrimary');

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user
    }
  });
});

/**
 * Change password
 * @route PATCH /api/auth/change-password
 * @access Private
 */
const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Verify current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);

  if (!isCurrentPasswordValid) {
    return res.status(400).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password changed successfully'
  });
});

/**
 * Logout user (client-side token removal)
 * @route POST /api/auth/logout
 * @access Private
 */
const logout = catchAsync(async (req, res) => {
  // In a stateless JWT system, logout is handled client-side
  // This endpoint can be used for logging or future token blacklisting
  res.status(200).json({
    success: true,
    message: 'Logout successful'
  });
});

/**
 * Refresh token
 * @route POST /api/auth/refresh
 * @access Private
 */
const refreshToken = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user || !user.isActive) {
    return res.status(401).json({
      success: false,
      message: 'User not found or inactive'
    });
  }

  // Generate new token
  const token = generateToken(user._id);

  res.status(200).json({
    success: true,
    message: 'Token refreshed successfully',
    data: {
      token
    }
  });
});

/**
 * Delete user account
 * @route DELETE /api/auth/delete-account
 * @access Private
 */
const deleteAccount = catchAsync(async (req, res) => {
  const { password } = req.body;

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Verify password
  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    return res.status(400).json({
      success: false,
      message: 'Password is incorrect'
    });
  }

  // Soft delete by deactivating account
  await User.findByIdAndUpdate(req.user._id, { isActive: false });

  res.status(200).json({
    success: true,
    message: 'Account deleted successfully'
  });
});

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  refreshToken,
  deleteAccount
};
