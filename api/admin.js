'use strict';
/* 谱友圈 · CLI 管理工具（v45.3，零依赖）。在服务器上执行（读取与 pyq-api 相同的 DB_PATH）：
     ⚠️ node 装在 /opt/node（不在 pyq 用户 PATH 里，systemd 单元同样用绝对路径），务必写全路径：
        cd /opt/puyouquan/api
        sudo -u pyq /opt/node/bin/node admin.js <命令> …
     DB 默认 /var/lib/puyouquan/pyq.db（与 /etc/puyouquan/api.env 一致），无需额外指定。

     node admin.js user <手机号>                    查用户 + 权益 + 曲谱数
     node admin.js set-role <手机号> <角色>         改角色：user / creator / admin（首个管理员只能在此任命）
     node admin.js users [n]                        最近 n 个用户 + 微信绑定/unionid 情况（默认 20）
     node admin.js admins                           列出全部平台管理员
     node admin.js logs [n]                         最近 n 条管理审计日志（默认 50）
     node admin.js grant <手机号> <kind> [天数]     授予权益（天数省略=永久；如 grant 138... vip 365）
     node admin.js revoke <手机号> <kind>           撤销该类全部权益
     node admin.js gen-codes <数量> <kind> [天数]   批量生成兑换码（打印到 stdout，自行保存）
     node admin.js codes [n]                        最近 n 个兑换码（默认 50）
     node admin.js orders [n]                       最近 n 笔订单（默认 50）
     node admin.js stats [天数]                     总量 + 近 N 天事件漏斗（默认 7）
     node admin.js sold <kind>                      v62.9 某权益已付款订单 + 已兑换码明细（如 sold pack_kaobian，核查零交付）
     node admin.js reserves                         v62.9 各内容预约登记人数
     node admin.js reports [n]                      v62.9 最近 n 条未处理举报（默认 50）
     node admin.js seed-fix [--apply] [--force]     v63.3 官方示例谱（小星星/欢乐颂）按仓库新内容修订：默认只列计划；
                                                    --apply 写入并刷新发布快照；只动官方账号、从未被人改过的同名谱（--force 连改过的也覆盖）
     node admin.js scan-xss [--quarantine]          v62.5 扫描全部云端谱面的危险字段（与 PUT 校验同口径）；
                                                    加 --quarantine 把命中的已发布/待审谱打回「驳回」并写明原因（谱主在个人中心可见）
   kind 约定：vip=会员(配额2000) / pack_kaobian=考编内容包 / 其他自定义。
   注意：生产执行需 sudo -u pyq 或 root（DB 文件属 pyq）；本工具不经 HTTP、无认证面。 */
const crypto = require('node:crypto');
const { db, q, now, seedDemoScores } = require('./db');
const { scoreDataDanger } = require('./scoredata');

const [, , cmd, ...args] = process.argv;
const fmtTs = s => s ? new Date(s * 1000).toISOString().replace('T', ' ').slice(0, 19) : '-';
const fmtExp = e => e === 0 ? '永久' : fmtTs(e) + (e > now() ? '' : '（已过期）');
const findUser = phone => {
  const u = q.userByPhone.get(String(phone || ''));
  if (!u) { console.error('用户不存在：' + phone); process.exit(1); }
  return u;
};
/* 兑换码：PYQ-XXXX-XXXX-XXXX，字母表剔除易混淆字符(0O1I) */
const AB = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const genCode = () => 'PYQ-' + Array.from({ length: 3 }, () =>
  Array.from(crypto.randomBytes(4)).map(b => AB[b % AB.length]).join('')).join('-');

const cmds = {
  /* v63.3 A5（P2-69 / D-05）：种子谱只在空库时写入，线上存量要靠这条命令修订（评审团：「发版后需负责人在后台逐项确认，
     或运行一次性管理员修订脚本」）。判定「没被人改过」＝ updated_at = created_at（种子写入时两者相等）。 */
  'seed-fix'(...flags) {
    const apply = flags.includes('--apply'), force = flags.includes('--force');
    const sys = db.prepare('SELECT id FROM users WHERE phone = ?').get('00000000000');
    if (!sys) { console.log('没有官方账号（库里从未写入过种子），无需修订'); return; }
    let plan = 0, done = 0;
    for (const d of seedDemoScores()) {
      const rows = db.prepare('SELECT id, title, status, data, created_at, updated_at, pub_at FROM scores WHERE user_id = ? AND title = ?').all(sys.id, d.title);
      if (!rows.length) { console.log(`《${d.title}》：库里没有官方同名谱，跳过`); continue; }
      const want = JSON.stringify(d.data);
      for (const r of rows) {
        if (r.data === want) { console.log(`《${d.title}》 ${r.id}：已是最新`); continue; }
        if (r.updated_at !== r.created_at && !force) { console.log(`《${d.title}》 ${r.id}：被人改过（updated_at≠created_at），不动；确需覆盖加 --force`); continue; }
        plan++;
        if (!apply) { console.log(`《${d.title}》 ${r.id}：待修订（${r.status}）——加 --apply 执行`); continue; }
        db.prepare('UPDATE scores SET data = ? WHERE id = ?').run(want, r.id);
        if (r.status === 'published') q.scoreSnap.run(r.pub_at || now(), r.id);   // 刷新外发快照，保持原上架时间与排序
        done++; console.log(`《${d.title}》 ${r.id}：已修订${r.status === 'published' ? '并刷新发布快照' : ''}`);
      }
    }
    console.log(apply ? `完成：修订 ${done} 首` : `计划：${plan} 首待修订（未写入）`);
  },
  user(phone) {
    const u = findUser(phone);
    console.log(`id=${u.id}\n昵称=${u.nickname}  角色=${u.role}  注册=${fmtTs(u.created_at)}  微信=${u.wx_openid ? '已绑' : '未绑'}`);
    console.log('曲谱数=' + q.scoreCount.get(u.id).n);
    const t = now(), ents = q.entList.all(u.id);
    console.log(ents.length ? '权益：' : '权益：无');
    ents.forEach(e => console.log(`  ${e.kind}  到期=${fmtExp(e.expires_at)}  来源=${e.source}  ${e.expires_at !== 0 && e.expires_at <= t ? '[过期]' : '[有效]'}`));
    (q.orderByUser.all(u.id) || []).slice(0, 5).forEach(o =>
      console.log(`  订单 ${o.kind} ¥${(o.amount_fen / 100).toFixed(2)} ${o.channel} ${o.status} ${fmtTs(o.created_at)}`));
  },
  /* v60.0：首个平台管理员只能在服务器上任命——HTTP 侧无任何自助提权路径。
     admin 天然含创作者权限；降级同样走这里（网页端不允许管理员取消自己的身份）。 */
  'set-role'(phone, role) {
    if (!['user', 'creator', 'admin'].includes(role)) {
      console.error('用法：set-role <手机号> <user|creator|admin>'); process.exit(1);
    }
    const u = findUser(phone);
    const old = u.role;
    q.userSetRole.run(role, u.id);
    q.adminLogAdd.run(u.id, 'cli:set-role', u.id, '服务器 CLI 任命：' + old + '→' + role, now());
    console.log(`已把 ${u.nickname}(${phone}) 的角色 ${old} 改为 ${role}`);
    if (role === 'admin') console.log('提示：该用户重新打开 https://www.puyouquan.com/me.html 即可看到「平台管理」页签。');
  },
  /* v60.2：最近注册用户 + 微信绑定情况。诊断「小程序账号是否与网页账号分裂」——
     unionid=无 说明 jscode2session 没返回 unionid，即小程序尚未绑到与网站应用同一个开放平台账号，
     此时小程序登录只能按 openid 另建号，与网页微信登录不是同一个账号。 */
  users(n) {
    const rows = db.prepare(`SELECT phone,nickname,role,wx_openid,wx_unionid,created_at
                             FROM users ORDER BY created_at DESC LIMIT ?`).all(Math.min(200, +n || 20));
    if (!rows.length) return console.log('暂无用户。');
    console.log('注册时间              手机号        昵称            角色      openid  unionid');
    rows.forEach(r => console.log(
      [fmtTs(r.created_at).padEnd(20),
       (/^\d{11}$/.test(r.phone || '') ? r.phone : '(微信登录)').padEnd(13),
       String(r.nickname || '').slice(0, 14).padEnd(15),
       String(r.role).padEnd(9),
       (r.wx_openid ? '有' : '无').padEnd(7),
       r.wx_unionid ? '有' : '无'].join('')));
    const wx = rows.filter(r => r.wx_openid);
    if (wx.length && wx.every(r => !r.wx_unionid))
      console.log('\n⚠️ 所有微信号都没有 unionid：小程序/公众号与网站应用未绑在同一个微信开放平台账号下，账号会分裂。');
  },
  admins() {
    const rows = db.prepare("SELECT id,phone,nickname,created_at FROM users WHERE role='admin' ORDER BY created_at").all();
    if (!rows.length) return console.log('当前没有平台管理员——用 set-role <手机号> admin 任命第一个。');
    rows.forEach(r => console.log(`${r.phone || '(微信登录)'}  ${r.nickname}  id=${r.id}  注册=${fmtTs(r.created_at)}`));
  },
  logs(n) {
    const rows = q.adminLogList.all(Math.min(500, +n || 50));
    if (!rows.length) return console.log('暂无管理审计日志。');
    rows.forEach(l => console.log(`${fmtTs(l.created_at)}  ${l.admin_name || l.admin_phone || l.admin_id}  ${l.action}  ${l.target}  ${l.detail}`));
  },
  grant(phone, kind, days) {
    if (!kind) { console.error('用法：grant <手机号> <kind> [天数]'); process.exit(1); }
    const u = findUser(phone);
    const t = now();
    let expires = 0;
    if (days && +days > 0) {
      const cur = q.entActive.get(u.id, kind, t);
      expires = ((cur && cur.expires_at > t) ? cur.expires_at : t) + (+days) * 86400;
    }
    q.entAdd.run(crypto.randomUUID(), u.id, kind, expires, 'admin', t);
    q.orderCreate.run(crypto.randomUUID(), u.id, kind, 0, 'admin', null, 'paid', t, t);
    console.log(`已授予 ${u.nickname}(${phone}) ${kind} 到期=${fmtExp(expires)}`);
  },
  revoke(phone, kind) {
    if (!kind) { console.error('用法：revoke <手机号> <kind>'); process.exit(1); }
    const u = findUser(phone);
    const r = q.entDel.run(u.id, kind);
    console.log(`已撤销 ${phone} 的 ${kind}（${r.changes} 条）`);
  },
  'gen-codes'(n, kind, days) {
    n = Math.max(1, Math.min(1000, +n || 0));
    if (!kind) { console.error('用法：gen-codes <数量> <kind> [天数]'); process.exit(1); }
    const t = now(), out = [];
    for (let i = 0; i < n; i++) {
      let code;
      do { code = genCode(); } while (q.redeemGet.get(code));
      q.redeemAdd.run(code, kind, +days > 0 ? +days : 0, t);
      out.push(code);
    }
    console.log(`已生成 ${n} 个兑换码（kind=${kind} 天数=${+days > 0 ? days : '永久'}）：`);
    out.forEach(c => console.log(c));
  },
  codes(n) {
    q.redeemList.all(Math.min(500, +n || 50)).forEach(r =>
      console.log(`${r.code}  ${r.kind}  ${r.days > 0 ? r.days + '天' : '永久'}  ${r.used_by ? '已用@' + fmtTs(r.used_at) : '未用'}`));
  },
  orders(n) {
    q.orderList.all(Math.min(500, +n || 50)).forEach(o =>
      console.log(`${fmtTs(o.created_at)}  ${o.kind}  ¥${(o.amount_fen / 100).toFixed(2)}  ${o.channel}  ${o.status}  user=${o.user_id.slice(0, 8)}`));
  },
  sold(kind) {
    if (!kind) { console.error('用法：node admin.js sold <kind>'); process.exit(1); }
    const os = q.entSoldOrders.all(kind), cs = q.entUsedCodes.all(kind);
    os.forEach(o => console.log(`订单 ${o.id}  user=${String(o.user_id).slice(0, 8)}  ¥${(o.amount_fen / 100).toFixed(2)}  ${o.channel}  付款 ${fmtTs(o.paid_at)}`));
    cs.forEach(c => console.log(`兑换码 ${c.code}  user=${String(c.used_by).slice(0, 8)}  兑换 ${fmtTs(c.used_at)}`));
    console.log(`${kind}：已付款订单 ${os.length} 笔（合计 ¥${(os.reduce((a, o) => a + o.amount_fen, 0) / 100).toFixed(2)}），已兑换码 ${cs.length} 个`);
  },
  reserves() { const r = q.reserveCount.all(); if (!r.length) console.log('还没有预约'); r.forEach(x => console.log(`${x.kind}  ${x.n} 人`)); },
  reports(n) {
    q.reportOpen.all(Math.min(500, +n || 50)).forEach(r => console.log(`${fmtTs(r.created_at)}  ${r.score_id}  《${r.title || ''}》  ${r.reason}  ${r.note || ''}  （该谱未处理 ${r.n} 条）`));
  },
  'scan-xss'(flag) {
    const quarantine = flag === '--quarantine';
    const rows = db.prepare('SELECT id, user_id, title, status, data FROM scores').all();
    let bad = 0;
    for (const r of rows) {
      let d; try { d = JSON.parse(r.data); } catch (_) { console.log(`${r.id}  [${r.status || '私有'}]  无法解析`); bad++; continue; }
      const why = scoreDataDanger(d, '', 'data', 0);
      if (!why) continue;
      bad++;
      console.log(`${r.id}  [${r.status || '私有'}]  user=${String(r.user_id).slice(0, 8)}  《${r.title || ''}》  ${why}`);
      if (quarantine && (r.status === 'published' || r.status === 'pending')) {
        db.prepare("UPDATE scores SET status = 'rejected', review_note = ? WHERE id = ?").run('安全扫描隔离：谱面含不合法数据（' + why.slice(0, 80) + '），请在编辑器重新打开保存后再提交审核', r.id);
        console.log('    → 已隔离（打回驳回）');
      }
    }
    console.log(`共扫描 ${rows.length} 首，命中 ${bad} 首${quarantine ? '' : '（只读扫描；加 --quarantine 隔离已发布/待审谱）'}`);
  },
  stats(days) {
    const d = Math.max(1, +days || 7);
    const c = t => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
    console.log(`用户=${c('users')}  曲谱=${c('scores')}  已发布=${q.pubCount.get().n}  订单=${c('orders')}  权益=${c('entitlements')}  未用码=${db.prepare('SELECT COUNT(*) AS n FROM redeem_codes WHERE used_by IS NULL').get().n}`);
    console.log(`近 ${d} 天事件（次数 / 去重人数）：`);
    q.eventStatsU.all(now() - d * 86400).forEach(e => console.log(`  ${e.name}  ${e.n} / ${e.u}`));
    /* v63.4 A7 北极星与留存（口径见 server.js eventMetrics；此处同源复算，不经 HTTP） */
    const rows = q.eventScan.all(now() - 21 * 86400), link = {}, day = x => Math.floor(x / 86400), t = now();
    rows.forEach(r => { if (r.user_id && r.anon_id) link[r.anon_id] = r.user_id; });
    const key = r => r.user_id || (r.anon_id && link[r.anon_id]) || (r.anon_id ? 'a:' + r.anon_id : null);
    const act = new Map(), done = new Set();
    rows.forEach(r => { const k = key(r); if (!k) return; if (!act.has(k)) act.set(k, new Set()); act.get(k).add(day(r.created_at));
      if (['arrange_done', 'print_dialog', 'export_png', 'publish'].includes(r.name) && r.created_at > t - 7 * 86400) done.add(k); });
    const ret = n => { let base = 0, back = 0; act.forEach(ds => { const f = Math.min(...ds); if (f > day(t) - n) return; base++; if (ds.has(f + n)) back++; });
      return base ? `${back}/${base}（${(back * 100 / base).toFixed(1)}%）` : '样本不足'; };
    console.log(`北极星（近 7 天做出成品谱的人数）=${done.size}   D1 留存=${ret(1)}   D7 留存=${ret(7)}`);
    /* v68.2 界面命令 ui_cmd（口径同 server.js uiModes7；上面的事件表不含 ui_cmd） */
    const ui = { engrave: 0, output: 0, flow: 0, editors: 0 }, t7 = now() - 7 * 86400;
    q.eventUiCmd7.all(t7, t7, t7).forEach(r => { if (r.k === 'mode:engrave') ui.engrave = r.u; else if (r.k === 'mode:output') ui.output = r.u; else if (r.k === 'editors') ui.editors = r.u; else if (r.k === 'flow') ui.flow = r.u; });
    /* v68.2 收尾 ENG-6：两个分母都列——新外壳有操作的人（窄口径）与编辑访客（含手机、旧版布局、只开启动台） */
    console.log(`界面（近 7 天）：用过「排版」${ui.engrave} 人 · 「输出」${ui.output} 人 / 新外壳有操作 ${ui.flow} 人（编辑访客 ${ui.editors} 人，含手机、旧版布局、只开启动台）`);
  },
};

if (!cmds[cmd]) {
  console.log('可用命令：user / users / set-role / admins / logs / grant / revoke / gen-codes / codes / orders / stats / sold / reserves / reports / scan-xss（详见文件头注释）');
  process.exit(cmd ? 1 : 0);
}
cmds[cmd](...args);
