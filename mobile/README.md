# Expenses Tracker - Mobile App

The cross-platform mobile application for the Expenses Tracker, built using React Native and Expo. It closely mirrors the web client's beautiful dark-mode UI while delivering native performance.

## 🛠️ Technology Stack
- **Framework**: React Native + Expo SDK 55
- **Routing**: Expo Router (File-based routing)
- **Styling**: React Native StyleSheet (Mapping to the web design tokens)
- **Networking**: Axios with JWT interceptors (AsyncStorage)
- **Icons**: Expo Vector Icons (Feather)

## 📂 Project Structure
- `src/app/` - File-based routing structure (`/(auth)` for login/signup, `/(main)` for app tabs)
- `src/components/` - Reusable native components
- `src/context/` - Global state (AuthContext using AsyncStorage)
- `src/services/` - Axios API integrations mapping to backend endpoints
- `android/` & `ios/` - Auto-generated native directories (for native builds)

## 🚀 Setup & Execution

### 1. Install Dependencies
```bash
npm install
```

### 2. Run via Expo Go
To test the application quickly using the Expo Go app on your physical device:
```bash
npx expo start --clear
```
> **Note for Physical Devices**: The API base URL will dynamically resolve to your computer's local Wi-Fi IP address so your phone can communicate with the backend.

### 3. Build Native Android App (Optional)
If you wish to compile the native Android application locally (requires Android SDK):
1. Ensure your `android/local.properties` file exists and points to your Android SDK (e.g., `sdk.dir=C\:\\Users\\<user>\\AppData\\Local\\Android\\Sdk`).
2. Ensure you have Gradle 8.13 configured in `android/gradle/wrapper/gradle-wrapper.properties`.
3. Run the build command:
```bash
npx expo run:android
```

## 🎨 Design Synchronization
The mobile application shares exact UI/UX parity with the web client. Colors, padding, input styles, and dashboard components have been translated from CSS to React Native `StyleSheet` objects, maintaining the premium deep-purple aesthetic.
