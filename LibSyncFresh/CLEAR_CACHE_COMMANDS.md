# 🧹 Cache Clearing Commands

## Why Clear Cache?
After making changes to:
- Kotlin files (MainActivity.kt, MainApplication.kt)
- Gradle files (build.gradle, settings.gradle)
- Native configuration
- Package dependencies

Clearing cache ensures a **clean build** without stale artifacts.

---

## Recommended Cache Clearing Steps

### 1. Clear Metro Bundler Cache ✅
```bash
cd LibSyncFresh
npx expo start --clear
```
OR
```bash
npm start -- --reset-cache
```

### 2. Clear Gradle Cache ✅
```bash
cd LibSyncFresh/android
./gradlew clean
```
OR on Windows:
```bash
cd LibSyncFresh\android
gradlew.bat clean
```

### 3. Clear Android Build Cache ✅
```bash
cd LibSyncFresh/android
./gradlew cleanBuildCache
```
OR on Windows:
```bash
cd LibSyncFresh\android
gradlew.bat cleanBuildCache
```

### 4. Clear Expo Cache ✅
```bash
cd LibSyncFresh
npx expo start -c
```

### 5. Clear Node Modules (Optional - if issues persist) ⚠️
```bash
cd LibSyncFresh
rm -rf node_modules
npm install
```
OR on Windows:
```bash
cd LibSyncFresh
rmdir /s /q node_modules
npm install
```

### 6. Clear Watchman Cache (if using) ✅
```bash
watchman watch-del-all
```

---

## Quick All-in-One (Recommended)

### For EAS Build (Cloud Build):
**No need to clear local cache** - EAS builds are always clean!

Just run:
```bash
cd LibSyncFresh
eas build --profile preview --platform android --clear-cache
```

The `--clear-cache` flag ensures a clean build on EAS servers.

### For Local Build:
```bash
cd LibSyncFresh

# Clear Metro cache
npx expo start --clear

# In another terminal, clear Gradle cache
cd android
./gradlew clean
cd ..
```

---

## What Each Cache Does

1. **Metro Cache**: JavaScript bundle cache
2. **Gradle Cache**: Android build artifacts
3. **Expo Cache**: Expo-specific cache
4. **Node Modules**: Dependencies (only clear if having dependency issues)

---

## Recommendation

**For EAS Build**: 
- ✅ Use `--clear-cache` flag (EAS handles it)
- ✅ No local cache clearing needed

**For Local Development**:
- ✅ Clear Metro cache: `npx expo start --clear`
- ✅ Clear Gradle cache: `./gradlew clean`
- ⚠️ Only clear node_modules if having dependency issues

---

## After Clearing Cache

1. Rebuild the app
2. Test on device
3. Check for any new errors

---

**Status**: ✅ **CACHE CLEARING RECOMMENDED BEFORE BUILD**

