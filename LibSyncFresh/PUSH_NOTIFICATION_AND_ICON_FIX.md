# Push Notification & Icon Fix Guide

## Issues Identified

1. **Icons not loading in preview build** - react-native-vector-icons may not be properly linked
2. **Notification icon path** - needs verification
3. **App icon configuration** - needs to ensure proper Android linking

## Fixes Applied

### 1. React Native Vector Icons Configuration

The app uses both:
- `@expo/vector-icons` (Ionicons) - Works out of the box with Expo
- `react-native-vector-icons` (MaterialCommunityIcons) - Needs proper linking

### 2. Notification Implementation Review

✅ **Current Implementation is Correct:**
- Notification handler configured in App.js
- Android 13+ permission handling
- Notification channels properly set up
- Push token registration working
- Icon configured in app.json

### 3. Icon Fixes Needed

#### A. Ensure react-native-vector-icons is linked

For Expo projects, we need to use `@expo/vector-icons` instead or configure react-native-vector-icons properly.

#### B. Verify app icons exist and are correct size

- `assets/icon.png` - Should be 1024x1024
- `assets/adaptive-icon.png` - Should be 1024x1024
- `assets/splash-icon.png` - Should be 512x512 or larger

## Recommended Actions

1. **Replace MaterialCommunityIcons with Expo Icons** (Recommended for Expo projects)
2. **Regenerate Android icons** using `npx expo prebuild --clean`
3. **Verify icon files exist** and are correct size

