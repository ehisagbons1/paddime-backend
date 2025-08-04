# Paddime Backend

This is the backend API for the Paddime Gift Card app, built with Node.js, Express, and MongoDB.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the backend directory with the following content:
   ```env
   MONGO_URI=mongodb://localhost:27017/paddime
   JWT_SECRET=your_jwt_secret_here
   PORT=5000
   ```

3. Start the server:
   ```bash
   npm run dev
   ```
   The server will run on `http://localhost:5000` by default.

## Project Structure
- `server.js`: Main entry point
- `routes/`: API route handlers (to be created)
- `models/`: Mongoose models (to be created)
- `controllers/`: Business logic (to be created)

## Features (Planned)
- User & admin authentication (JWT)
- Gift card management
- Wallet & transaction management
- Feedback & support endpoints 