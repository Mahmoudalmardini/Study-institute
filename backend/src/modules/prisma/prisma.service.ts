import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private configService: ConfigService) {
    const databaseUrl = configService.get<string>('database.url');
    
    // Add connection pool parameters if not already present
    let connectionUrl = databaseUrl || process.env.DATABASE_URL || '';
    
    // Optimize for Railway deployment
    if (connectionUrl && !connectionUrl.includes('connection_limit')) {
      const separator = connectionUrl.includes('?') ? '&' : '?';
      // Increase connection limit for Railway from 20 to 30
      // Add pool_timeout to handle connection exhaustion gracefully
      connectionUrl = `${connectionUrl}${separator}connection_limit=30&pool_timeout=30&connect_timeout=10`;
    }
    
    super({
      datasources: {
        db: {
          url: connectionUrl,
        },
      },
      log: [
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' },
      ],
    });

    // Log database errors for debugging
    this.$on('error' as never, (e: any) => {
      console.error('Prisma Client Error:', e);
    });

    this.$on('warn' as never, (e: any) => {
      console.warn('Prisma Client Warning:', e);
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') return;

    const models = Reflect.ownKeys(this).filter(
      (key) => typeof key === 'string' && key[0] !== '_',
    );

    return Promise.all(
      models.map((modelKey) => {
        return this[modelKey as string].deleteMany();
      }),
    );
  }
}
