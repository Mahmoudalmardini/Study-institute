import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import compression from 'compression';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  // Get port from environment or use default (needed for error messages)
  const port = parseInt(process.env.PORT || '3001', 10);
  
  try {
    logger.log('🚀 Starting application...');
    
    const app = await NestFactory.create(AppModule, {
      logger:
        process.env.NODE_ENV === 'production'
          ? ['error', 'warn', 'log']
          : ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // AllExceptionsFilter is registered once, via APP_FILTER in AppModule
    app.use(compression());
    
    logger.log('✅ Application created successfully');

    const configService = app.get(ConfigService);

    // Get port from config service (may override env var)
    const configuredPort = configService.get('port') || port;
    logger.log(`📡 Backend will listen on port: ${configuredPort}`);

    // Enable CORS - handle both string and array of origins
    const corsOrigin = configService.get('cors.origin');
    logger.log(`🔐 CORS enabled for origin: ${JSON.stringify(corsOrigin)}`);
    app.enableCors({
      origin: corsOrigin,
      credentials: true,
    });

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    // Global prefix
    app.setGlobalPrefix('api');
  
    // Strictly use the configured port (3001) - do not auto-increment
    // If port is in use, fail with clear error message
    await app.listen(configuredPort, '0.0.0.0');
    logger.log(`🚀 Application is running on: http://0.0.0.0:${configuredPort}/api`);
    logger.log(`📊 Health check available at: http://0.0.0.0:${configuredPort}/api/health`);
    
    // Write port to file for debugging (optional, non-critical)
    const fs = require('fs');
    const portFile = '/tmp/backend-port.txt';
    try {
      fs.writeFileSync(portFile, configuredPort.toString(), 'utf8');
      logger.log(`📝 Backend port (${configuredPort}) written to ${portFile}`);
    } catch (err: any) {
      // Non-critical, just log a warning
      logger.warn(`⚠️  Could not write port file (non-critical): ${err?.message || err}`);
    }
    
    // Send ready signal to PM2
    if (process.send) {
      process.send('ready');
      logger.log('✅ Sent ready signal to PM2');
    }
    
    logger.log('✅ Application bootstrap completed successfully');
  } catch (error: any) {
    if (error.code === 'EADDRINUSE') {
      const errorPort = error.port || port;
      logger.error(`❌ Port ${errorPort} is already in use. Please free the port and try again.`);
      logger.error(`   Backend must use port ${errorPort} (configured in PORT environment variable or defaults to 3001)`);
      throw new Error(`Port ${errorPort} is already in use. Backend requires port ${errorPort} to be available.`);
    } else {
      logger.error(`❌ Failed to start application: ${error.message}`, error.stack);
      throw error;
    }
  }
}

void bootstrap();
