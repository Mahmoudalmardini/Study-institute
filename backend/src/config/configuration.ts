// Helper function to parse Redis URL (Railway format: redis://user:pass@host:port)
function parseRedisConfig() {
  const redisUrl = process.env.REDIS_URL;
  
  if (redisUrl) {
    try {
      const url = new URL(redisUrl);
      return {
        host: url.hostname,
        port: parseInt(url.port || '6379', 10),
        password: url.password || undefined,
      };
    } catch {
      // Fallback to default if URL parsing fails
    }
  }
  
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  };
}

export default () => {
  const redisConfig = parseRedisConfig();
  
  // Handle multiple CORS origins (for Railway deployment)
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const corsOrigins = frontendUrl.includes(',')
    ? frontendUrl.split(',').map((url) => url.trim())
    : frontendUrl;
  
  return {
    port: parseInt(process.env.PORT || '3001', 10),
    database: {
      url: process.env.DATABASE_URL,
    },
    redis: redisConfig,
    jwt: {
      secret: process.env.JWT_SECRET || 'default-secret',
      expiresIn: process.env.JWT_EXPIRATION || '15m',
      refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
    },
    upload: {
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
      destination: process.env.UPLOAD_DESTINATION || './uploads',
    },
    cors: {
      origin: corsOrigins,
    },
    throttle: {
      ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
      limit: parseInt(process.env.THROTTLE_LIMIT || '10', 10),
    },
  };
};
