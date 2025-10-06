# LibSync API Connection Troubleshooting Guide

## 🔍 **Current Issue Analysis**

Based on the error logs you provided:
```
LOG  Fetching books from API...
ERROR  Error fetching books: [Error]
```

The server connectivity test shows:
- ✅ **Server is running** at `http://127.0.0.1:5000`  
- ✅ **Health endpoint works** (`/api/health` returns 200 OK)
- ❌ **Books endpoint fails** (`/api/books` returns 403 Forbidden)

**Root Cause**: The 403 error indicates that the books API requires authentication, but either:
1. No token is being sent
2. Token is invalid/expired  
3. Token format is incorrect
4. User doesn't have proper permissions

---

## 🛠️ **Immediate Fixes Applied**

I've added comprehensive debugging to help identify the exact issue:

### 1. **Enhanced Error Logging** ✅
- Detailed API error messages in `apiService.js`
- Request/response logging in auth interceptors
- Server connectivity test script

### 2. **Token Debugging** ✅  
- Added token status logging in auth service
- Created debug screen to check token status
- Added debug navigation to home screen

### 3. **Server Verification** ✅
- Created `testServer.js` to verify backend connectivity
- Confirmed server is running and accessible

---

## 🚀 **Next Steps to Fix the Issue**

### **Step 1: Check Token Status**
Run the app and navigate to the new **"Debug Info"** button on the home screen to check:
- Is a token stored in AsyncStorage?
- Is the token expired?
- Is the AuthService detecting the token?

### **Step 2: Re-login if Needed**
If no token is found or token is expired:
1. Logout from the app completely
2. Clear app storage (use Debug screen "Clear Storage" button)
3. Login again to get a fresh token

### **Step 3: Verify Token Format**
The enhanced logging will show in console:
```
Request Interceptor: {
  url: '/books',
  method: 'get', 
  hasToken: true,
  tokenPreview: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
}
```

If `hasToken: false`, the issue is token storage/retrieval.

### **Step 4: Check Backend Authentication**
Your backend might require specific token format. Common issues:
- Backend expects `Authorization: Bearer <token>`
- Backend validates token signature
- Token payload format mismatch
- User role permissions

---

## 🔧 **Manual Testing Steps**

### Test 1: Server Connectivity
```bash
# Run this in your project directory
node testServer.js
```

### Test 2: Manual API Test with curl
```bash
# Test without authentication
curl -X GET http://127.0.0.1:5000/api/books

# Test with authentication (replace TOKEN with actual token)
curl -X GET http://127.0.0.1:5000/api/books \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

### Test 3: Check Backend Logs
Look at your Node.js backend console for:
- Incoming requests to `/api/books`
- Authentication middleware messages
- Token validation errors

---

## 📱 **Debug Screen Usage**

The new Debug Screen shows:

### **Token Status Section**
- ✅/❌ Has token in storage
- ✅/❌ AuthService has token loaded
- ✅/❌ User is authenticated
- Token preview (first 30 characters)

### **Token Details Section**  
- User ID from token
- Email from token
- Token expiration date
- Is token expired?

### **Actions Available**
- 🔄 **Refresh Debug Info** - Check current status
- 🧪 **Test API Call** - Try calling `/api/books`
- 🗑️ **Clear Storage** - Remove all stored data

---

## ⚡ **Quick Fixes**

### **Fix 1: Token Not Found**
If debug shows no token:
1. Go to Login screen
2. Login with valid credentials
3. Check debug screen again

### **Fix 2: Token Expired**  
If debug shows expired token:
1. Use "Clear Storage" in debug screen
2. Login again
3. Verify new token is valid

### **Fix 3: Token Format Issues**
If token exists but API still fails:
1. Check console logs for request details
2. Verify backend expects `Bearer <token>` format
3. Check if backend validates token correctly

### **Fix 4: Backend Permissions**
If token is valid but still 403:
1. Check if user has student role
2. Verify backend allows students to access books
3. Check backend authentication middleware

---

## 🚨 **Common Issues & Solutions**

### **Issue**: `Network error. Please check your connection`
**Solution**: 
- Verify backend is running on port 5000
- Check if using correct IP address
- Test with `node testServer.js`

### **Issue**: `403 Forbidden`  
**Solution**:
- User needs to login to get valid token
- Check token expiration
- Verify backend accepts token format

### **Issue**: `401 Unauthorized`
**Solution**:
- Token is expired or invalid
- Clear storage and login again
- Check backend token validation logic

### **Issue**: `500 Internal Server Error`
**Solution**:
- Backend database connection issue
- Check backend console logs
- Verify MongoDB is running

---

## 📞 **Contact Info for Backend Issues**

If the issue is in your backend (Node.js + MongoDB), check:

1. **Authentication Middleware**:
   ```javascript
   // Ensure your backend has this
   app.use('/api/books', authenticateToken);
   app.use('/api/reservations', authenticateToken); 
   app.use('/api/loans', authenticateToken);
   ```

2. **Token Validation**:
   ```javascript
   function authenticateToken(req, res, next) {
     const authHeader = req.headers['authorization'];
     const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
     
     if (!token) return res.sendStatus(401);
     
     jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
       if (err) return res.sendStatus(403);
       req.user = user;
       next();
     });
   }
   ```

3. **CORS Configuration**:
   ```javascript
   app.use(cors({
     origin: '*', // Allow React Native
     credentials: true
   }));
   ```

---

## 🎉 **Expected Result**

After following these steps, you should see:
- ✅ Debug screen shows valid token
- ✅ API calls return data instead of errors
- ✅ Books, reservations, and loans load correctly
- ✅ All app functionality working

**Next**: Once the token issue is resolved, all screens will work correctly since the API integration is already implemented!