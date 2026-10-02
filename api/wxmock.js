'use strict';
/* v62.6 api/test.sh 专用：本地模拟微信接口（仅测试，生产不加载）。
   server.js 以 WX_API_BASE=http://127.0.0.1:<port> 启动时，wx.js 的小程序换 openid / 取手机号走这里：
     GET  /sns/jscode2session?js_code=<身份>_<任意后缀>  → openid = 'op_' + <身份>（同一身份可无限次换新 code）
     GET  /cgi-bin/token                                  → 固定 access_token
     POST /wxa/business/getuserphonenumber {code:'ph<11位手机号>_<后缀>'} → 该手机号
   用法：node wxmock.js <port> */
const http = require('node:http');
const port = +process.argv[2] || 3198;
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const J = o => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
  if (u.pathname === '/sns/jscode2session') {
    const code = u.searchParams.get('js_code') || '';
    const who = code.replace(/_[^_]*$/, '');
    return who ? J({ openid: 'op_' + who, session_key: 'k' }) : J({ errcode: 40029, errmsg: 'invalid code' });
  }
  if (u.pathname === '/cgi-bin/token') return J({ access_token: 'mocktok', expires_in: 7200 });
  if (u.pathname === '/wxa/business/getuserphonenumber') {
    let body = ''; req.on('data', c => { body += c; });
    req.on('end', () => {
      let code = ''; try { code = JSON.parse(body).code || ''; } catch (_) { }
      const m = /^ph(1\d{10})_/.exec(code);
      J(m ? { errcode: 0, phone_info: { purePhoneNumber: m[1], countryCode: '86' } } : { errcode: 40029, errmsg: 'invalid code' });
    });
    return;
  }
  res.statusCode = 404; res.end('{}');
}).listen(port, '127.0.0.1');
