# FareWatch

A flight price tracking app prototype. Users log in and can add flight
routes to track, backed by a REST API with authentication.

## Demo Video
[Watch here](https://youtube.com/shorts/1SSyFwP8WEU?si=I-RsVlvEyeSZ2UhB)

## Tech Stack
- **Android:** Kotlin, Retrofit, Coroutines
- **Backend:** Node.js, Express, SQLite, bcrypt, JWT

## Features
- User registration & login (hashed passwords, JWT tokens)
- Protected routes via auth middleware
- Add/view/delete tracked flight routes
- Price snapshots with buy/wait guidance
- Price alerts when target price is met
- User settings (theme, notifications, language)

**Note:** The Android app currently covers login and adding a route. The
remaining backend features (alerts, settings, price history) work via the
API but aren't yet wired into the UI.

## Running the Backend
cd farewatch-api
npm install
node server.js

Requires a `.env` file with:

PORT=3000


## Running the App
1. Open in Android Studio
2. Set `BASE_URL` in `RetrofitClient.kt` to your backend URL
3. Build → Generate APK

## Project Structure
farewatch-api/
server.js - routes
auth.js - JWT middleware
db.js - database setup

app/
MainActivity.kt - login
RoutesActivity.kt - add route
RetrofitClient.kt - API client
ApiService.kt - endpoints
