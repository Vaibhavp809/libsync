# Debugging Push Notifications

## Common Issues & Solutions

### 1. **No Push Tokens Saved**
**Symptom**: Backend logs show "No users with push tokens found"

**Check**:
- Open MongoDB and check if users have `pushToken` field
- Query: `db.users.find({ pushToken: { $exists: true } })`
- Check backend logs for: `✅ Push token saved for user: ...`

**Solution**:
- Ensure app is requesting notification permissions
- Check app logs for: `✅ Push token sent to server successfully`
- Verify user is logged in when token is sent

### 2. **Push Token Not Sent After Login**
**Symptom**: Token obtained but not saved to backend

**Check**:
- App logs should show: `✅ Push token sent to server after login`
- Backend logs should show: `📱 Saving push token for user: ...`

**Solution**:
- Token is now automatically sent after login (via `authService.login`)
- Token is also sent when notification service initializes
- Check if user is authenticated when token is sent

### 3. **Notification Recipient Not Set**
**Symptom**: Backend logs show "No valid targeting found for notification"

**Check Backend Logs**:
```
📤 Attempting to send push notification for: {
  title: '...',
  recipients: '...',
  recipient: '...',
  targetUsers: [...],
  department: '...'
}
```

**Common Issues**:
- `recipient` field is `null` or `undefined`
- `targetUsers` array is empty
- `recipients` field doesn't match expected values ('all', 'students', 'specific')

**Solution**:
- Ensure notification creation sets proper targeting fields
- For single user: set `recipient` field
- For multiple users: set `targetUsers` array
- For all students: set `recipients: 'all'`
- For department: set `recipients: 'students'` and `department` field

### 4. **Expo Push Token Validation Fails**
**Symptom**: "Invalid push token" errors

**Check**:
- Token format should be: `ExponentPushToken[...]`
- Token should be obtained from `Notifications.getExpoPushTokenAsync()`

**Solution**:
- Ensure using Expo push tokens, not FCM tokens
- Verify `projectId` is set in `app.json`

## Debugging Steps

### Step 1: Check if Push Tokens are Saved
```bash
# In MongoDB
db.users.find({ pushToken: { $exists: true } }, { name: 1, studentID: 1, pushToken: 1 })
```

### Step 2: Check Backend Logs
Look for these log messages:
- `📱 Saving push token for user: ...` - Token being saved
- `✅ Push token saved for user: ...` - Token saved successfully
- `📤 Attempting to send push notification for: ...` - Push notification attempt
- `Found X students with push tokens` - Users found
- `📱 Sending push notifications to X users` - Sending notifications
- `✅ Push notification sent successfully` - Success
- `❌ Push notification failed` - Failure

### Step 3: Check App Logs
Look for:
- `✅ Expo push token obtained: ...` - Token obtained
- `📤 Sending push token to server...` - Token being sent
- `✅ Push token sent to server successfully` - Token sent
- `✅ Push token sent to server after login` - Token sent after login

### Step 4: Test Notification Creation
1. Create a notification from admin panel
2. Check backend logs for push notification attempt
3. Check if users with push tokens are found
4. Check if notifications are sent

### Step 5: Verify Notification Targeting
When creating a notification, ensure:
- **For all students**: `recipients: 'all'`
- **For department**: `recipients: 'students'`, `department: 'CSE'` (or department ID)
- **For specific user**: `recipients: 'specific'`, `targetUsers: [userId]` OR `recipient: userId`

## Testing Checklist

- [ ] User has granted notification permissions
- [ ] Push token is obtained in app
- [ ] Push token is saved to backend (check MongoDB)
- [ ] User is logged in when token is sent
- [ ] Notification has correct targeting fields
- [ ] Backend logs show push notification attempt
- [ ] Backend logs show users found with push tokens
- [ ] Backend logs show notifications sent successfully

## Manual Test

### Test Push Token Save:
```bash
# In app, after login, check logs for:
✅ Push token sent to server successfully

# In backend logs, check for:
📱 Saving push token for user: ...
✅ Push token saved for user: ...
```

### Test Notification:
1. Create notification from admin panel
2. Check backend logs for:
   ```
   📤 Attempting to send push notification for: {...}
   Found X students with push tokens
   📱 Sending push notifications to X users
   ✅ Push notification sent successfully
   ```

## Common Fixes Applied

1. ✅ Added comprehensive logging throughout push notification flow
2. ✅ Improved recipient field handling (ObjectId vs string)
3. ✅ Added push token send after login
4. ✅ Better error messages and warnings
5. ✅ Improved notification targeting logic

## Next Steps

If notifications still don't work:
1. Check backend logs for specific error messages
2. Verify push tokens are in database
3. Verify notification targeting is correct
4. Check Expo push notification service status
5. Verify app has notification permissions

