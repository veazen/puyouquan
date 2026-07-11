import { Injectable, Logger } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';

import { AppConfigService } from '../config/app-config.service';

/**
 * Email notifications (§5.4). SMTP (mailhog in dev) when SMTP_HOST is set,
 * otherwise a JSON transport that logs — the interface is the abstraction
 * point for swapping in SendGrid/Resend later.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly transporter: Transporter;

  constructor(config: AppConfigService) {
    this.transporter = config.smtpHost
      ? createTransport({
          host: config.smtpHost,
          port: config.smtpPort,
          secure: false,
          auth:
            config.smtpUser && config.smtpPass
              ? { user: config.smtpUser, pass: config.smtpPass }
              : undefined,
        })
      : createTransport({ jsonTransport: true });
  }

  async sendAlertEmail(
    to: string,
    alert: { rule: string; severity: string; payload: Record<string, unknown> },
  ): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: 'Veazen Alerts <alerts@veazen.app>',
        to,
        subject: `[Veazen] ${alert.severity.toUpperCase()} alert: ${alert.rule}`,
        text: [
          `Rule: ${alert.rule}`,
          `Severity: ${alert.severity}`,
          `Details: ${JSON.stringify(alert.payload, null, 2)}`,
          '',
          'Open your dashboard for details and acknowledgement.',
        ].join('\n'),
      });
      if ('message' in info) {
        this.logger.log(`alert email (json transport) to ${to}: ${alert.rule}`);
      }
    } catch (error) {
      this.logger.error(`alert email to ${to} failed: ${(error as Error).message}`);
    }
  }
}
