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
  private readonly dashboardAlertsUrl: string;
  private static readonly FROM = 'Veazen Alerts <alerts@veazen.app>';

  constructor(config: AppConfigService) {
    this.resendApiKey = config.resendApiKey;
    this.dashboardAlertsUrl = `${config.publicVerifyBaseUrl.replace(/\/$/, '')}/dashboard/alerts`;
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

  /** Human-readable rule explanations (zh + en) — raw JSON reads as noise. */
  private static readonly RULE_TEXT: Record<string, { zh: string; en: string }> = {
    duplicate_scratch: {
      zh: '暗码被二次核销 —— 同一个一次性暗码被再次提交，商品可能被仿冒或复制',
      en: 'A one-time scratch code was submitted again — possible counterfeit or copied code',
    },
    geo_velocity: {
      zh: '异地飞行扫码 —— 同一枚码在不可能的时间内出现在两地',
      en: 'Impossible travel — the same code was scanned in two distant locations too quickly',
    },
    out_of_market: {
      zh: '疑似窜货 —— 该批次大量扫码来自目标市场之外',
      en: 'Possible gray-market diversion — many scans of this batch come from outside the target market',
    },
  };

  private static readonly SEVERITY_ZH: Record<string, string> = {
    critical: '严重',
    warning: '警告',
    info: '提示',
  };

  async sendAlertEmail(
    to: string,
    alert: {
      rule: string;
      severity: string;
      payload: Record<string, unknown>;
      serial?: string | null;
    },
  ): Promise<void> {
    const ruleText = NotificationService.RULE_TEXT[alert.rule];
    const severityZh = NotificationService.SEVERITY_ZH[alert.severity] ?? alert.severity;
    const subject = `[Veazen] ${severityZh}告警：${ruleText ? ruleText.zh.split(' ——')[0] : alert.rule}`;
    const country = typeof alert.payload.country === 'string' ? alert.payload.country : null;
    const text = [
      '【Veazen 安全告警】',
      '',
      `情况：${ruleText?.zh ?? alert.rule}`,
      `级别：${severityZh}`,
      ...(alert.serial ? [`涉及防伪码：${alert.serial}`] : []),
      ...(country ? [`发生地：${country}`] : []),
      `时间：${new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC`,
      '',
      '请登录控制台查看详情并处理：',
      this.dashboardAlertsUrl,
      '',
      '——',
      `[EN] ${ruleText?.en ?? alert.rule} · severity: ${alert.severity}` +
        (alert.serial ? ` · serial: ${alert.serial}` : ''),
      '',
      '此邮件由 Veazen 自动发送，请勿回复。',
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
