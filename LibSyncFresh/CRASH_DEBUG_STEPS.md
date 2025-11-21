# 🚨 CRASH DEBUGGING STEPS

## Immediate Actions

### 1. Get Crash Logs
```bash
# Connect device and get logs
adb logcat | grep -i "error\|exception\|crash\|fatal"
```

OR for more detailed logs:
```bash
adb logcat *:E
```

### 2. Check for Specific Errors
Look for:
- `NullPointerException`
- `ClassNotFoundException`
- `ResourceNotFoundException`
- `IllegalStateException`
- `RuntimeException`

---

## Common Crash Causes After Our Fixes

### 1. Missing Resources
Check if these exist:
- `@drawable/splashscreen_logo` - Referenced in styles.xml
- `@drawable/rn_edit_text_material` - Referenced in styles.xml
- `@mipmap/ic_launcher` - Referenced in AndroidManifest
- `@style/AppTheme` - Referenced in MainActivity

### 2. BuildConfig/R Class Issues
- Namespace mismatch can cause BuildConfig/R not found
- Check if `com.libsync.BuildConfig` and `com.libsync.R` are accessible

### 3. JavaScript Errors
- Check Metro bundler console
- Look for import errors
- Check if all screens load correctly

### 4. Native Module Initialization
- expo-notifications might fail to initialize
- expo-camera might have permission issues
- Other native modules might crash

---

## Quick Fixes to Try

### Fix 1: Simplify MainActivity (Remove Theme Setting Temporarily)
```kotlin
override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)  // Call super first
    // Remove setTheme temporarily to test
}
```

### Fix 2: Check Resource Files
Verify these files exist:
- `android/app/src/main/res/drawable/splashscreen_logo.png` (or .xml)
- `android/app/src/main/res/drawable/rn_edit_text_material.xml`
- `android/app/src/main/res/mipmap-*/ic_launcher.*`

### Fix 3: Disable New Architecture Temporarily
In `gradle.properties`:
```
newArchEnabled=false
```

### Fix 4: Simplify App.js Further
Remove notification setup temporarily to see if that's causing the crash.

---

## Step-by-Step Debugging

1. **Get the exact error** from `adb logcat`
2. **Check which line crashes** - Is it MainActivity? MainApplication? JavaScript?
3. **Test with minimal code** - Simplify to find the exact cause
4. **Check resource references** - All resources must exist
5. **Verify package names** - BuildConfig/R must be accessible

---

## Emergency Fallback

If still crashing, create a minimal MainActivity:

```kotlin
package com.libsync.libsync

import android.os.Bundle
import com.facebook.react.ReactActivity

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
  }

  override fun getMainComponentName(): String = "main"
}
```

This removes all potential crash points to test if the basic setup works.

---

**Next Step**: Run `adb logcat` to get the exact error message!

