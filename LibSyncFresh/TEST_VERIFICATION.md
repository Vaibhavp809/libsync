# LibSync React Native App - Test Verification Guide

## 🎯 Overview
This document provides a comprehensive testing guide for the updated LibSync React Native application with real backend API integration.

## ✅ Updated Features Summary

### 🔧 Key Changes Made
1. **Removed all static/mock data** from BookListScreen, MyReservationsScreen, and LoanHistoryScreen
2. **Updated API endpoints** to match backend requirements exactly:
   - `GET /api/books` - Fetch all books
   - `GET /api/books/search?query=<term>` - Search books
   - `POST /api/reservations` with `{ studentId, bookId }` - Create reservation
   - `GET /api/reservations/:studentId` - Get student reservations
   - `PUT /api/reservations/:id/cancel` - Cancel reservation
   - `GET /api/loans/:studentId` - Get student loan history

3. **Enhanced Book Display** to show:
   - Title
   - Author
   - ISBN (with fallback to "N/A")
   - Category
   - Availability Status
   - Reserve Button (only when available)

4. **Token Handling** with multiple storage formats:
   - Stores tokens in both `token` and `auth_token` keys for compatibility
   - Axios interceptors automatically attach `Bearer ${token}` to all requests
   - Handles token expiration with automatic logout

## 📝 Testing Checklist

### 1. 🔐 Authentication & Token Management
- [ ] **Login**: User can log in successfully
- [ ] **Token Persistence**: Token persists across app restarts
- [ ] **Automatic Token Attachment**: All API requests include Authorization header
- [ ] **Token Expiration**: App handles expired tokens gracefully
- [ ] **Logout**: Clears all stored data properly

### 2. 📚 Search Books Screen
- [ ] **Load All Books**: Screen fetches and displays books from `GET /api/books`
- [ ] **Book Information Display**: Shows Title, Author, ISBN, Category, Availability
- [ ] **Search Functionality**: Search input calls `GET /api/books/search?query=<term>`
- [ ] **Real-time Search**: Search updates as user types (debounced)
- [ ] **Reserve Button**: Appears only for available books
- [ ] **Reservation Action**: Reserve button calls `POST /api/reservations`
- [ ] **Success Feedback**: Shows success message and refreshes book list
- [ ] **Error Handling**: Displays appropriate error messages for API failures
- [ ] **Statistics**: Book count statistics update correctly

### 3. 📌 My Reservations Screen
- [ ] **Load Reservations**: Fetches data from `GET /api/reservations/:studentId`
- [ ] **Reservation Display**: Shows Book Title, Status (Active/Cancelled), Reserved Date
- [ ] **Status Information**: Displays reservation duration and current status
- [ ] **Cancel Functionality**: Cancel button calls `PUT /api/reservations/:id/cancel`
- [ ] **Status Updates**: Status changes are reflected immediately
- [ ] **Empty State**: Shows appropriate message when no reservations exist
- [ ] **Pull to Refresh**: Allows manual refresh of reservation data
- [ ] **Statistics**: Reservation count statistics are accurate

### 4. 🔁 Loan History Screen
- [ ] **Load Loan History**: Fetches data from `GET /api/loans/:studentId`
- [ ] **Timeline Display**: Shows loans in timeline format with visual indicators
- [ ] **Loan Information**: Displays Book Title, Issue Date, Due Date, Return Date
- [ ] **Status Display**: Shows correct status (Issued/Returned/Overdue)
- [ ] **Overdue Detection**: Automatically detects and highlights overdue books
- [ ] **Status Colors**: Different colors for different loan statuses
- [ ] **Date Formatting**: Dates are displayed in user-friendly format
- [ ] **Empty State**: Shows message when no loan history exists
- [ ] **Statistics**: Loan statistics (Total, Active, Overdue) are accurate

### 5. 🌐 API Integration
- [ ] **Server Connection**: App connects to backend at `http://<server-ip>:5000`
- [ ] **Endpoint Compatibility**: All API calls use correct endpoint formats
- [ ] **Request Headers**: All authenticated requests include proper headers
- [ ] **Response Handling**: App handles various response formats correctly
- [ ] **Error Responses**: API error messages are displayed to users
- [ ] **Network Errors**: App handles network connectivity issues
- [ ] **Loading States**: Shows loading indicators during API calls

### 6. 📱 User Experience
- [ ] **Loading Indicators**: Appropriate loading states for all screens
- [ ] **Error Messages**: User-friendly error messages with retry options
- [ ] **Success Feedback**: Confirmation messages for successful actions
- [ ] **Navigation**: Smooth navigation between screens
- [ ] **Pull to Refresh**: All screens support pull-to-refresh
- [ ] **Search Debouncing**: Search doesn't fire on every keystroke
- [ ] **Button States**: Buttons are disabled during processing

## 🔧 Pre-Test Setup

### Backend Requirements
1. **Server Running**: Ensure Node.js + MongoDB backend is running on port 5000
2. **Database Seeded**: Database should have sample books, users, reservations, and loans
3. **API Endpoints**: All required endpoints should be functional:
   ```
   GET /api/books
   GET /api/books/search?query=<term>
   POST /api/reservations
   GET /api/reservations/:studentId
   PUT /api/reservations/:id/cancel
   GET /api/loans/:studentId
   POST /api/auth/login
   POST /api/auth/register
   ```

### App Configuration
1. **Server IP**: Update server IP in the app if not using localhost
2. **Network Access**: Ensure device/emulator can reach the backend server
3. **Dependencies**: All npm packages are installed and up to date

## 🧪 Step-by-Step Testing Procedure

### Phase 1: Authentication
1. Launch the app
2. Register a new user or login with existing credentials
3. Verify user data is stored and token is persisted
4. Close and restart app - should remain logged in
5. Navigate through the app to test token attachment

### Phase 2: Book Search
1. Navigate to "Search Books" screen
2. Verify books load from backend API
3. Test search functionality with various terms
4. Try reserving an available book
5. Verify reservation success and book status update
6. Test error scenarios (no internet, server down)

### Phase 3: Reservations Management
1. Navigate to "My Reservations" screen
2. Verify reservations load from backend API
3. Check reservation details are displayed correctly
4. Test canceling a reservation
5. Verify status updates after cancellation
6. Test empty state (user with no reservations)

### Phase 4: Loan History
1. Navigate to "Loan History" screen
2. Verify loan history loads from backend API
3. Check timeline display and status indicators
4. Verify date calculations (overdue detection)
5. Test different loan statuses (issued, returned, overdue)
6. Test empty state (user with no loans)

### Phase 5: Error Handling
1. Test app behavior with server offline
2. Test with invalid/expired tokens
3. Test network connectivity issues
4. Verify error messages are user-friendly
5. Test retry functionality

## 🐛 Common Issues & Solutions

### Authentication Issues
- **Token not persisting**: Check AsyncStorage permissions
- **API calls failing**: Verify token format and header setup
- **Login loops**: Clear AsyncStorage completely and restart

### API Connection Issues
- **Server unreachable**: Verify server IP and port configuration
- **CORS errors**: Ensure backend CORS is configured for mobile app
- **Timeout errors**: Check network connectivity and server response time

### Data Display Issues
- **Books not loading**: Check API response format matches expected structure
- **Search not working**: Verify search endpoint and query parameter format
- **Status not updating**: Check real-time data refresh after actions

## 📊 Success Criteria

### Functional Requirements ✅
- [ ] All screens fetch real data from backend APIs
- [ ] No static/mock data is used anywhere in the app
- [ ] JWT tokens are properly persisted and attached to requests
- [ ] All CRUD operations work correctly
- [ ] Error handling provides good user experience

### Technical Requirements ✅
- [ ] Axios interceptors handle token attachment automatically
- [ ] API endpoints match backend specification exactly
- [ ] App handles all backend response formats
- [ ] Network errors are handled gracefully
- [ ] App maintains state properly across screens

### User Experience Requirements ✅
- [ ] Loading states provide visual feedback
- [ ] Error messages are helpful and actionable
- [ ] Success feedback confirms user actions
- [ ] App performance is smooth and responsive
- [ ] Navigation works intuitively

## 🎉 Completion Verification

Once all test cases pass:
1. **Document any issues found** and their resolutions
2. **Verify all requirements** from the original specification are met
3. **Test with multiple user accounts** to ensure data isolation
4. **Performance test** with larger datasets
5. **Cross-platform test** if deploying to both iOS and Android

## 📞 Support
If issues are encountered during testing:
1. Check console logs for detailed error messages
2. Verify backend API is responding correctly using tools like Postman
3. Clear app data and restart if persistent issues occur
4. Check network connectivity between device and server

---

**Note**: This app now uses **ONLY** real backend data. All mock/static data has been removed. Ensure your backend server is running and accessible before testing.