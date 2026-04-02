# SafeCheck Women's Safety API

A production-grade REST API for women's safety featuring real-time trip monitoring and automated emergency alerts.

## 🚀 Features

- **Real-time Trip Monitoring**: Automatic tracking of user journeys with live location updates
- **Automated Emergency Detection**: Background monitoring engine that triggers alerts when trips are overdue
- **Emergency Contact Management**: Trusted contact system with priority-based notifications
- **Multi-channel Alerts**: SMS and email notifications for emergency situations
- **Secure Authentication**: JWT-based authentication with bcrypt password hashing
- **Comprehensive Validation**: Input sanitization and data validation throughout
- **Production Security**: Rate limiting, CORS, helmet security headers, and error handling

## 📋 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PATCH /api/auth/profile` - Update user profile
- `PATCH /api/auth/change-password` - Change password
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh JWT token
- `DELETE /api/auth/delete-account` - Delete user account

### Emergency Contacts
- `GET /api/contacts` - Get all contacts
- `GET /api/contacts/emergency-list` - Get emergency contacts list
- `GET /api/contacts/primary` - Get primary contact
- `GET /api/contacts/:id` - Get single contact
- `POST /api/contacts` - Create new contact
- `PATCH /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact
- `PATCH /api/contacts/:id/set-primary` - Set primary contact
- `PATCH /api/contacts/update-priorities` - Update priorities

### Trip Management
- `GET /api/trips` - Get all trips
- `GET /api/trips/active` - Get active trip
- `GET /api/trips/history` - Get trip history
- `GET /api/trips/statistics` - Get trip statistics
- `GET /api/trips/:id` - Get single trip
- `POST /api/trips/start` - Start new trip
- `PATCH /api/trips/:id/update-location` - Update location
- `PATCH /api/trips/:id/extend` - Extend trip
- `POST /api/trips/:id/confirm-safe` - Confirm safety
- `DELETE /api/trips/:id/cancel` - Cancel trip

### Emergency (SOS)
- `POST /api/sos/manual` - Manual SOS trigger

### System
- `GET /api/health` - Health check
- `GET /api` - API information

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 16+ 
- MongoDB 4.4+
- npm or yarn

### 1. Clone and Install
```bash
git clone <repository-url>
cd women_safety
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/safecheck
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d
MONITORING_INTERVAL_MS=60000
DEFAULT_GRACE_PERIOD_MINUTES=5
```

### 3. Start MongoDB
```bash
# Using MongoDB Community Server
mongod

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 4. Start the Server
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

## 📊 Database Schema

### User Schema
```javascript
{
  name: String,
  email: String (unique),
  phone: String,
  password: String (hashed),
  profilePictureUrl: String,
  isActive: Boolean,
  lastLogin: Date
}
```

### Trip Schema
```javascript
{
  userId: ObjectId (ref: User),
  source: {
    coordinates: [Number], // [longitude, latitude]
    address: String
  },
  destination: {
    coordinates: [Number],
    address: String
  },
  currentCoordinates: {
    coordinates: [Number],
    lastUpdated: Date
  },
  startTime: Date,
  estimatedArrivalTime: Date,
  gracePeriodMinutes: Number,
  status: Enum ['ACTIVE', 'COMPLETED', 'DELAYED', 'EMERGENCY_TRIGGERED'],
  emergencyTriggeredAt: Date
}
```

### Contact Schema
```javascript
{
  userId: ObjectId (ref: User),
  name: String,
  phone: String,
  relation: Enum ['FAMILY', 'FRIEND', 'COLLEAGUE', 'NEIGHBOR', 'SPOUSE', 'PARENT', 'SIBLING', 'OTHER'],
  priorityLevel: Number (1-5),
  isPrimary: Boolean
}
```

### Alert Schema
```javascript
{
  tripId: ObjectId (ref: Trip),
  userId: ObjectId (ref: User),
  type: Enum ['AUTOMATIC', 'MANUAL', 'DELAY_DETECTED'],
  severity: Enum ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
  status: Enum ['PENDING', 'SENT', 'DELIVERED', 'RESOLVED'],
  message: String,
  locationAtTrigger: {
    coordinates: [Number],
    address: String
  },
  contactsNotified: [{
    contactId: ObjectId,
    phone: String,
    status: String
  }]
}
```

## 🔧 Monitoring Engine

The monitoring engine runs as a background service that:

1. **Checks Active Trips**: Every 60 seconds (configurable)
2. **Detects Overdue Trips**: Compares current time with ETA + grace period
3. **Triggers Emergency Alerts**: Automatically creates alerts and notifies contacts
4. **Sends Notifications**: Simulates SMS/email notifications (ready for real service integration)

### Monitoring Status
```bash
# Check monitoring engine status
curl http://localhost:3000/api/health
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with 12-round salt
- **Rate Limiting**: 100 requests per 15 minutes (5 for auth endpoints)
- **Input Validation**: Comprehensive validation using express-validator
- **Security Headers**: Helmet middleware for security headers
- **CORS Protection**: Configurable CORS policies
- **Error Handling**: Centralized error handling without information leakage

## 📱 Notification Integration

The system is designed to integrate with:

- **SMS Services**: Twilio, AWS SNS, etc.
- **Email Services**: SendGrid, AWS SES, etc.
- **Push Notifications**: Firebase Cloud Messaging, OneSignal
- **WhatsApp Business API**: For enhanced emergency communication

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## 📈 Production Deployment

### Environment Variables
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://your-production-db
JWT_SECRET=your-production-secret
```

### Docker Deployment
```bash
# Build image
docker build -t safecheck-api .

# Run container
docker run -d -p 3000:3000 --name safecheck-api safecheck-api
```

### PM2 Process Management
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start server.js --name safecheck-api

# Monitor
pm2 monit
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Email: support@safecheck.com
- Documentation: Check `/api` endpoint for live API docs

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with Node.js, Express, and MongoDB
- Security best practices from OWASP
- Inspired by women's safety initiatives worldwide

---

**SafeCheck: Protecting journeys, saving lives.** 🛡️
