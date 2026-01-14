import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    logger.log('🚀 Starting application...');
    
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });
    
    // Apply global exception filter for better error logging
    app.useGlobalFilters(new AllExceptionsFilter());
    
    logger.log('✅ Application created successfully');

    const configService = app.get(ConfigService);

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

    const port = configService.get('port') || 3001;
    logger.log(`📡 Backend will listen on port: ${port}`);
  
    // Strictly use the configured port (3001) - do not auto-increment
    // If port is in use, fail with clear error message
    await app.listen(port, '0.0.0.0');
    logger.log(`🚀 Application is running on: http://0.0.0.0:${port}/api`);
    logger.log(`📊 Health check available at: http://0.0.0.0:${port}/api/health`);
    
    // Write port to file for debugging (optional, non-critical)
    const fs = require('fs');
    const portFile = '/tmp/backend-port.txt';
    try {
      fs.writeFileSync(portFile, port.toString(), 'utf8');
      logger.log(`📝 Backend port (${port}) written to ${portFile}`);
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
      logger.error(`❌ Port ${port} is already in use. Please free the port and try again.`);
      logger.error(`   Backend must use port ${port} (configured in PORT environment variable or defaults to 3001)`);
      throw new Error(`Port ${port} is already in use. Backend requires port ${port} to be available.`);
    } else {
      logger.error(`❌ Failed to start application: ${error.message}`, error.stack);
      throw error;
    }
  }
}

void bootstrap();
