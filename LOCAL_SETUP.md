# Local Development Setup

## Services Status

- **Frontend**: Running on http://localhost:3000
- **Backend**: Needs environment configuration (see below)

## Setting Up Backend Environment

1. **Create a `.env` file in the `backend` directory** using the template:

```bash
cd backend
copy env.template .env
```

2. **Update the `.env` file** with your local settings:

- **DATABASE_URL**: Update with your local PostgreSQL connection string
- **JWT_SECRET**: Change to a secure secret key
- **JWT_REFRESH_SECRET**: Change to a secure refresh secret key
- **REDIS_HOST** and **REDIS_PORT**: Update if using a different Redis setup

3. **Make sure you have**:
   - PostgreSQL database running
   - Redis server running (optional, but may be needed for caching)

4. **Run database migrations**:
```bash
cd backend
npx prisma migrate dev
```

5. **Restart the backend** if needed

## Accessing the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api

The frontend automatically proxies `/api/*` requests to the backend.

## Troubleshooting

- If backend isn't starting, check for missing environment variables
- Make sure PostgreSQL is running and accessible
- Check console output for error messages


