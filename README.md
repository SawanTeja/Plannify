# Plannify Project Documentation

This document provides instructions on how to set up, configure, and run the Plannify project locally.

## Features

- **Habit Tracker**
- **Task Management**
- **Budget Planner**
- **Split Fund with friends**
- **Journal**
- **Social**
- **Bucket List**
- **Attendance**

## Prerequisites

- Node.js installed on your machine.
- MongoDB Atlas account.
- Cloudinary account.
- Google Cloud Console project (for Google Sign-In).
- Android Studio (for Android Emulator) or a physical Android device.

## Project Structure

- **Backend**: Contains the Express.js server, API routes, and database models.
- **Plannify**: Contains the React Native (Expo) frontend application.

## 1. Backend Setup

### Installation

1. Navigate to the `Backend` directory:
   ```bash
   cd Backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Configuration

1. Create a file named `.env` in the `Backend` directory.
2. Add the following environment variables to the `.env` file:

   ```text
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   GOOGLE_CLIENT_ID=your_google_client_id
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```

### how to connect mongodb atlas

1. Log in to your MongoDB Atlas account.
2. Create a new Cluster or use an existing one.
3. Click on "Connect" for your cluster.
4. Choose "Drivers" (Node.js).
5. Copy the connection string.
6. Replace `<password>` with your database user password.
7. Paste this string as the value for `MONGO_URI` in the `Backend/.env` file.

### how to connect cloudnary

1. Log in to your Cloudinary account.
2. Go to the Dashboard.
3. Copy the "Cloud Name", "API Key", and "API Secret".
4. Paste these values into the `Backend/.env` file corresponding to `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.

### Run Backend

To start the backend server locally:

```bash
npm run dev
```

This will start the server on port 5000 (usually `http://localhost:5000`).

## 2. Frontend Setup

### Installation

1. Navigate to the `Plannify` directory:
   ```bash
   cd Plannify
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### API Configuration (paste API)

To connect the frontend to your local backend:

1. Open `Plannify/src/services/ApiService.js`.
2. Locate the `API_URL` constant.
3. Uncomment the local address and comment out the production address.

   For Android Emulator:
   ```javascript
   const API_URL = 'http://10.0.2.2:5000/api';
   ```

   For Physical Device (using ADB Reverse):
   ```javascript
   const API_URL = 'http://localhost:5000/api';
   ```

### Run Frontend

To start the Expo development server:

```bash
npm start
```

Then, you can press `a` to run on Android Emulator.

## 3. Running on Android (Emulator or Physical Device)

### Using adb reverse

If you are running the backend locally on your computer (localhost:5000) and want to access it from a physical Android device connected via USB or an emulator, you need to map the device's port to your computer's port.

1. Ensure the backend is running on port 5000.
2. Connect your Android device via USB (ensure USB Debugging is on) or start the Emulator.
3. Run the following command in your terminal:

   ```bash
   adb reverse tcp:5000 tcp:5000
   ```

   This allows requests to `http://localhost:5000` on the phone/emulator to be forwarded to `http://localhost:5000` on your computer.

## 4. Google Sign-In Setup (SHA-1)

To make Google Sign-In work, you need to add your machine's SHA-1 fingerprint to your Firebase project.

### Generate SHA-1 Key

Run the following command in your terminal to get your debug SHA-1 key:

**For Windows:**
```powershell
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
```

**For Mac/Linux:**
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

If asked for a password, type `android` and press Enter.

### Add to Firebase

1. Copy the `SHA1` fingerprint from the terminal output.
2. Go to the [Firebase Console](https://console.firebase.google.com/).
3. Open your project.
4. Go to **Project Settings** (gear icon) > **General**.
5. Scroll down to **Your apps** and select your Android app.
6. Click **Add fingerprint**.
7. Paste the SHA-1 key you copied and save.
8. (Optional) Download the updated `google-services.json` and replace the existing one in `Plannify/google-services.json` if you haven't already.

### Troubleshooting

- **Network Requests Failed**: Ensure your computer and device are on the same network if not using `adb reverse`.
- **Google Sign-In**: Ensure your `google-services.json` is correctly placed in the `Plannify` root and the package name matches your Firebase project updates.
