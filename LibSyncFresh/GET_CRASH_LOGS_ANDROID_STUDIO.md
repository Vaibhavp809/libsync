# 📱 Get Crash Logs Using Android Studio (EASIEST METHOD)

## Step 1: Open Android Studio

1. Open **Android Studio**
2. If it asks to open a project, click **Cancel** or **Open** (doesn't matter)

## Step 2: Connect Your Phone

1. Connect your phone to computer via USB
2. On your phone:
   - Go to **Settings** → **Developer Options**
   - Enable **USB Debugging**
   - When prompted, tap **Allow USB Debugging**

## Step 3: Open Logcat

1. In Android Studio, look at the bottom toolbar
2. Click on **Logcat** tab (or go to **View** → **Tool Windows** → **Logcat**)

## Step 4: Filter Logs

1. In the Logcat window, you'll see a search/filter box
2. Type: `com.Libsync.libsync` (your app package name)
3. Or select **Error** level from the dropdown

## Step 5: Reproduce the Crash

1. Open the app on your phone
2. Let it crash
3. Watch the Logcat window - you'll see red error lines appear

## Step 6: Copy the Error

1. Look for lines in **RED** (these are errors)
2. Find the line that says `FATAL EXCEPTION` or shows your app name
3. **Right-click** on the error line → **Copy** → **Copy Stack Trace**
4. Or manually select and copy the error lines

## What the Error Will Look Like

```
E/AndroidRuntime: FATAL EXCEPTION: main
    Process: com.Libsync.libsync, PID: 12345
    java.lang.NullPointerException: Attempt to invoke...
        at com.libsync.libsync.MainActivity.onCreate(MainActivity.kt:22)
        at android.app.Activity.performCreate(Activity.java:7136)
        ...
```

## Alternative: Use ADB from Command Line

If you want to use command line instead:

### Find ADB Location
ADB is usually at:
```
C:\Users\YourName\AppData\Local\Android\Sdk\platform-tools\adb.exe
```

### Add to PATH (Optional)
Or use full path:
```bash
C:\Users\vinay\AppData\Local\Android\Sdk\platform-tools\adb.exe logcat *:E
```

### Quick Test
```bash
C:\Users\vinay\AppData\Local\Android\Sdk\platform-tools\adb.exe devices
```

---

## What to Send Me

Copy the error that shows:
1. **Exception type** (e.g., `NullPointerException`, `ClassNotFoundException`)
2. **Error message** (the line after FATAL EXCEPTION)
3. **Stack trace** (the lines showing file names like `MainActivity.kt:22`)

**Example:**
```
FATAL EXCEPTION: main
Process: com.Libsync.libsync
java.lang.NullPointerException: Attempt to invoke virtual method 'void...'
    at com.libsync.libsync.MainActivity.onCreate(MainActivity.kt:22)
```

---

**EASIEST**: Use Android Studio Logcat - it's visual and easy to use!

