# 📱 LibSync Daily QR Attendance System

## 🎯 Overview

The Daily QR Attendance System is a comprehensive solution for tracking student attendance in the library using unique QR codes that change every 24 hours. Students scan the QR code when entering and leaving the library, automatically recording their login and logout times.

## ✨ Features

- **Daily Unique QR Codes**: Automatically generates new QR codes every 24 hours
- **Smart Login/Logout Detection**: First scan = Login, Second scan = Logout
- **Real-time Tracking**: Instant attendance recording with timestamps
- **Admin Dashboard**: Complete attendance management interface
- **Mobile App Integration**: Student-friendly QR scanning interface
- **Automatic Cleanup**: Expired codes are automatically deactivated
- **Comprehensive Reports**: View attendance by date, student, and time ranges

## 🏗️ System Architecture

### Backend Components

1. **Models**
   - `Attendance.js` - Student attendance records
   - `DailyCode.js` - Daily QR code tokens

2. **Controllers**
   - `attendanceController.js` - Business logic for attendance operations

3. **Routes**
   - `attendance.js` - API endpoints for attendance management

4. **Utilities**
   - `qrCodeGenerator.js` - QR code generation and management

### Frontend Components

1. **Admin Dashboard**
   - `AttendancePanel.jsx` - Complete attendance management interface

2. **Mobile App**
   - `AttendanceScannerScreen.js` - QR code scanning interface

## 🚀 API Endpoints

### QR Code Management
- `GET /api/attendance/code` - Get today's QR code and image
- `POST /api/attendance/scan` - Process QR code scan (login/logout)

### Attendance Records
- `GET /api/attendance/today` - Get today's attendance records
- `GET /api/attendance/range` - Get attendance by date range
- `GET /api/attendance/stats` - Get attendance statistics

## 📱 How It Works

### 1. Daily QR Code Generation
- System automatically generates a new unique token every day at midnight
- QR code image is generated and stored as a data URL
- Old codes are automatically deactivated

### 2. Student Attendance Process
1. **Login**: Student scans QR code when entering library
   - System creates attendance record with login time
   - Status set to "present"

2. **Logout**: Student scans same QR code when leaving
   - System updates attendance record with logout time
   - Status changes to "left"
   - Duration is calculated automatically

### 3. Admin Monitoring
- Real-time view of today's QR code
- Live attendance statistics
- Detailed attendance records by date
- Export and reporting capabilities

## 🛠️ Installation & Setup

### Backend Dependencies
```bash
npm install qrcode uuid
```

### Environment Variables
```env
MONGO_URI=your_mongodb_connection_string
PORT=5000
JWT_SECRET=your_jwt_secret
```

### Database Setup
The system automatically creates the required collections:
- `attendances` - Student attendance records
- `dailycodes` - Daily QR code tokens

## 📊 Data Models

### Attendance Schema
```javascript
{
  student: ObjectId,      // Reference to User
  date: Date,            // Attendance date
  loginTime: Date,       // When student entered
  logoutTime: Date,      // When student left (optional)
  status: String,        // 'present' or 'left'
  timestamps: true       // Created/updated timestamps
}
```

### DailyCode Schema
```javascript
{
  date: Date,            // Date for this code
  token: String,         // Unique 16-character token
  isActive: Boolean,     // Whether code is still valid
  generatedAt: Date,     // When code was created
  timestamps: true       // Created/updated timestamps
}
```

## 🔧 Configuration

### QR Code Settings
- **Token Length**: 16 characters (configurable in `qrCodeGenerator.js`)
- **QR Image Quality**: High quality PNG with error correction
- **Auto-refresh**: Every 24 hours at midnight
- **Cleanup**: Expired codes deactivated daily at 1 AM

### Timezone Handling
- All timestamps stored in UTC
- Display formatted according to user's locale
- Duration calculations in milliseconds

## 🚨 Security Features

- **Unique Daily Tokens**: Each day gets a completely different QR code
- **Token Validation**: Backend verifies token validity and date
- **Student Authentication**: Only logged-in students can record attendance
- **Duplicate Prevention**: One attendance record per student per day
- **Input Validation**: Comprehensive validation of all API inputs

## 📱 Mobile App Integration

### Prerequisites
- User must be logged in
- Camera permission granted
- Internet connection for API calls

### Scan Process
1. User opens attendance scanner
2. Camera activates with QR code overlay
3. User points camera at library QR code
4. System automatically detects login/logout
5. Success/error message displayed
6. Option to scan again or return

## 🎨 Admin Dashboard Features

### QR Code Display
- Large, scannable QR code image
- Current day's token display
- Active/inactive status indicator
- Instructions for library staff

### Statistics Dashboard
- Total students count
- Present today count
- Left today count
- Still present count

### Attendance Records
- Date picker for historical data
- Student information display
- Login/logout times
- Duration calculations
- Status badges (Present/Left)

### Quick Actions
- Generate reports
- Export data
- Force QR refresh
- Mobile app guide

## 🔄 Daily Operations

### Automatic Processes
- **Midnight**: New QR code generated
- **1 AM**: Expired codes cleanup
- **24/7**: QR code validation on scans

### Manual Operations
- Force refresh QR code (admin)
- View attendance reports
- Export attendance data
- Monitor system status

## 🧪 Testing

### API Testing
```bash
# Get today's QR code
curl http://localhost:5000/api/attendance/code

# Test QR scan (login)
curl -X POST http://localhost:5000/api/attendance/scan \
  -H "Content-Type: application/json" \
  -d '{"token":"your_token","studentId":"student_id"}'

# Get today's attendance
curl http://localhost:5000/api/attendance/today
```

### Frontend Testing
- Navigate to `/attendance` in admin dashboard
- Verify QR code displays correctly
- Test date picker functionality
- Check attendance record display

## 🚀 Deployment

### Production Considerations
- **Environment Variables**: Secure all sensitive data
- **Database Indexing**: Ensure performance with large datasets
- **Rate Limiting**: Prevent API abuse
- **Monitoring**: Track system health and usage
- **Backup**: Regular database backups

### Scaling
- **Horizontal Scaling**: Multiple server instances
- **Database Sharding**: Distribute attendance data
- **Caching**: Redis for frequently accessed data
- **CDN**: Serve QR images globally

## 🐛 Troubleshooting

### Common Issues

1. **QR Code Not Generating**
   - Check MongoDB connection
   - Verify UUID package installation
   - Check server logs for errors

2. **Attendance Not Recording**
   - Verify token validity
   - Check student ID format
   - Ensure date is current

3. **Mobile App Issues**
   - Verify camera permissions
   - Check network connectivity
   - Ensure user is logged in

### Debug Commands
```bash
# Check server status
curl http://localhost:5000/

# Verify MongoDB connection
node -e "require('./config/db').connectDB()"

# Test QR generation
node -e "require('./utils/qrCodeGenerator').getTodayQRCode()"
```

## 📈 Future Enhancements

- **Real-time Notifications**: Push notifications for attendance events
- **Analytics Dashboard**: Advanced attendance analytics and trends
- **Multi-location Support**: Support for multiple library branches
- **Integration APIs**: Connect with existing student management systems
- **Offline Support**: Cache QR codes for offline scanning
- **Biometric Integration**: Fingerprint/face recognition options

## 📞 Support

For technical support or feature requests:
- Check server logs for error details
- Verify API endpoint responses
- Test with sample data
- Review this documentation

---

**LibSync Daily QR Attendance System** - Making library attendance tracking simple, secure, and efficient! 🎉
