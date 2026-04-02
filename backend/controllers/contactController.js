const Contact = require('../models/Contact');
const { catchAsync } = require('../middleware/errorHandler');

/**
 * Contact Controller
 * Handles CRUD operations for emergency contacts
 */

/**
 * Get all contacts for a user
 * @route GET /api/contacts
 * @access Private
 */
const getContacts = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, priority } = req.query;
  const skip = (page - 1) * limit;

  // Build query
  const query = { userId: req.user._id, isActive: true };
  
  if (priority) {
    query.priorityLevel = parseInt(priority);
  }

  const contacts = await Contact.find(query)
    .sort({ priorityLevel: 1, name: 1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Contact.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      contacts,
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
 * Get a single contact by ID
 * @route GET /api/contacts/:id
 * @access Private
 */
const getContact = catchAsync(async (req, res) => {
  const contact = await Contact.findOne({
    _id: req.params.id,
    userId: req.user._id,
    isActive: true
  });

  if (!contact) {
    return res.status(404).json({
      success: false,
      message: 'Contact not found'
    });
  }

  res.status(200).json({
    success: true,
    data: {
      contact
    }
  });
});

/**
 * Create a new contact
 * @route POST /api/contacts
 * @access Private
 */
const createContact = catchAsync(async (req, res) => {
  const { name, phone, relation, priorityLevel, isPrimary } = req.body;

  // Check if contact with same phone already exists for this user
  const existingContact = await Contact.findOne({
    userId: req.user._id,
    phone,
    isActive: true
  });

  if (existingContact) {
    return res.status(400).json({
      success: false,
      message: 'A contact with this phone number already exists'
    });
  }

  // If setting as primary, unset other primary contacts
  if (isPrimary) {
    await Contact.updateMany(
      { userId: req.user._id, isActive: true },
      { isPrimary: false }
    );
  }

  const contact = new Contact({
    userId: req.user._id,
    name,
    phone,
    relation,
    priorityLevel,
    isPrimary: isPrimary || false
  });

  await contact.save();

  res.status(201).json({
    success: true,
    message: 'Contact created successfully',
    data: {
      contact
    }
  });
});

/**
 * Update a contact
 * @route PATCH /api/contacts/:id
 * @access Private
 */
const updateContact = catchAsync(async (req, res) => {
  const { name, phone, relation, priorityLevel, isPrimary } = req.body;

  // Find the contact
  const contact = await Contact.findOne({
    _id: req.params.id,
    userId: req.user._id,
    isActive: true
  });

  if (!contact) {
    return res.status(404).json({
      success: false,
      message: 'Contact not found'
    });
  }

  // Check if phone is being updated and if it's already in use
  if (phone && phone !== contact.phone) {
    const existingContact = await Contact.findOne({
      userId: req.user._id,
      phone,
      _id: { $ne: req.params.id },
      isActive: true
    });

    if (existingContact) {
      return res.status(400).json({
        success: false,
        message: 'A contact with this phone number already exists'
      });
    }
  }

  // If setting as primary, unset other primary contacts
  if (isPrimary && !contact.isPrimary) {
    await Contact.updateMany(
      { userId: req.user._id, _id: { $ne: req.params.id }, isActive: true },
      { isPrimary: false }
    );
  }

  // Update contact
  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (phone !== undefined) updateData.phone = phone;
  if (relation !== undefined) updateData.relation = relation;
  if (priorityLevel !== undefined) updateData.priorityLevel = priorityLevel;
  if (isPrimary !== undefined) updateData.isPrimary = isPrimary;

  const updatedContact = await Contact.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Contact updated successfully',
    data: {
      contact: updatedContact
    }
  });
});

/**
 * Delete a contact (soft delete)
 * @route DELETE /api/contacts/:id
 * @access Private
 */
const deleteContact = catchAsync(async (req, res) => {
  const contact = await Contact.findOne({
    _id: req.params.id,
    userId: req.user._id,
    isActive: true
  });

  if (!contact) {
    return res.status(404).json({
      success: false,
      message: 'Contact not found'
    });
  }

  // Soft delete by setting isActive to false
  await Contact.findByIdAndUpdate(req.params.id, { isActive: false });

  res.status(200).json({
    success: true,
    message: 'Contact deleted successfully'
  });
});

/**
 * Set contact as primary
 * @route PATCH /api/contacts/:id/set-primary
 * @access Private
 */
const setPrimaryContact = catchAsync(async (req, res) => {
  const contact = await Contact.findOne({
    _id: req.params.id,
    userId: req.user._id,
    isActive: true
  });

  if (!contact) {
    return res.status(404).json({
      success: false,
      message: 'Contact not found'
    });
  }

  // Unset all other primary contacts
  await Contact.updateMany(
    { userId: req.user._id, _id: { $ne: req.params.id }, isActive: true },
    { isPrimary: false }
  );

  // Set this contact as primary
  contact.isPrimary = true;
  await contact.save();

  res.status(200).json({
    success: true,
    message: 'Primary contact updated successfully',
    data: {
      contact
    }
  });
});

/**
 * Get primary contact
 * @route GET /api/contacts/primary
 * @access Private
 */
const getPrimaryContact = catchAsync(async (req, res) => {
  const contact = await Contact.findOne({
    userId: req.user._id,
    isPrimary: true,
    isActive: true
  });

  if (!contact) {
    return res.status(404).json({
      success: false,
      message: 'No primary contact found'
    });
  }

  res.status(200).json({
    success: true,
    data: {
      contact
    }
  });
});

/**
 * Get emergency contact list (sorted by priority)
 * @route GET /api/contacts/emergency-list
 * @access Private
 */
const getEmergencyContacts = catchAsync(async (req, res) => {
  const contacts = await Contact.find({
    userId: req.user._id,
    isActive: true
  })
  .sort({ isPrimary: -1, priorityLevel: 1, name: 1 });

  res.status(200).json({
    success: true,
    data: {
      contacts
    }
  });
});

/**
 * Bulk update contact priorities
 * @route PATCH /api/contacts/update-priorities
 * @access Private
 */
const updatePriorities = catchAsync(async (req, res) => {
  const { contacts } = req.body; // Array of { id, priorityLevel }

  if (!Array.isArray(contacts) || contacts.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Contacts array is required'
    });
  }

  // Validate each contact
  for (const contact of contacts) {
    if (!contact.id || !contact.priorityLevel) {
      return res.status(400).json({
        success: false,
        message: 'Each contact must have id and priorityLevel'
      });
    }

    if (contact.priorityLevel < 1 || contact.priorityLevel > 5) {
      return res.status(400).json({
        success: false,
        message: 'Priority level must be between 1 and 5'
      });
    }
  }

  // Update priorities in batch
  const updatePromises = contacts.map(({ id, priorityLevel }) =>
    Contact.findOneAndUpdate(
      { _id: id, userId: req.user._id, isActive: true },
      { priorityLevel },
      { new: true, runValidators: true }
    )
  );

  const updatedContacts = await Promise.all(updatePromises);

  res.status(200).json({
    success: true,
    message: 'Contact priorities updated successfully',
    data: {
      contacts: updatedContacts
    }
  });
});

module.exports = {
  getContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
  setPrimaryContact,
  getPrimaryContact,
  getEmergencyContacts,
  updatePriorities
};
