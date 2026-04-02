const Alert = require('../models/Alert');
const Trip = require('../models/Trip');
const Contact = require('../models/Contact');
const User = require('../models/User');

/**
 * Alert Service
 * Handles emergency alert logic and payload generation
 */

class AlertService {
  /**
   * Generate comprehensive emergency payload
   * @param {string} tripId - Trip ID
   * @returns {Promise<Object>} - Emergency payload
   */
  async generateEmergencyPayload(tripId) {
    try {
      // Get trip details
      const trip = await Trip.findById(tripId)
        .populate('userId', 'name email phone profilePictureUrl');

      if (!trip) {
        throw new Error('Trip not found');
      }

      // Get user's emergency contacts
      const contacts = await Contact.find({
        userId: trip.userId._id,
        isActive: true
      }).sort({ isPrimary: -1, priorityLevel: 1 });

      // Get recent alerts for this trip
      const recentAlerts = await Alert.find({ tripId })
        .sort({ createdAt: -1 })
        .limit(5);

      // Generate payload
      const payload = {
        emergency: {
          type: 'TRIP_OVERDUE',
          severity: 'HIGH',
          triggeredAt: new Date().toISOString(),
          tripId: trip._id,
          userId: trip.userId._id
        },
        user: {
          name: trip.userId.name,
          phone: trip.userId.phone,
          email: trip.userId.email,
          profilePictureUrl: trip.userId.profilePictureUrl
        },
        trip: {
          source: {
            address: trip.source.address,
            coordinates: trip.source.coordinates
          },
          destination: {
            address: trip.destination.address,
            coordinates: trip.destination.coordinates
          },
          currentLocation: {
            coordinates: trip.currentCoordinates.coordinates,
            lastUpdated: trip.currentCoordinates.lastUpdated
          },
          startTime: trip.startTime,
          estimatedArrivalTime: trip.estimatedArrivalTime,
          gracePeriodMinutes: trip.gracePeriodMinutes,
          distanceTraveled: trip.distanceTraveled,
          notes: trip.notes
        },
        contacts: contacts.map(contact => ({
          id: contact._id,
          name: contact.name,
          phone: contact.phone,
          relation: contact.relation,
          priorityLevel: contact.priorityLevel,
          isPrimary: contact.isPrimary
        })),
        timeline: {
          overdueDuration: this.calculateOverdueDuration(trip),
          lastLocationUpdate: trip.lastLocationUpdate,
          emergencyTriggeredAt: trip.emergencyTriggeredAt
        },
        recentAlerts: recentAlerts.map(alert => ({
          id: alert._id,
          type: alert.type,
          severity: alert.severity,
          status: alert.status,
          createdAt: alert.createdAt,
          message: alert.message
        })),
        metadata: {
          generatedAt: new Date().toISOString(),
          version: '1.0',
          system: 'SafeCheck'
        }
      };

      return payload;
    } catch (error) {
      console.error('Error generating emergency payload:', error);
      throw error;
    }
  }

  /**
   * Calculate how long the trip has been overdue
   * @param {Object} trip - Trip object
   * @returns {number} - Overdue duration in minutes
   */
  calculateOverdueDuration(trip) {
    const now = new Date();
    const estimatedArrival = new Date(trip.estimatedArrivalTime);
    const deadline = new Date(estimatedArrival);
    deadline.setMinutes(deadline.getMinutes() + (trip.gracePeriodMinutes || 5));

    return Math.max(0, Math.floor((now - deadline) / (1000 * 60)));
  }

  /**
   * Create alert with full payload
   * @param {string} tripId - Trip ID
   * @param {string} type - Alert type
   * @param {string} message - Alert message
   * @param {string} severity - Alert severity
   * @returns {Promise<Object>} - Created alert
   */
  async createAlert(tripId, type, message, severity = 'HIGH') {
    try {
      const trip = await Trip.findById(tripId);
      if (!trip) {
        throw new Error('Trip not found');
      }

      const alert = new Alert({
        tripId,
        userId: trip.userId,
        type,
        severity,
        status: 'PENDING',
        message,
        locationAtTrigger: {
          type: 'Point',
          coordinates: trip.currentCoordinates.coordinates,
          address: 'Current location'
        }
      });

      // Add user's contacts to notification list
      const contacts = await Contact.find({
        userId: trip.userId,
        isActive: true
      }).sort({ isPrimary: -1, priorityLevel: 1 });

      contacts.forEach(contact => {
        alert.contactsNotified.push({
          contactId: contact._id,
          phone: contact.phone,
          status: 'PENDING',
          deliveryAttempts: 0
        });
      });

      await alert.save();
      return alert;
    } catch (error) {
      console.error('Error creating alert:', error);
      throw error;
    }
  }

  /**
   * Send emergency notifications via multiple channels
   * @param {Object} alert - Alert object
   * @param {Object} payload - Emergency payload
   * @returns {Promise<Object>} - Notification results
   */
  async sendEmergencyNotifications(alert, payload) {
    const results = {
      sms: { sent: 0, failed: 0 },
      email: { sent: 0, failed: 0 },
      push: { sent: 0, failed: 0 }
    };

    for (const contact of payload.contacts) {
      try {
        // Send SMS notification
        const smsResult = await this.sendSMSNotification(contact, payload);
        if (smsResult.success) {
          results.sms.sent++;
          await this.updateContactNotificationStatus(alert._id, contact.phone, 'SMS', 'SENT');
        } else {
          results.sms.failed++;
          await this.updateContactNotificationStatus(alert._id, contact.phone, 'SMS', 'FAILED');
        }

        // Send email notification (if available)
        if (contact.email) {
          const emailResult = await this.sendEmailNotification(contact, payload);
          if (emailResult.success) {
            results.email.sent++;
          } else {
            results.email.failed++;
          }
        }

      } catch (error) {
        console.error(`Error sending notifications to ${contact.name}:`, error);
        results.sms.failed++;
      }
    }

    // Update alert status
    const totalSent = results.sms.sent + results.email.sent + results.push.sent;
    const totalFailed = results.sms.failed + results.email.failed + results.push.failed;

    if (totalSent > 0 && totalFailed === 0) {
      alert.status = 'DELIVERED';
    } else if (totalSent > 0) {
      alert.status = 'SENT';
    } else {
      alert.status = 'FAILED';
    }

    await alert.save();
    return results;
  }

  /**
   * Send SMS notification
   * @param {Object} contact - Contact object
   * @param {Object} payload - Emergency payload
   * @returns {Promise<Object>} - Send result
   */
  async sendSMSNotification(contact, payload) {
    try {
      const message = this.formatSMSMessage(payload, contact);
      
      // TODO: Integrate with SMS service (Twilio, etc.)
      // For now, simulate the send
      await this.simulateSMS(contact.phone, message);

      return { success: true, messageId: `sms_${Date.now()}` };
    } catch (error) {
      console.error('SMS send error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send email notification
   * @param {Object} contact - Contact object
   * @param {Object} payload - Emergency payload
   * @returns {Promise<Object>} - Send result
   */
  async sendEmailNotification(contact, payload) {
    try {
      const emailContent = this.formatEmailMessage(payload, contact);
      
      // TODO: Integrate with email service (SendGrid, etc.)
      // For now, simulate the send
      await this.simulateEmail(contact.email, emailContent);

      return { success: true, messageId: `email_${Date.now()}` };
    } catch (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Format SMS message
   * @param {Object} payload - Emergency payload
   * @param {Object} contact - Contact object
   * @returns {string} - Formatted SMS message
   */
  formatSMSMessage(payload, contact) {
    const { user, trip, timeline } = payload;
    const overdueMinutes = timeline.overdueDuration;

    return `🚨 SAFECHECK EMERGENCY ALERT 🚨\n\n` +
           `${user.name} is OVERDUE!\n\n` +
           `📍 Last known: ${trip.currentLocation.coordinates[1]}, ${trip.currentLocation.coordinates[0]}\n` +
           `🎯 Destination: ${trip.destination.address}\n` +
           `⏰ Overdue by: ${overdueMinutes} minutes\n\n` +
           `Please contact ${user.name} immediately: ${user.phone}\n\n` +
           `This is an automated alert from SafeCheck.`;
  }

  /**
   * Format email message
   * @param {Object} payload - Emergency payload
   * @param {Object} contact - Contact object
   * @returns {Object} - Email content (subject and body)
   */
  formatEmailMessage(payload, contact) {
    const { user, trip, timeline } = payload;
    const overdueMinutes = timeline.overdueDuration;

    const subject = `🚨 SafeCheck Emergency Alert - ${user.name} is Overdue`;

    const body = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ff4444; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">🚨 EMERGENCY ALERT 🚨</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px;">SafeCheck Automatic Emergency Notification</p>
        </div>
        
        <div style="padding: 20px; background-color: #f9f9f9;">
          <h2>Trip Overdue Alert</h2>
          <p><strong>${user.name}</strong> has not reached their destination and is <strong>${overdueMinutes} minutes</strong> overdue.</p>
          
          <h3>Trip Details:</h3>
          <ul>
            <li><strong>From:</strong> ${trip.source.address}</li>
            <li><strong>To:</strong> ${trip.destination.address}</li>
            <li><strong>ETA was:</strong> ${new Date(trip.estimatedArrivalTime).toLocaleString()}</li>
            <li><strong>Grace Period:</strong> ${trip.gracePeriodMinutes} minutes</li>
            <li><strong>Last Known Location:</strong> ${trip.currentLocation.coordinates[1]}, ${trip.currentLocation.coordinates[0]}</li>
          </ul>
          
          <h3>Immediate Action Required:</h3>
          <p>Please try to contact <strong>${user.name}</strong> immediately:</p>
          <ul>
            <li>📱 Phone: ${user.phone}</li>
            <li>📧 Email: ${user.email}</li>
          </ul>
          
          <p>If you cannot reach them or are concerned about their safety, please:</p>
          <ol>
            <li>Contact other family members or friends</li>
            <li>Check their last known location</li>
            <li>Contact local authorities if necessary</li>
          </ol>
        </div>
        
        <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
          <p>This is an automated emergency alert from SafeCheck Women's Safety System.</p>
          <p>Alert generated at: ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `;

    return { subject, body };
  }

  /**
   * Simulate SMS send
   * @param {string} phone - Phone number
   * @param {string} message - SMS message
   */
  async simulateSMS(phone, message) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    console.log(`[SMS SIMULATION] To: ${phone}, Message: ${message.substring(0, 100)}...`);
  }

  /**
   * Simulate email send
   * @param {string} email - Email address
   * @param {Object} emailContent - Email content
   */
  async simulateEmail(email, emailContent) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log(`[EMAIL SIMULATION] To: ${email}, Subject: ${emailContent.subject}`);
  }

  /**
   * Update contact notification status
   * @param {string} alertId - Alert ID
   * @param {string} phone - Contact phone
   * @param {string} channel - Notification channel
   * @param {string} status - New status
   */
  async updateContactNotificationStatus(alertId, phone, channel, status) {
    try {
      await Alert.findOneAndUpdate(
        { 
          _id: alertId, 
          'contactsNotified.phone': phone 
        },
        {
          $set: {
            'contactsNotified.$.status': status,
            'contactsNotified.$.sentAt': new Date(),
            $inc: { 'contactsNotified.$.deliveryAttempts': 1 }
          },
          $push: {
            notificationChannels: {
              type: channel,
              status: status,
              sentAt: new Date()
            }
          }
        }
      );
    } catch (error) {
      console.error('Error updating notification status:', error);
    }
  }

  /**
   * Get alert statistics
   * @param {string} userId - User ID (optional)
   * @returns {Promise<Object>} - Alert statistics
   */
  async getAlertStatistics(userId = null) {
    const match = userId ? { userId } : {};

    const stats = await Alert.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const byType = await Alert.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    return {
      byStatus: stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      byType: byType.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    };
  }
}

module.exports = new AlertService();
