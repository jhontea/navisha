# Mobile Setup

This guide explains how to set up Navisha mobile development and testing on Windows.

The recommended development target is Android first. iOS can be tested later with EAS cloud builds or a Mac.

---

## Backend Choice

Use the local backend by default while building the mobile app.

Local is safer for mobile feature work because the first mobile phase needs auth changes, token response shapes, CSRF behavior updates, and possibly migrations. Those should be tested locally before touching production.

Use `https://api.navisha.cloud` only for smoke testing after the mobile auth endpoints have been deployed there. The current production API is web-oriented: Google OAuth redirects through the browser and stores Navisha JWTs in httpOnly cookies. A native mobile app needs a token-based flow that returns Navisha JWTs to the app.

Recommended default:

```powershell
EXPO_PUBLIC_API_URL=http://<YOUR-LAN-IP>:8090/api/v1
```

Production smoke test later:

```powershell
EXPO_PUBLIC_API_URL=https://api.navisha.cloud/api/v1
```

Before using production, confirm that the mobile auth endpoints and any schema changes are already deployed.

---

## Windows Prerequisites

Install:

- Node.js LTS
- Git
- Go
- Docker Desktop
- Android Studio
- JDK 17

Android Studio should include:

- Android SDK
- Android SDK Platform
- Android Virtual Device
- Android SDK Platform-Tools
- Android Emulator

Set Windows environment variables:

```powershell
setx ANDROID_HOME "%LOCALAPPDATA%\Android\Sdk"
```

Add these to your user `Path`:

```text
%LOCALAPPDATA%\Android\Sdk\platform-tools
%LOCALAPPDATA%\Android\Sdk\emulator
```

Open a new terminal and verify:

```powershell
adb version
emulator -version
node --version
go version
docker --version
```

Create an Android Virtual Device in Android Studio, for example a Pixel device with a recent stable Android API image.

---

## Local Backend Setup

From the repo root:

```powershell
docker-compose up -d
```

Create backend env:

```powershell
cd backend
copy .env.example .env
```

Fill required values in `backend/.env`:

```env
DATABASE_URL=postgres://navisha:navisha@localhost:5439/navisha
REDIS_URL=redis://localhost:6389
JWT_SECRET=change-me
JWT_REFRESH_SECRET=change-me-too
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URL=http://localhost:8090/api/v1/auth/google/callback
FRONTEND_URL=http://localhost:3000
COOKIE_DOMAIN=
ALLOWED_EMAILS=
CURRENCYFREAKS_API_KEY=
OPENROUTER_API_KEY=
```

Run the API:

```powershell
go run ./cmd/server
```

The API runs on:

```text
http://localhost:8090
```

Health check:

```powershell
Invoke-WebRequest -Uri http://localhost:8090/health -UseBasicParsing
```

---

## LAN IP for Mobile

Android devices and emulators cannot use the Windows host `localhost` the same way the web app does.

Find your PC LAN IP:

```powershell
ipconfig
```

Look for the active Wi-Fi or Ethernet adapter IPv4 address, for example:

```text
192.168.1.10
```

Use that in the mobile app:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:8090/api/v1
```

Allow Windows Firewall access for port `8090` when prompted. If the phone cannot reach the API, temporarily test from the phone browser:

```text
http://192.168.1.10:8090/health
```

Networking notes:

- Physical Android device: phone and PC must be on the same network.
- Android emulator: LAN IP works consistently; `10.0.2.2` can also point to the host machine for the default emulator.
- Production API: use `https://api.navisha.cloud/api/v1` only after mobile-compatible auth is deployed.

---

## Mobile App Setup

The mobile app should live in:

```text
mobile/
```

Expected env file:

```text
mobile/.env
```

Local development value:

```env
EXPO_PUBLIC_API_URL=http://<YOUR-LAN-IP>:8090/api/v1
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
```

Start the app:

```powershell
cd mobile
npm install
npx expo start
```

For OAuth, use an Expo development build instead of Expo Go. Expo Go is fine for early UI spikes, but OAuth redirects need a custom app scheme, which requires a development build.

Development build path:

```powershell
npx expo install expo-dev-client
npx expo run:android
npx expo start --dev-client
```

If local native build setup is painful, use EAS Build for an Android development build once the app is scaffolded:

```powershell
npx eas-cli build --platform android --profile development
```

---

## Google Login Setup

Keep the existing web OAuth client unchanged.

Existing web redirect URIs:

```text
https://api.navisha.cloud/api/v1/auth/google/callback
http://localhost:8090/api/v1/auth/google/callback
```

Add separate mobile credentials in Google Cloud Console.

Android OAuth client:

- Application type: Android
- Package name: `cloud.navisha.mobile`
- SHA-1: local debug SHA-1 for development
- Add release SHA-1 later for Play Store or EAS production builds

iOS OAuth client later:

- Application type: iOS
- Bundle ID: `cloud.navisha.mobile`

Recommended mobile auth flow:

1. Expo app opens Google login with `expo-auth-session` or a native Google Sign-In library inside a development build.
2. Mobile obtains a Google identity result.
3. Mobile sends it to the backend, for example:

```http
POST /api/v1/auth/google/mobile
Content-Type: application/json

{
  "id_token": "<google-id-token>"
}
```

4. Backend verifies the Google identity, upserts the user, and returns:

```json
{
  "user": {
    "id": "uuid",
    "email": "user@gmail.com",
    "name": "Ahmad Hafizh",
    "avatar_url": "https://..."
  },
  "access_token": "navisha-access-token",
  "refresh_token": "navisha-refresh-token"
}
```

5. Mobile stores tokens with `expo-secure-store`.
6. Mobile calls protected endpoints with:

```http
Authorization: Bearer <access_token>
```

Backend CSRF should not apply to Authorization-header mobile requests, because CSRF protects browser cookies that are sent automatically. Mobile Bearer tokens are explicitly attached by the app.

---

## Testing Setup

Unit and component testing:

```powershell
cd mobile
npx expo install jest-expo jest @types/jest "--" --dev
npx expo install @testing-library/react-native "--" --dev
```

Add scripts:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watchAll"
  },
  "jest": {
    "preset": "jest-expo"
  }
}
```

Recommended test targets:

- API client request headers and error parsing
- auth token store and refresh behavior
- login screen states
- trip list empty/loading/error/success states
- budget formatting
- map URL helpers

E2E testing:

- Use Maestro for Android smoke flows.
- Start with login-state-independent screens where possible.
- Add authenticated flows once test users and mobile auth are stable.

Example local smoke checklist:

- App opens on Android emulator.
- API base URL points to local LAN IP.
- Google login completes.
- `/auth/me` returns the user.
- Trip list loads.
- Trip detail opens.
- Activity list loads.
- Expense summary loads.
- Open in Google Maps opens the external Maps app or browser.

---

## References

- Expo auth guide: https://docs.expo.dev/guides/authentication/
- Expo development builds: https://docs.expo.dev/develop/development-builds/introduction/
- Expo Jest setup: https://docs.expo.dev/develop/unit-testing/
- React Native Windows setup: https://reactnative.dev/docs/set-up-your-environment
- Google native OAuth: https://developers.google.com/identity/protocols/oauth2/native-app
