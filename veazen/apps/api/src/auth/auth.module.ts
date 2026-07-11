import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AppConfigService } from '../config/app-config.service';
import { EnvelopeService } from '../crypto/envelope.service';
import { ApiKeyGuard } from './api-key.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      useFactory: (config: AppConfigService) => ({ secret: config.jwtSecret }),
      inject: [AppConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, EnvelopeService, ApiKeyGuard, JwtAuthGuard],
  exports: [AuthService, EnvelopeService, ApiKeyGuard, JwtAuthGuard],
})
export class AuthModule {}
