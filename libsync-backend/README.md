# LibSync Backend

Backend API server for LibSync Library Management System.

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
```

## Installation

```bash
npm install
```

## Running the Server

```bash
npm start
```

For development:
```bash
npm run dev
```

## Deployment on Render

1. Connect your GitHub repository to Render
2. Set the following environment variables in Render dashboard:
   - `MONGO_URI` - Your MongoDB connection string
   - `JWT_SECRET` - A secure random string for JWT token signing
   - `PORT` - Will be automatically set by Render (optional)
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Deploy!

## API Endpoints

- Health check: `GET /api/health`
- Authentication: `/api/auth/*`
- Books: `/api/books/*`
- Loans: `/api/loans/*`
- Reservations: `/api/reservations/*`
- Users: `/api/users/*`
- Reports: `/api/reports/*`
- And more...

## Notes

- The server uses Express 5.x
- MongoDB connection is handled via Mongoose
- JWT authentication is used for secure API access
- CORS is enabled for cross-origin requests

