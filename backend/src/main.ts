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

  let port = configService.get('port') || 3001;
  
  // Try to find an available port if the default is in use
  const net = require('net');
  const findAvailablePort = (startPort: number): Promise<number> => {
    return new Promise((resolve, reject) => {
      const server = net.createServer();
      server.listen(startPort, () => {
        const port = (server.address() as any)?.port;
        server.close(() => resolve(port));
      });
      server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          // Try next port
          findAvailablePort(startPort + 1).then(resolve).catch(reject);
        } else {
          reject(err);
        }
      });
    });
  };
  
  // Wait for port to be available (retry logic for Railway deployment)
  let retries = 5;
  let lastError: Error | null = null;
  
  while (retries > 0) {
    try {
      // Check if port is available, if not find another one
      try {
        const availablePort = await findAvailablePort(port);
        if (availablePort !== port) {
          console.log(`⚠️  Port ${port} is in use, using port ${availablePort} instead`);
          port = availablePort;
        }
      } catch (err) {
        // If findAvailablePort fails, try the original port anyway
      }
      
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
      break;
    } catch (error: any) {
      lastError = error;
      if (error.code === 'EADDRINUSE') {
        retries--;
        // Try next port
        port++;
        console.log(`⚠️  Port conflict, trying port ${port}... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        throw error;
      }
    }
  }
  
  if (retries === 0 && lastError) {
    console.error(`❌ Failed to start after retries`);
    throw lastError;
  }
}

void bootstrap();
