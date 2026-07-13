import { Injectable, Logger } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';

import { AppConfigService } from '../config/app-config.service';

/**
 * Email notifications (§5.4). Prefers the Resend HTTP API when a key is
 * available — PaaS hosts like Railway block outbound SMTP ports, which
 * surfaces as "Connection timeout". Falls back to SMTP (mailhog in dev),
 * then to a JSON transport that only logs.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly transporter: Transporter;
  private readonly resendApiKey: string | null;
  private static readonly FROM = 'Veazen Alerts <alerts@veazen.app>';

  constructor(config: AppConfigService) {
    this.resendApiKey = config.resendApiKey;
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
    const subject = `[Veazen] ${alert.severity.toUpperCase()} alert: ${alert.rule}`;
    const text = [
      `Rule: ${alert.rule}`,
      `Severity: ${alert.severity}`,
      `Details: ${JSON.stringify(alert.payload, null, 2)}`,
      '',
      'Open your dashboard for details and acknowledgement.',
    ].join('\n');
    try {
      if (this.resendApiKey) {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${this.resendApiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ from: NotificationService.FROM, to, subject, text }),
        });
        if (!res.ok) {
          throw new Error(`Resend API ${res.status}: ${(await res.text()).slice(0, 200)}`);
        }
        this.logger.log(`alert email sent (Resend API) to ${to}: ${alert.rule}`);
        return;
      }
      const info = await this.transporter.sendMail({
        from: NotificationService.FROM,
        to,
        subject,
        text,
      });
      if ('message' in info) {
        this.logger.log(`alert email (json transport) to ${to}: ${alert.rule}`);
      }
    } catch (error) {
      this.logger.error(`alert email to ${to} failed: ${(error as Error).message}`);
    }
  }
}
