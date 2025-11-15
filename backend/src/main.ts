import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Enable CORS - handle both string and array of origins
  const corsOrigin = configService.get('cors.origin');
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
  
  // Strictly use the configured port (3001) - do not auto-increment
  // If port is in use, fail with clear error message
  try {
    await app.listen(port, '0.0.0.0');
    console.log(`🚀 Application is running on: http://0.0.0.0:${port}/api`);
    
    // Write port to file for debugging (optional, non-critical)
    const fs = require('fs');
    const path = require('path');
    // Write to /tmp which is writable, or to backend directory as fallback
    const portFile = '/tmp/backend-port.txt';
    try {
      fs.writeFileSync(portFile, port.toString(), 'utf8');
      console.log(`📝 Backend port (${port}) written to ${portFile}`);
    } catch (err) {
      // Non-critical, just log a warning
      console.warn(`⚠️  Could not write port file (non-critical): ${err.message || err}`);
    }
    
    // Send ready signal to PM2
    if (process.send) {
      process.send('ready');
    }
  } catch (error: any) {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use. Please free the port and try again.`);
      console.error(`   Backend must use port ${port} (configured in PORT environment variable or defaults to 3001)`);
      throw new Error(`Port ${port} is already in use. Backend requires port ${port} to be available.`);
    } else {
      throw error;
    }
  }
}

void bootstrap();
