# 📱 Building APK for EcoSudar App

## Option 1: Using EAS Build (Recommended - Easiest)

EAS (Expo Application Services) is the official way to build production apps with Expo.

### Step 1: Install EAS CLI
```bash
npm install -g eas-cli
```

### Step 2: Login to Expo
```bash
eas login
```
If you don't have an Expo account, create one at https://expo.dev/signup

### Step 3: Configure EAS Build
```bash
eas build:configure
```
This will create an `eas.json` file in your project.

### Step 4: Build APK for Android
```bash
eas build -p android --profile preview
```

**Options:**
- `--profile preview` - Builds an APK (installable file)
- `--profile production` - Builds an AAB (for Google Play Store)

The build will happen on Expo's servers. You'll get a download link when it's done (usually 10-20 minutes).

### Step 5: Download and Install
Once the build completes, you'll get a URL to download the APK. Download it and install on your Android device.

---

## Option 2: Local Build with Expo (No Expo Account Needed)

If you want to build locally without using Expo's cloud service:

### Step 1: Install Java Development Kit (JDK)
Download and install JDK 17 from:
https://www.oracle.com/java/technologies/downloads/#java17

### Step 2: Install Android Studio
1. Download from: https://developer.android.com/studio
2. Install Android Studio
3. Open Android Studio → More Actions → SDK Manager
4. Install:
   - Android SDK Platform 34
   - Android SDK Build-Tools
   - Android SDK Command-line Tools

### Step 3: Set Environment Variables
Add to your system environment variables:

**Windows:**
```
ANDROID_HOME=C:\Users\YourUsername\AppData\Local\Android\Sdk
JAVA_HOME=C:\Program Files\Java\jdk-17
```

Add to PATH:
```
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\tools
%JAVA_HOME%\bin
```

### Step 4: Generate Android Project
```bash
npx expo prebuild --platform android
```

### Step 5: Build APK
```bash
cd android
./gradlew assembleRelease
```

The APK will be at:
```
android/app/build/outputs/apk/release/app-release.apk
```

---

## Option 3: Using Expo Go (For Testing Only)

This is NOT for production, but good for quick testing:

1. Install Expo Go app on your Android device from Play Store
2. Run `pnpm start` in your project
3. Scan the QR code with Expo Go app
4. Your app will run inside Expo Go

**Note:** This is only for development testing, not for distributing to users.

---

## 🎯 Recommended Approach for You

Since you want to create an APK quickly, I recommend **Option 1 (EAS Build)**:

### Quick Steps:
```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Login (create account if needed)
eas login

# 3. Configure
eas build:configure

# 4. Build APK
eas build -p android --profile preview
```

Wait for the build to complete, download the APK, and install it on your Android device!

---

## 📝 Before Building

### Update app.json with your app details:
```json
{
  "expo": {
    "name": "EcoSudar",
    "slug": "ecosudar-app",
    "version": "1.0.0",
    "android": {
      "package": "com.yourcompany.ecosudar",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      }
    }
  }
}
```

---

## 🔧 Troubleshooting

### "eas: command not found"
```bash
npm install -g eas-cli
```

### Build fails with "No Android project found"
```bash
eas build:configure
```

### "ANDROID_HOME not set" (for local builds)
Set the environment variable as shown in Option 2, Step 3.

---

## 📦 After Building

### Installing APK on Android Device:
1. Transfer APK to your phone
2. Enable "Install from Unknown Sources" in Settings
3. Tap the APK file to install
4. Open the app!

### For Google Play Store:
Use production profile:
```bash
eas build -p android --profile production
```
This creates an AAB file for Play Store submission.

---

## 💡 Tips

1. **First build takes longer** (15-20 minutes) - subsequent builds are faster
2. **Free tier** allows limited builds per month on Expo
3. **APK size** will be around 50-80 MB
4. **Test thoroughly** before distributing to users

---

## 🚀 Next Steps After APK

1. Test the APK on multiple Android devices
2. Set up your backend on Hostinger
3. Update API URLs in the app
4. Build final production version
5. Distribute to users or publish to Play Store