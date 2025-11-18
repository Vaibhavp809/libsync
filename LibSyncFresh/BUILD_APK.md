# Building LibSync APK

## Prerequisites

1. **Expo Account**: Make sure you're logged in to Expo
2. **EAS CLI**: Install if not already installed

## Step-by-Step Build Process

### 1. Install EAS CLI (if not installed)
```bash
npm install -g eas-cli
```

### 2. Login to Expo
```bash
eas login
```

### 3. Navigate to Project Directory
```bash
cd LibSyncFresh
```

### 4. Build Options

#### Option A: Production APK (Recommended for Release)
```bash
eas build --profile production --platform android
```

#### Option B: Preview APK (For Testing)
```bash
eas build --profile preview --platform android
```

#### Option C: Development APK (For Development)
```bash
eas build --profile development --platform android
```

### 5. Build Process

- EAS will ask you a few questions:
  - **Build type**: Choose "APK" (already configured)
  - **Keystore**: If first time, EAS will generate one for you
  - **Build will be queued** on Expo's servers

### 6. Monitor Build Progress

- You'll get a build URL to monitor progress
- Or check: https://expo.dev/accounts/vaibhav20589/projects/libsync/builds

### 7. Download APK

- Once build completes, download the APK from:
  - The build URL provided
  - Expo dashboard
  - Email notification (if configured)

## Build Configuration

- **Package Name**: `com.Libsync.libsync`
- **Version**: `1.0.0`
- **Build Type**: APK (configured in eas.json)
- **Backend URL**: `https://libsync-o0s8.onrender.com` (configured in apiConfig.js)

## Troubleshooting

### If build fails:
1. Check the build logs in Expo dashboard
2. Ensure all dependencies are installed: `npm install`
3. Verify app.json configuration is correct
4. Check that all required assets (icon, splash) exist

### Common Issues:
- **Keystore errors**: EAS will handle this automatically
- **Dependency conflicts**: Check package.json
- **Build timeout**: Try again or contact Expo support

## Quick Build Command

For production APK:
```bash
cd LibSyncFresh && eas build --profile production --platform android
```

