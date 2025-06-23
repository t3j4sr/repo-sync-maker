
# Mobile Build Instructions

## Prerequisites
1. Install Android Studio
2. Install Java Development Kit (JDK) 11 or higher
3. Set up Android SDK through Android Studio

## Steps to Build for Android

### 1. Export to GitHub
- Click the "Export to Github" button in Lovable
- Clone the repository to your local machine

### 2. Install Dependencies
```bash
npm install
```

### 3. Initialize Capacitor (if not already done)
```bash
npx cap init
```

### 4. Add Android Platform
```bash
npx cap add android
```

### 5. Build the Web App
```bash
npm run build
```

### 6. Sync with Capacitor
```bash
npx cap sync android
```

### 7. Open in Android Studio
```bash
npx cap open android
```

### 8. Build APK/AAB in Android Studio
1. In Android Studio, go to Build → Generate Signed Bundle/APK
2. Choose "Android App Bundle" for Play Store or "APK" for testing
3. Create or use existing keystore
4. Select build type (release for production)
5. Build and locate the generated file

## For Play Store Deployment

### App Bundle Requirements:
- Target SDK 34 (already configured)
- Minimum SDK 24 (supports 95%+ of Android devices)
- App signing by Google Play (recommended)

### Store Listing Requirements:
- App name: "Lucky Shopkeeper Draws"
- Package name: app.lovable.luckyshopkeeper
- App icon (512x512 px)
- Feature graphic (1024x500 px)
- Screenshots (phone and tablet)
- Privacy policy URL
- App description and metadata

### Testing:
- Test on multiple Android devices
- Test offline functionality
- Verify all authentication flows work
- Test customer and shopkeeper workflows

## Important Notes:
- The app currently uses hot-reload URL for development
- For production, remove the server.url from capacitor.config.ts
- Ensure all Supabase URLs are using HTTPS
- Test thoroughly before publishing to Play Store
