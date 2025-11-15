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
  
  // Wait for port to be available (retry logic for Railway deployment)
  let retries = 10;
  let lastError: Error | null = null;
  
  while (retries > 0) {
    try {
      await app.listen(port);
      console.log(`🚀 Application is running on: http://localhost:${port}/api`);
      // Send ready signal to PM2
      if (process.send) {
        process.send('ready');
      }
      break;
    } catch (error: any) {
      lastError = error;
      if (error.code === 'EADDRINUSE') {
        retries--;
        console.log(`⚠️  Port ${port} is in use, retrying in 1 second... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        throw error;
      }
    }
  }
  
  if (retries === 0 && lastError) {
    console.error(`❌ Failed to start on port ${port} after retries`);
    throw lastError;
  }
}

void bootstrap();
