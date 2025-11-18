# Push Notifications Setup - Android Notification Bar & Lock Screen

## ✅ What's Been Implemented

### 1. **Android Notification Channels** (Enhanced)
- **Default Channel**: MAX importance, shows on lock screen
- **Reservations Channel**: HIGH importance for book reservations
- **Due Dates Channel**: MAX importance for overdue/due date reminders
- **Announcements Channel**: HIGH importance for library announcements
- **Urgent Channel**: MAX importance for critical alerts

All channels are configured with:
- `lockscreenVisibility: PUBLIC` - Shows on lock screen
- `importance: MAX` or `HIGH` - Appears in notification bar
- Sound, vibration, and badge enabled

### 2. **Backend Push Notification Service**
- ✅ Installed `expo-server-sdk` package
- ✅ Created `utils/pushNotifications.js` utility
- ✅ Added `pushToken` field to User model
- ✅ Added `/users/push-token` endpoint to save tokens
- ✅ Integrated push notifications into notification creation
- ✅ Integrated push notifications into overdue reminders

### 3. **App-Side Configuration**
- ✅ Enhanced notification handler to always show notifications
- ✅ Automatic push token registration on app start
- ✅ Push token automatically sent to backend
- ✅ Proper Android notification channel mapping

## How It Works

### When a notification is created:
1. **In-app notification** is saved to database
2. **Push notification** is automatically sent to all targeted users with push tokens
3. Notification appears in:
   - ✅ Android notification bar (system tray)
   - ✅ Lock screen (if device is locked)
   - ✅ In-app notification screen

### Notification Channels:
- **default**: General notifications
- **reservations**: Book reservation updates
- **due_dates**: Due date and overdue reminders
- **announcements**: Library announcements
- **urgent**: Urgent alerts

## Testing

### 1. **Test Push Token Registration**
- Open the app and login
- Check backend logs for: `✅ Push token sent to server successfully`
- Verify token is saved in User document

### 2. **Test Notification Creation**
- Create a notification from admin panel
- Check backend logs for: `✅ Push notifications sent: X users notified`
- Notification should appear in:
  - Android notification bar
  - Lock screen (if device is locked)
  - In-app notification screen

### 3. **Test Overdue Reminders**
- Overdue reminders are sent daily at 9 AM IST
- Due today reminders are sent daily at 8 AM IST
- Both will send push notifications automatically

## Important Notes

1. **Permissions**: Users must grant notification permissions when the app first requests them
2. **Push Tokens**: Tokens are automatically registered and sent to backend on app start
3. **Lock Screen**: Notifications will show on lock screen if:
   - Device is locked
   - Notification channel has `lockscreenVisibility: PUBLIC`
   - User hasn't disabled lock screen notifications in Android settings

## Troubleshooting

### Notifications not appearing:
1. Check if user granted notification permissions
2. Verify push token is saved in backend (check User document)
3. Check backend logs for push notification errors
4. Verify notification channel importance is MAX or HIGH

### Lock screen not showing notifications:
1. Check Android device settings → Apps → LibSync → Notifications
2. Ensure "Show on lock screen" is enabled
3. Verify notification channel has `lockscreenVisibility: PUBLIC`

## Files Modified

### Backend:
- `libsync-backend/models/User.js` - Added pushToken field
- `libsync-backend/utils/pushNotifications.js` - New push notification utility
- `libsync-backend/routes/users.js` - Added push-token endpoint
- `libsync-backend/controllers/notificationController.js` - Integrated push notifications
- `libsync-backend/routes/notifications.js` - Integrated push notifications
- `libsync-backend/server.js` - Added push notifications to cron jobs
- `libsync-backend/package.json` - Added expo-server-sdk dependency

### App:
- `LibSyncFresh/services/notificationService.js` - Enhanced Android channels, lock screen visibility
- `LibSyncFresh/App.js` - Already configured to initialize notifications

## Next Steps

1. **Rebuild the app** to include the notification enhancements:
   ```bash
   cd LibSyncFresh
   eas build --profile preview --platform android
   ```

2. **Test notifications**:
   - Install the new build
   - Login to the app
   - Create a test notification from admin panel
   - Verify it appears in notification bar and lock screen

3. **Deploy backend** (if not already deployed):
   - Push changes to GitHub
   - Render will automatically redeploy

The notifications should now appear in the Android notification bar and on the lock screen! 🎉

