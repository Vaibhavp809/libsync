# 📱 How to Get Crash Logs from Android Device

## Step 1: Enable USB Debugging on Your Phone

1. Go to **Settings** → **About Phone**
2. Tap **Build Number** 7 times (enables Developer Options)
3. Go back to **Settings** → **Developer Options**
4. Enable **USB Debugging**

## Step 2: Connect Your Phone

1. Connect phone to computer via USB
2. On your phone, when prompted, tap **Allow USB Debugging**

## Step 3: Verify ADB Connection

Open Command Prompt or PowerShell and run:

```bash
adb devices
```

You should see your device listed. If not:
- Make sure USB drivers are installed
- Try a different USB cable
- Check if phone shows "Allow USB Debugging" prompt

## Step 4: Get Crash Logs

### Option A: Get All Errors (Recommended)
```bash
adb logcat *:E
```

This shows only ERROR level logs.

### Option B: Get Errors and Exceptions
```bash
adb logcat | findstr /i "error exception crash fatal"
```

### Option C: Get Full Log and Save to File
```bash
adb logcat > crash_log.txt
```

Then open `crash_log.txt` and look for errors.

### Option D: Clear Logs First, Then Capture
```bash
adb logcat -c
adb logcat > crash_log.txt
```

Then open the app, let it crash, and check `crash_log.txt`.

## Step 5: Look For These Keywords

In the logs, search for:
- `FATAL EXCEPTION`
- `AndroidRuntime`
- `NullPointerException`
- `ClassNotFoundException`
- `ResourceNotFoundException`
- `MainActivity`
- `MainApplication`

## What to Send Me

Copy the error lines that show:
1. The exception type (e.g., `NullPointerException`)
2. The error message
3. The stack trace (lines showing file names and line numbers)

Example of what to look for:
```
FATAL EXCEPTION: main
Process: com.Libsync.libsync, PID: 12345
java.lang.NullPointerException: Attempt to invoke virtual method...
    at com.libsync.libsync.MainActivity.onCreate(MainActivity.kt:22)
    ...
```

---

## Alternative: Use Android Studio Logcat

If you have Android Studio installed:

1. Open Android Studio
2. Connect your phone
3. Open **View** → **Tool Windows** → **Logcat**
4. Filter by **Error** or search for your app package: `com.Libsync.libsync`
5. Reproduce the crash
6. Copy the red error lines

---

## Quick Test Command

Run this to see if adb works:
```bash
adb version
```

If it shows a version number, adb is working!

---

**Next**: Run `adb logcat *:E` and share the error output with me!

