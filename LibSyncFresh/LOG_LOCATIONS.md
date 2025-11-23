# Where to Find Push Notification Logs

## 📱 Console Logs Location

The push notification logs I mentioned appear in different places depending on how you're running the app:

### 1. **Development (Expo Go / Metro Bundler)**
- Open your terminal where you ran `npm start` or `expo start`
- Look for console logs with these prefixes:
  - `📱` - Push notification registration
  - `✅` - Success messages
  - `❌` - Error messages
  - `⚠️` - Warning messages
  - `🔍` - Debug information

### 2. **Production Build (Installed APK)**

#### Method 1: Using `adb logcat` (Recommended)
```bash
# Connect your Android device via USB
# Enable USB Debugging on your device
# Run this command:
adb logcat | grep -E "(📱|✅|❌|⚠️|🔍|Push|notification|ExpoPushToken)"
```

#### Method 2: Using Android Studio Logcat
1. Open Android Studio
2. Connect your device
3. Open the Logcat panel (View → Tool Windows → Logcat)
4. Filter by your app package name: `com.Libsync.libsync`
5. Filter by tags: `ReactNativeJS` or search for keywords like "push", "token", "notification"

#### Method 3: Using React Native Debugger
1. Shake your device or press `Ctrl+M` (Android)
2. Select "Debug"
3. Open Chrome DevTools at `chrome://inspect`
4. Click "inspect" under your app
5. Check the Console tab

### 3. **EAS Build Logs**
- Check the EAS build logs in the Expo dashboard
- Look for console output during the build process

## 🔍 Key Logs to Look For

When testing push notifications, look for these specific log messages:

1. **Project ID Resolution:**
   ```
   📱 Found projectId from Constants.expoConfig: [project-id]
   📱 Found projectId from Constants.manifest: [project-id]
   📱 Found projectId from Constants.manifest2: [project-id]
   📱 Using hardcoded projectId (fallback): [project-id]
   ```

2. **Debug Constants:**
   ```
   🔍 Debug Constants: {
     appOwnership: 'standalone',
     executionEnvironment: 'standalone',
     hasExpoConfig: true/false,
     hasManifest: true/false,
     hasManifest2: true/false,
     projectId: '[project-id]'
   }
   ```

3. **Token Generation:**
   ```
   📱 Registering for push notifications with projectId: [project-id]
   ✅ Expo push token obtained: ExponentPushToken[xxx...]
   ```

4. **Permission Status:**
   ```
   ✅ POST_NOTIFICATIONS permission granted on Android 13+
   ❌ POST_NOTIFICATIONS permission denied on Android 13+
   ❌ Notification permissions denied by user
   ```

5. **Token Sent to Server:**
   ```
   ✅ Push token sent to server from home screen
   ✅ Push token saved in database
   ```

## 🐛 If Logs Are Missing

If you don't see any logs:
1. Make sure you're running a **production build** (not Expo Go)
2. Check that the app has reached the HomeScreen (logs are triggered there)
3. Wait at least 3 seconds after HomeScreen loads (there's a delay)
4. Make sure the device is connected via USB for `adb logcat`
5. Check if the app crashed (look for crash logs)

## 📝 Quick Command to View All Logs

```bash
# View all React Native logs
adb logcat | grep ReactNativeJS

# View only notification-related logs
adb logcat | grep -i "notification\|push\|token"
```

