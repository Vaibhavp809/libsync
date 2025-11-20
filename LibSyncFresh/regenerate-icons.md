# Icon Regeneration Instructions

The icons are correctly configured in `app.json`, but they need to be regenerated for the Android build.

## Quick Fix:

1. **Regenerate icons using Expo prebuild:**
   ```bash
   cd LibSyncFresh
   npx expo prebuild --clean
   ```

2. **Or rebuild the app:**
   ```bash
   eas build --platform android --profile preview --clear-cache
   ```

## Icon Requirements:

- **icon.png**: Should be 1024x1024 pixels (square)
- **adaptive-icon.png**: Should be 1024x1024 pixels (square), with the icon centered in a safe area (about 432x432 pixels from center)

## Current Configuration:

✅ `app.json` has:
- `icon: "./assets/icon.png"`
- `adaptiveIcon.foregroundImage: "./assets/adaptive-icon.png"`
- `adaptiveIcon.backgroundColor: "#ffffff"`

✅ Android mipmap folders have generated icons

## If icons still don't show:

1. Verify icon files exist and are correct size:
   ```bash
   # Check file sizes
   dir assets\icon.png
   dir assets\adaptive-icon.png
   ```

2. Clear build cache and rebuild:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   eas build --platform android --profile preview --clear-cache
   ```

3. Check if icons are properly generated in:
   - `android/app/src/main/res/mipmap-*/ic_launcher*.webp`
   - `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`

