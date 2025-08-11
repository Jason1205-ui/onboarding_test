# Backend API with NeonBase and Vercel Integration

## Overview
This backend API supports both MySQL and PostgreSQL (NeonBase) database connections. When deployed to Vercel, it will automatically use NeonBase PostgreSQL, while local development can use either database system.

## Setup Instructions

### Local Development

1. Install dependencies:
   ```
   npm install
   ```
   or
   ```
   yarn install
   ```

2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Fill in your database credentials

3. Start the server:
   ```
   npm start
   ```
   or
   ```
   yarn start
   ```

### Vercel Deployment with NeonBase

1. Create a NeonBase account and database at [neon.tech](https://neon.tech)

2. Get your NeonBase connection details:
   - Host: Your project's connection string (e.g., `ep-cool-rain-123456.us-east-2.aws.neon.tech`)
   - Port: Usually `5432`
   - Username: Database username
   - Password: Database password
   - Database name: Your database name

3. Deploy to Vercel:
   - Connect your GitHub repository to Vercel
   - Set the following environment variables in Vercel:
     - `NEON_DB_HOST`
     - `NEON_DB_PORT`
     - `NEON_DB_USER`
     - `NEON_DB_PASSWORD`
     - `NEON_DB_NAME`
     - `NEON_DB_SSL=true`

4. Deploy your application

## Database Migration

To migrate your data from MySQL to PostgreSQL (NeonBase), you'll need to:

1. Export your MySQL data
2. Convert the schema to PostgreSQL format
3. Import the data to NeonBase

You can use tools like pgloader or a custom script to handle the migration.

## API Endpoints

The API provides the following endpoints:

- `GET /api/health` - Health check endpoint
- `GET /api/cosmetic_notifications_cancelled` - Get cancelled cosmetic notifications
- `GET /api/cosmetic_notifications` - Get all cosmetic notifications
- `GET /api/search/product?q=QUERY` - Search products by name
- `GET /api/search/notification?notif_no=NUMBER` - Search by notification number
- `GET /api/filter/statistics` - Get filter statistics
- `GET /api/manufacturer/statistics` - Get manufacturer statistics
- `GET /api/test/join` - Test join between tables

## Troubleshooting

If you encounter connection issues:

1. Check your environment variables
2. Ensure your IP is allowed in NeonBase's connection settings
3. Verify SSL settings if connecting to NeonBase
4. Check Vercel logs for detailed error messages