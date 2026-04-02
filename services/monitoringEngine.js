const cron = require('node-cron');
const Trip = require('../models/Trip');
const Alert = require('../models/Alert');
const Contact = require('../models/Contact');
const User = require('../models/User');

/**
 * Monitoring Engine Service
 * Core service for real-time trip monitoring and automated emergency detection
 */

class MonitoringEngine {
  constructor() {
    this.isRunning = false;
    this.monitoringInterval = null;
    this.checkInterval = parseInt(process.env.MONITORING_INTERVAL_MS) || 60000; // 1 minute default
  }

  /**
   * Start the monitoring engine
   */
  start() {
    if (this.isRunning) {
      console.log('Monitoring engine is already running');
      return;
    }

    console.log('Starting SafeCheck Monitoring Engine...');
    this.isRunning = true;

    // Schedule monitoring job every minute
    this.monitoringInterval = cron.schedule('* * * * *', () => {
      this.monitorActiveTrips();
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    console.log(`Monitoring engine started. Checking trips every ${this.checkInterval / 1000} seconds.`);
  }

  /**
   * Stop the monitoring engine
   */
  stop() {
    if (!this.isRunning) {
      console.log('Monitoring engine is not running');
      return;
    }

    console.log('Stopping SafeCheck Monitoring Engine...');
    this.isRunning = false;

    if (this.monitoringInterval) {
      this.monitoringInterval.stop();
      this.monitoringInterval = null;
    }

    console.log('Monitoring engine stopped');
  }

  /**
   * Monitor all active trips and check for overdue trips
   */
  async monitorActiveTrips() {
    try {
      console.log('Monitoring active trips...', new Date().toISOString());

      // Find all active trips
      const activeTrips = await Trip.find({ status: 'ACTIVE' })
        .populate('userId', 'name email phone')
        .lean();

      if (activeTrips.length === 0) {
        console.log('No active trips found');
        return;
      }

      console.log(`Found ${activeTrips.length} active trips`);

      // Check each trip for overdue status
      const overdueTrips = [];
      for (const trip of activeTrips) {
        if (this.isTripOverdue(trip)) {
          overdueTrips.push(trip);
        }
      }

      if (overdueTrips.length > 0) {
        console.log(`Found ${overdueTrips.length} overdue trips. Triggering emergency protocols...`);
        await this.handleOverdueTrips(overdueTrips);
      }

    } catch (error) {
      console.error('Error in monitoring engine:', error);
    }
  }

  /**
   * Check if a trip is overdue
   * @param {Object} trip - Trip object
   * @returns {boolean} - True if trip is overdue
   */
  isTripOverdue(trip) {
    const now = new Date();
    const estimatedArrival = new Date(trip.estimatedArrivalTime);
    const deadline = new Date(estimatedArrival);
    deadline.setMinutes(deadline.getMinutes() + (trip.gracePeriodMinutes || 5));

    return now > deadline;
  }

  /**
   * Handle overdue trips by triggering emergency alerts
   * @param {Array} overdueTrips - Array of overdue trip objects
   */
  async handleOverdueTrips(overdueTrips) {
    for (const trip of overdueTrips) {
      try {
        // Update trip status to emergency triggered
        await Trip.findByIdAndUpdate(trip._id, {
          status: 'EMERGENCY_TRIGGERED',
          emergencyTriggeredAt: new Date()
        });

        // Generate emergency payload and create alert
        await this.generateEmergencyAlert(trip);

        console.log(`Emergency triggered for trip ${trip._id} (User: ${trip.userId.name})`);
      } catch (error) {
        console.error(`Error handling overdue trip ${trip._id}:`, error);
      }
    }
  }

  /**
   * Generate emergency alert and notify contacts
   * @param {Object} trip - Trip object
   */
  async generateEmergencyAlert(trip) {
    try {
      // Get user's emergency contacts
      const contacts = await Contact.find({
        userId: trip.userId._id,
        isActive: true
      }).sort({ isPrimary: -1, priorityLevel: 1 });

      if (contacts.length === 0) {
        console.warn(`No emergency contacts found for user ${trip.userId._id}`);
        return;
      }

      // Create emergency alert
      const alert = new Alert({
        tripId: trip._id,
        userId: trip.userId._id,
        type: 'AUTOMATIC',
        severity: 'HIGH',
        status: 'PENDING',
        message: `Emergency alert: Trip overdue. ETA was ${trip.estimatedArrivalTime} with ${trip.gracePeriodMinutes} minute grace period.`,
        locationAtTrigger: {
          type: 'Point',
          coordinates: trip.currentCoordinates.coordinates,
          address: 'Last known location'
        }
      });

      // Add contacts to notification list
      contacts.forEach(contact => {
        alert.contactsNotified.push({
          contactId: contact._id,
          phone: contact.phone,
          status: 'PENDING',
          deliveryAttempts: 0
        });
      });

      await alert.save();

      // Trigger notifications
      await this.sendEmergencyNotifications(alert, trip, contacts);

    } catch (error) {
      console.error('Error generating emergency alert:', error);
    }
  }

  /**
   * Send emergency notifications to contacts
   * @param {Object} alert - Alert object
   * @param {Object} trip - Trip object
   * @param {Array} contacts - Array of contact objects
   */
  async sendEmergencyNotifications(alert, trip, contacts) {
    console.log(`Sending emergency notifications to ${contacts.length} contacts...`);

    for (const contact of contacts) {
      try {
        // Generate emergency message
        const message = this.generateEmergencyMessage(trip, contact);

        // TODO: Integrate with actual SMS/Email service
        // For now, we'll simulate the notification
        await this.simulateNotification(contact, message);

        // Update alert with notification status
        await Alert.findByIdAndUpdate(alert._id, {
          $push: {
            notificationChannels: {
              type: 'SMS',
              status: 'SENT',
              sentAt: new Date(),
              response: 'Notification sent successfully'
            }
          }
        });

        // Update contact notification status
        await Alert.findOneAndUpdate(
          { _id: alert._id, 'contactsNotified.phone': contact.phone },
          {
            $set: {
              'contactsNotified.$.status': 'SENT',
              'contactsNotified.$.sentAt': new Date(),
              'contactsNotified.$.deliveryAttempts': 1
            }
          }
        );

        console.log(`Emergency notification sent to ${contact.name} (${contact.phone})`);

      } catch (error) {
        console.error(`Error sending notification to ${contact.phone}:`, error);

        // Mark notification as failed
        await Alert.findOneAndUpdate(
          { _id: alert._id, 'contactsNotified.phone': contact.phone },
          {
            $set: { 'contactsNotified.$.status': 'FAILED' },
            $inc: { 'contactsNotified.$.deliveryAttempts': 1 }
          }
        );
      }
    }

    // Update overall alert status
    await Alert.findByIdAndUpdate(alert._id, { status: 'SENT' });
  }

  /**
   * Generate emergency message for contact
   * @param {Object} trip - Trip object
   * @param {Object} contact - Contact object
   * @returns {string} - Emergency message
   */
  generateEmergencyMessage(trip, contact) {
    const userName = trip.userId.name;
    const lastLocation = this.formatLocation(trip.currentCoordinates.coordinates);
    const destination = trip.destination.address;
    const eta = new Date(trip.estimatedArrivalTime).toLocaleString();

    return `🚨 SAFECHECK EMERGENCY ALERT 🚨\n\n` +
           `${userName} has not reached their destination and is overdue!\n\n` +
           `📍 Last Known Location: ${lastLocation}\n` +
           `🎯 Destination: ${destination}\n` +
           `⏰ ETA was: ${eta}\n` +
           `⚠️ Grace period of ${trip.gracePeriodMinutes} minutes has passed\n\n` +
           `Please try to contact ${userName} immediately and check on their safety.\n\n` +
           `This is an automated SafeCheck emergency alert.`;
  }

  /**
   * Format coordinates for display
   * @param {Array} coordinates - [longitude, latitude]
   * @returns {string} - Formatted location string
   */
  formatLocation(coordinates) {
    const [lng, lat] = coordinates;
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }

  /**
   * Simulate notification sending (placeholder for real SMS/Email service)
   * @param {Object} contact - Contact object
   * @param {string} message - Message to send
   */
  async simulateNotification(contact, message) {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // In production, this would integrate with services like:
    // - Twilio (SMS)
    // - SendGrid (Email)
    // - WhatsApp Business API
    // - Push notification services

    console.log(`[SIMULATION] SMS sent to ${contact.phone}:`, message.substring(0, 100) + '...');
  }

  /**
   * Get monitoring engine status
   * @returns {Object} - Engine status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      lastCheck: new Date().toISOString()
    };
  }

  /**
   * Manually trigger a check (for testing)
   */
  async triggerManualCheck() {
    console.log('Manual monitoring check triggered...');
    await this.monitorActiveTrips();
  }

  /**
   * Get active trips count
   * @returns {Promise<number>} - Number of active trips
   */
  async getActiveTripsCount() {
    return await Trip.countDocuments({ status: 'ACTIVE' });
  }

  /**
   * Get overdue trips count
   * @returns {Promise<number>} - Number of overdue trips
   */
  async getOverdueTripsCount() {
    const activeTrips = await Trip.find({ status: 'ACTIVE' }).lean();
    return activeTrips.filter(trip => this.isTripOverdue(trip)).length;
  }
}

// Create singleton instance
const monitoringEngine = new MonitoringEngine();

module.exports = monitoringEngine;
