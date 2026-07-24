'use strict';
// 谱友圈 API · 微信支付纯逻辑（APIv3 · Native 扫码，零依赖，可独立单测）
// 签名=SHA256withRSA(商户私钥)；回调密文=AES-256-GCM(APIv3 密钥)。fetch 可注入以便单测。
// 凭据（mchid/appid/APIv3密钥/商户私钥/证书序列号）由调用方从服务器环境传入，不落代码。
// 安全模型 v1：回调只做解密取单号，发货一律以「主动查单确认 SUCCESS」为准——
// 免去平台证书轮换管理，且伪造回调无法触发发货（查单走商户私钥直连微信）。
const crypto = require('node:crypto');

const HOST = 'https://api.mch.weixin.qq.com';
const nonce = () => crypto.randomBytes(16).toString('hex');
const nowSec = () => Math.floor(Date.now() / 1000);

/* ---- APIv3 请求签名：METHOD\nPATH\nTIMESTAMP\nNONCE\nBODY\n → RSA-SHA256 → Authorization 头 ---- */
function buildAuth({ method, urlPath, body, mchid, serial, privateKey }) {
  const ts = nowSec(), nc = nonce();
  const msg = `${method}\n${urlPath}\n${ts}\n${nc}\n${body || ''}\n`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(msg), privateKey).toString('base64');
  return `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",nonce_str="${nc}",signature="${signature}",timestamp="${ts}",serial_no="${serial}"`;
}

/* ---- 底层请求（fetchFn 可注入）：返回 {status, json} ---- */
async function req(method, urlPath, bodyObj, cfg, fetchFn = fetch) {
  const body = bodyObj ? JSON.stringify(bodyObj) : '';
  const auth = buildAuth({ method, urlPath, body, mchid: cfg.mchid, serial: cfg.serial, privateKey: cfg.privateKey });
  const res = await fetchFn(HOST + urlPath, {
    method,
    headers: { 'Authorization': auth, 'Accept': 'application/json', 'Content-Type': 'application/json',
      'User-Agent': 'puyouquan-pyq-api' },
    body: body || undefined,
    signal: AbortSignal.timeout(10000),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

/* ---- Native 下单：返回 code_url（weixin://wxpay/...，前端转二维码）---- */
async function nativePrepay({ description, outTradeNo, totalFen, notifyUrl }, cfg, fetchFn = fetch) {
  const { status, json } = await req('POST', '/v3/pay/transactions/native', {
    appid: cfg.appid, mchid: cfg.mchid,
    description: String(description).slice(0, 120),
    out_trade_no: outTradeNo,
    notify_url: notifyUrl,
    amount: { total: totalFen, currency: 'CNY' },
  }, cfg, fetchFn);
  if (status !== 200 || !json.code_url) {
    const e = new Error('微信下单失败: ' + (json.message || json.code || status)); e.status = 502; throw e;
  }
  return json.code_url;
}

/* ---- 查单（商户订单号）：返回 trade_state（SUCCESS/NOTPAY/CLOSED/…）---- */
async function queryByOutTradeNo(outTradeNo, cfg, fetchFn = fetch) {
  const p = `/v3/pay/transactions/out-trade-no/${encodeURIComponent(outTradeNo)}?mchid=${encodeURIComponent(cfg.mchid)}`;
  const { status, json } = await req('GET', p, null, cfg, fetchFn);
  if (status !== 200) {
    const e = new Error('微信查单失败: ' + (json.message || json.code || status)); e.status = 502; throw e;
  }
  return { state: json.trade_state || 'UNKNOWN', transactionId: json.transaction_id || '', payerTotal: (json.amount && json.amount.payer_total) || 0 };
}

/* ---- 回调密文解密：AES-256-GCM（APIv3 密钥；tag=密文末 16 字节）→ 内层 JSON ---- */
function decryptNotify({ ciphertext, nonce: iv, associatedData }, apiV3Key) {
  const buf = Buffer.from(ciphertext, 'base64');
  const tag = buf.subarray(buf.length - 16), data = buf.subarray(0, buf.length - 16);
  const d = crypto.createDecipheriv('aes-256-gcm', Buffer.from(apiV3Key), Buffer.from(iv));
  d.setAuthTag(tag);
  if (associatedData) d.setAAD(Buffer.from(associatedData));
  const out = Buffer.concat([d.update(data), d.final()]);
  return JSON.parse(out.toString('utf8'));
}

module.exports = { buildAuth, req, nativePrepay, queryByOutTradeNo, decryptNotify };
