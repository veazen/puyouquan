'use strict';
/* v62.7 A6 异地备份：零依赖 S3 兼容对象存储客户端（AWS Signature V4）。
   腾讯云 COS、阿里云 OSS（S3 兼容端点）、AWS S3、MinIO 都认这套签名；只实现备份要用的三件事：上传 / 列举 / 删除。
   凭据只从环境变量来（/etc/puyouquan/api.env），绝不进仓库：
     BACKUP_S3_ENDPOINT  端点主机，不含桶名，如 cos.ap-guangzhou.myqcloud.com / s3.oss-cn-hangzhou.aliyuncs.com
     BACKUP_S3_BUCKET    桶名（COS 形如 name-1250000000）
     BACKUP_S3_REGION    区域，如 ap-guangzhou / oss-cn-hangzhou / us-east-1
     BACKUP_S3_KEY / BACKUP_S3_SECRET  访问密钥（建议子账号、只授权该桶该前缀的读写删）
     BACKUP_S3_PREFIX    对象前缀（默认 pyq-db/）
     BACKUP_S3_SCHEME    默认 https；仅本地测试用 http
     BACKUP_S3_PATHSTYLE 设 1 走路径式寻址（仅 s3.test.js 的本地模拟服务用——127.0.0.1 没法做子域名）
   寻址用虚拟主机式（https://桶.端点/对象），COS 已不支持路径式。 */
const crypto = require('node:crypto');

const sha256hex = b => crypto.createHash('sha256').update(b).digest('hex');
const hmac = (k, s) => crypto.createHmac('sha256', k).update(s).digest();
const amzDate = d => d.toISOString().replace(/[:-]|\.\d{3}/g, '');           // 20130524T000000Z
const enc = s => encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());

/* 计算 Authorization 头（纯函数，便于用 AWS 官方示例向量单测）。
   path 为已编码的绝对路径；query 为 {k:v}；headers 为小写键名（必须含 host 与 x-amz-date、x-amz-content-sha256） */
function signV4({ method, path, query, headers, payloadHash, region, key, secret, service = 's3' }) {
  const date = headers['x-amz-date'], day = date.slice(0, 8);
  const qs = Object.keys(query || {}).sort().map(k => enc(k) + '=' + enc(String(query[k]))).join('&');
  const names = Object.keys(headers).map(h => h.toLowerCase()).sort();
  const canonHeaders = names.map(h => h + ':' + String(headers[h]).trim().replace(/\s+/g, ' ') + '\n').join('');
  const signed = names.join(';');
  const canonReq = [method, path, qs, canonHeaders, signed, payloadHash].join('\n');
  const scope = `${day}/${region}/${service}/aws4_request`;
  const sts = ['AWS4-HMAC-SHA256', date, scope, sha256hex(canonReq)].join('\n');
  const kSign = hmac(hmac(hmac(hmac('AWS4' + secret, day), region), service), 'aws4_request');
  const sig = crypto.createHmac('sha256', kSign).update(sts).digest('hex');
  return `AWS4-HMAC-SHA256 Credential=${key}/${scope}, SignedHeaders=${signed}, Signature=${sig}`;
}

function cfgFromEnv(env = process.env) {
  const c = { endpoint: env.BACKUP_S3_ENDPOINT, bucket: env.BACKUP_S3_BUCKET, region: env.BACKUP_S3_REGION,
    key: env.BACKUP_S3_KEY, secret: env.BACKUP_S3_SECRET, prefix: env.BACKUP_S3_PREFIX || 'pyq-db/',
    scheme: env.BACKUP_S3_SCHEME === 'http' ? 'http' : 'https', pathStyle: env.BACKUP_S3_PATHSTYLE === '1' };
  return (c.endpoint && c.bucket && c.region && c.key && c.secret) ? c : null;
}

async function request(c, method, objKey, { query, body, fetchFn = fetch, now = new Date(), binary = false } = {}) {
  const host = c.pathStyle ? c.endpoint : c.bucket + '.' + c.endpoint;
  const path = (c.pathStyle ? '/' + enc(c.bucket) : '') + '/' + (objKey ? objKey.split('/').map(enc).join('/') : '');
  const payloadHash = sha256hex(body || '');
  const headers = { host, 'x-amz-date': amzDate(now), 'x-amz-content-sha256': payloadHash };
  const auth = signV4({ method, path, query, headers, payloadHash, region: c.region, key: c.key, secret: c.secret });
  const qs = Object.keys(query || {}).sort().map(k => enc(k) + '=' + enc(String(query[k]))).join('&');
  const url = `${c.scheme}://${host}${path}${qs ? '?' + qs : ''}`;
  const h = { 'x-amz-date': headers['x-amz-date'], 'x-amz-content-sha256': payloadHash, Authorization: auth };
  const r = await fetchFn(url, { method, headers: h, body: body || undefined, signal: AbortSignal.timeout(300000) });
  if (r.status >= 300) { const t = await r.text(); const e = new Error(`对象存储 ${method} ${objKey || '/'} 失败：HTTP ${r.status} ${t.slice(0, 200)}`); e.status = r.status; throw e; }
  return binary ? Buffer.from(await r.arrayBuffer()) : r.text();
}
const putObject = (c, k, body, o) => request(c, 'PUT', k, { ...o, body });
const deleteObject = (c, k, o) => request(c, 'DELETE', k, o);
const getObject = (c, k, o) => request(c, 'GET', k, { ...o, binary: true });
async function listKeys(c, prefix, o) {
  const keys = []; let token = '';
  for (let i = 0; i < 50; i++) {                 // 分页兜底（保留份数远小于单页 1000）
    const q = { 'list-type': 2, prefix }; if (token) q['continuation-token'] = token;
    const x = await request(c, 'GET', '', { ...o, query: q });
    for (const m of x.matchAll(/<Key>([^<]+)<\/Key>/g)) keys.push(m[1].replace(/&amp;/g, '&'));
    const t = /<NextContinuationToken>([^<]+)<\/NextContinuationToken>/.exec(x);
    if (!t || !/<IsTruncated>true<\/IsTruncated>/.test(x)) break;
    token = t[1];
  }
  return keys;
}

module.exports = { signV4, cfgFromEnv, putObject, getObject, deleteObject, listKeys, amzDate, sha256hex };
