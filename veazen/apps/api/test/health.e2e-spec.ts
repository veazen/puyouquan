import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('GET /api/v1/health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    // Mirror the global prefix applied in src/main.ts.
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with the health payload', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

    expect(res.body).toMatchObject({ status: 'ok', service: 'veazen-api' });
    expect(typeof res.body.version).toBe('string');
  });

  it('is not served without the api/v1 prefix', async () => {
    await request(app.getHttpServer()).get('/health').expect(404);
  });
});
