import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('reports ok status with the service name', () => {
    const body = controller.getHealth();

    expect(body.status).toBe('ok');
    expect(body.service).toBe('veazen-api');
  });

  it('exposes the package version as a semver string', () => {
    const body = controller.getHealth();

    expect(body.version).toMatch(/^\d+\.\d+\.\d+/);
  });
});
