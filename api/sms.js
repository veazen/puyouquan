'use strict';
// 谱友圈 API · 阿里云短信（RPC 签名 V1，零依赖实现）
// 未配置 AK 时：DEV_OTP=1 则打印验证码到日志（开发/联调），否则返回 503。
const crypto = require('node:crypto');

const pe = s => encodeURIComponent(s).replace(/\+/g, '%20').replace(/\*/g, '%2A').replace(/%7E/g, '~');

async function sendSms(phone, code) {
  const AK = process.env.ALIYUN_AK_ID, SK = process.env.ALIYUN_AK_SECRET;
  const sign = process.env.SMS_SIGN || '谱友圈', tpl = process.env.SMS_TEMPLATE;
  if (!AK || !SK || !tpl) {
    if (process.env.DEV_OTP === '1') { console.log(`[DEV_OTP] ${phone} -> ${code}`); return; }
    const e = new Error('短信服务未配置'); e.status = 503; throw e;
  }
  const params = {
    AccessKeyId: AK, Action: 'SendSms', Format: 'JSON',
    PhoneNumbers: phone, RegionId: 'cn-hangzhou', SignName: sign,
    SignatureMethod: 'HMAC-SHA1', SignatureNonce: crypto.randomUUID(),
    SignatureVersion: '1.0', TemplateCode: tpl,
    TemplateParam: JSON.stringify({ code }),
    Timestamp: new Date().toISOString().replace(/\.\d{3}/, ''), Version: '2017-05-25',
  };
  const qstr = Object.keys(params).sort().map(k => pe(k) + '=' + pe(params[k])).join('&');
  const strToSign = 'GET&%2F&' + pe(qstr);
  const sig = crypto.createHmac('sha1', SK + '&').update(strToSign).digest('base64');
  const res = await fetch(`https://dysmsapi.aliyuncs.com/?Signature=${pe(sig)}&${qstr}`, { signal: AbortSignal.timeout(10000) });
  const j = await res.json().catch(() => ({}));
  if (j.Code !== 'OK') {
    console.error('短信发送失败:', j.Code, j.Message);
    const e = new Error('短信发送失败'); e.status = 502; throw e;
  }
}

module.exports = { sendSms };
