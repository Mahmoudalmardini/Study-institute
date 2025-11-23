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
    
    if (connectionUrl && !connectionUrl.includes('connection_limit')) {
      const separator = connectionUrl.includes('?') ? '&' : '?';
      connectionUrl = `${connectionUrl}${separator}connection_limit=20&pool_timeout=20`;
    }
    
    super({
      datasources: {
        db: {
          url: connectionUrl,
        },
      },
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
