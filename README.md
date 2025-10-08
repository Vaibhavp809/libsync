# 📚 LibSync - Complete Library Management System

LibSync is a comprehensive digital library management system that consists of three integrated components: a React Native mobile application for students, a React-based admin dashboard for library staff, and a Node.js backend API. The system provides complete library operations including book management, student authentication, QR-based attendance tracking, loan management, e-resources, and placement news.

## 🏗️ System Architecture

The LibSync ecosystem consists of three main components:

### 1. **LibSyncFresh** - Mobile Application (React Native + Expo)
- **Location**: `./LibSyncFresh/`
- **Technology**: React Native with Expo
- **Purpose**: Student-facing mobile app for library services
- **Key Features**: Book browsing, QR scanning, attendance tracking, notifications

### 2. **libsync-admin** - Admin Dashboard (React + Vite)
- **Location**: `./libsync-admin/`
- **Technology**: React with Vite, Material-UI
- **Purpose**: Library staff management interface
- **Key Features**: Book management, student management, attendance monitoring, reports

### 3. **libsync-backend** - API Server (Node.js + Express)
- **Location**: `./libsync-backend/`
- **Technology**: Node.js, Express, MongoDB, JWT Authentication
- **Purpose**: Core API and business logic
- **Key Features**: REST API, authentication, database operations, automated tasks

## ✨ Key Features

### 📱 Mobile App Features
- **User Authentication**: Secure login/registration with JWT
- **Book Discovery**: Browse and search library catalog
- **QR Code Scanner**: Issue/return books via QR scanning
- **Attendance System**: Daily QR-based attendance tracking
- **Reservations**: Book reservation management
- **Loan History**: View borrowing history and due dates
- **E-Resources**: Access digital library resources
- **Placement News**: Stay updated with placement information
- **Push Notifications**: Real-time alerts and reminders
- **Offline Support**: Basic functionality without internet

### 🖥️ Admin Dashboard Features
- **Dashboard Analytics**: Real-time library statistics
- **Book Management**: Add, edit, delete, and manage book inventory
- **Student Management**: User registration, profile management
- **Issue/Return System**: Manual book transaction processing
- **Attendance Panel**: Monitor daily attendance with QR system
- **Reports Generation**: Comprehensive reporting system
- **Overdue Management**: Track and manage overdue books
- **E-Resources Management**: Digital content administration
- **Notification Center**: Send announcements to students
- **Settings Configuration**: System-wide configuration management

### ⚙️ Backend Features
- **RESTful API**: Complete CRUD operations for all entities
- **JWT Authentication**: Secure token-based authentication
- **MongoDB Integration**: Robust database operations
- **File Upload**: Handle book covers and documents
- **Email Service**: Automated notifications and reminders
- **QR Code Generation**: Dynamic QR codes for books and attendance
- **Cron Jobs**: Automated overdue reminders and cleanup tasks
- **Rate Limiting**: API protection and abuse prevention
- **CORS Support**: Cross-origin resource sharing

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- Git
- Expo CLI (for mobile app)
- Android Studio/Xcode (for mobile development)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/libsync.git
cd libsync
```

### 2. Backend Setup

```bash
cd libsync-backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Configure environment variables in .env
MONGO_URI=mongodb://localhost:27017/libsync
JWT_SECRET=your_jwt_secret_key
PORT=5000
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password

# Start the server
npm start
```

### 3. Admin Dashboard Setup

```bash
cd libsync-admin

# Install dependencies
npm install

# Start development server
npm run dev

# For production build
npm run build
npm run preview
```

### 4. Mobile App Setup

```bash
cd LibSyncFresh

# Install dependencies
npm install

# Install Expo CLI globally (if not already installed)
npm install -g expo-cli

# Start Expo development server
npm start

# For specific platforms
npm run android  # For Android
npm run ios      # For iOS
npm run web      # For Web
```

## 🔧 Configuration

### Backend Environment Variables

Create a `.env` file in the `libsync-backend` directory:

```env
# Database
MONGO_URI=mongodb://localhost:27017/libsync

# Authentication
JWT_SECRET=your_super_secret_jwt_key

# Server
PORT=5000
NODE_ENV=development

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Fine System
FINE_PER_DAY=10
MAX_FINE=500

# QR Code Settings
QR_CODE_EXPIRY_HOURS=24
```

### Mobile App Configuration

Update the API configuration in `LibSyncFresh/config/apiConfig.js`:

```javascript
export const apiConfig = {
  baseURL: 'http://your-server-ip:5000/api', // Replace with your backend URL
  timeout: 10000,
  // Add your server configuration
};
```

### Admin Dashboard Configuration

Update the API endpoint in `libsync-admin/src/config/api.js`:

```javascript
export const API_BASE_URL = 'http://your-server-ip:5000/api';
```

## 📊 Database Schema

### Collections Overview

1. **users** - Student and admin user accounts
2. **books** - Library book catalog
3. **loans** - Book borrowing records
4. **reservations** - Book reservation requests
5. **attendances** - Daily attendance records
6. **dailycodes** - QR codes for attendance
7. **notifications** - System notifications
8. **eresources** - Digital library resources
9. **placementnews** - Placement updates
10. **settings** - System configuration

## 🔐 Authentication & Security

### Authentication Flow
1. User registers/logs in through mobile app or admin dashboard
2. Backend validates credentials and generates JWT token
3. Token is stored securely and sent with subsequent requests
4. Middleware validates tokens for protected routes

### Security Features
- **JWT Token Authentication**: Secure, stateless authentication
- **Password Hashing**: bcrypt for secure password storage
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: Prevent API abuse
- **CORS Configuration**: Control cross-origin requests
- **Environment Variables**: Secure sensitive configuration

## 📱 Daily QR Attendance System

LibSync includes a sophisticated QR-based attendance tracking system:

### How it Works
1. **Daily QR Generation**: New unique QR codes generated every 24 hours
2. **Student Check-in**: Students scan QR code when entering library
3. **Auto Check-out**: Second scan automatically logs them out
4. **Real-time Tracking**: Instant attendance recording with timestamps
5. **Admin Monitoring**: Live dashboard for attendance management

### Features
- Automatic QR code refresh every 24 hours
- Smart login/logout detection
- Duration calculation
- Comprehensive attendance reports
- Mobile and web interfaces

## 🔄 Automated Tasks

The system includes several automated processes:

### Daily Tasks (Cron Jobs)
- **QR Code Refresh**: New attendance QR codes at midnight
- **Cleanup Process**: Remove expired QR codes at 1 AM
- **Overdue Reminders**: Email reminders at 9 AM daily
  - Daily reminders for first 15 days
  - Every 15 days thereafter
- **Fine Calculation**: Automatic fine computation

## 📈 Reports & Analytics

### Available Reports
- **Attendance Reports**: Daily, weekly, monthly attendance
- **Loan Reports**: Borrowing patterns and statistics
- **Overdue Reports**: Books past due dates
- **User Activity**: Student engagement metrics
- **Inventory Reports**: Book availability and usage

### Export Options
- PDF reports
- Excel/CSV exports
- Real-time data visualization
- Custom date range filtering

## 🛠️ Development

### Backend Development

```bash
cd libsync-backend

# Development with auto-restart
npm install -g nodemon
nodemon server.js

# Run tests
npm test

# Database seeding
npm run seed
```

### Admin Dashboard Development

```bash
cd libsync-admin

# Development server with hot reload
npm run dev

# Linting
npm run lint

# Type checking
npm run type-check
```

### Mobile App Development

```bash
cd LibSyncFresh

# Start with specific platform
expo start --android
expo start --ios
expo start --web

# Build for production
expo build:android
expo build:ios
```

## 🚀 Deployment

### Backend Deployment (Production)

```bash
# Install production dependencies
npm install --production

# Set environment variables
export NODE_ENV=production
export PORT=80
export MONGO_URI=your_production_mongodb_uri

# Start with PM2 (recommended)
npm install -g pm2
pm2 start server.js --name "libsync-backend"
pm2 save
pm2 startup
```

### Admin Dashboard Deployment

```bash
# Build for production
npm run build

# Serve with static server
npm install -g serve
serve -s dist

# Or deploy to Netlify/Vercel/AWS S3
```

### Mobile App Deployment

```bash
# Build APK for Android
expo build:android --type=apk

# Build for iOS App Store
expo build:ios --type=archive

# Publish to Expo
expo publish
```

### Docker Deployment

```dockerfile
# Backend Dockerfile example
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

## 🧪 Testing

### API Testing

```bash
# Test backend endpoints
cd libsync-backend
npm run test

# Manual API testing
curl -X GET http://localhost:5000/api/health
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### Frontend Testing

```bash
# Admin dashboard tests
cd libsync-admin
npm run test

# Mobile app testing
cd LibSyncFresh
expo start
# Use Expo Go app or emulator for testing
```

## 🐛 Troubleshooting

### Common Issues

1. **Backend Connection Issues**
   - Check MongoDB connection string
   - Verify server is running on correct port
   - Check firewall settings

2. **Mobile App Issues**
   - Ensure camera permissions are granted
   - Check network connectivity
   - Verify API base URL configuration

3. **Admin Dashboard Issues**
   - Check API endpoint configuration
   - Verify CORS settings in backend
   - Check browser console for errors

### Debug Commands

```bash
# Check server status
curl http://localhost:5000/api/health

# Test database connection
node -e "require('./config/db')"

# Check API endpoints
curl http://localhost:5000/api/books
```

## 📱 Mobile App Screens

### Student Screens
- **Login/Register**: Authentication
- **Home**: Dashboard with quick actions
- **Books**: Browse and search library catalog
- **Scanner**: QR code scanning for books
- **Attendance Scanner**: Daily attendance QR scanning
- **My Reservations**: Manage book reservations
- **Loan History**: View borrowing history
- **E-Resources**: Access digital content
- **Placement News**: Latest placement updates
- **Notifications**: System alerts and messages
- **Settings**: App configuration and preferences

## 🎯 Admin Dashboard Pages

### Management Pages
- **Dashboard**: Overview with key metrics
- **Manage Books**: Complete book inventory management
- **Manage Students**: User account administration
- **Issue Book**: Manual book transaction processing
- **Attendance Panel**: QR attendance monitoring
- **Overdue Books**: Track and manage late returns
- **Reports**: Generate comprehensive reports
- **E-Resources**: Digital content management
- **Placement News**: Announcement management
- **Notifications**: System-wide messaging

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile

### Books
- `GET /api/books` - Get all books
- `POST /api/books` - Add new book
- `GET /api/books/:id` - Get specific book
- `PUT /api/books/:id` - Update book
- `DELETE /api/books/:id` - Delete book

### Loans
- `GET /api/loans` - Get all loans
- `POST /api/loans/issue` - Issue book
- `PUT /api/loans/return` - Return book
- `GET /api/loans/overdue` - Get overdue books

### Attendance
- `GET /api/attendance/code` - Get daily QR code
- `POST /api/attendance/scan` - Process attendance scan
- `GET /api/attendance/today` - Get today's attendance
- `GET /api/attendance/stats` - Get attendance statistics

## 📞 Support & Contribution

### Getting Help
- Check this documentation first
- Review error logs in the backend
- Test API endpoints manually
- Check database connections
- Verify environment variables

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Development Guidelines
- Follow existing code style
- Add comments for complex logic
- Update documentation for new features
- Test thoroughly before submitting
- Use meaningful commit messages

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- React Native and Expo teams
- MongoDB and Node.js communities
- Material-UI for admin dashboard components
- All contributors and testers

---

**LibSync** - Modernizing library management with technology! 🚀📚

For technical support or questions, please check the documentation or create an issue in the repository.