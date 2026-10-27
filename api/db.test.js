'use strict';
// 微信账号 DB 层 + 迁移 + upsert 逻辑集成测试
// 运行：node --experimental-sqlite api/db.test.js
const os = require('node:os'), path = require('node:path');
process.env.DB_PATH = path.join(os.tmpdir(), 'pyq_wxtest_' + process.pid + '.db');
process.env.JWT_SECRET = 'test';
const assert = require('node:assert');
const crypto = require('node:crypto');
const { q, now } = require('./db');
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');

// 复刻 server.js 的 upsertWxUser 逻辑（DB 层等价，验证匹配/建号/占位 phone）
function upsertWx({ openid, unionid, nickname, avatar }) {
  let u = null;
  if (unionid) u = q.userByUnionid.get(unionid);
  if (!u && openid) u = q.userByWxOpenid.get(openid);
  if (u) { q.userBindWx.run(openid || null, unionid || null, u.id); if (avatar) q.userFillAvatar.run(avatar, u.id); return q.userById.get(u.id); }
  const id = crypto.randomUUID();
  const phone = 'wx' + sha256((unionid || openid) + '|wx').slice(0, 18);
  q.userCreateWx.run(id, phone, openid || null, unionid || null, (nickname || '').trim() || ('微信用户' + String(openid || '').slice(-4)), avatar || '', now());
  return q.userById.get(id);
}

let pass = 0, total = 0;
const T = (name, fn) => { total++; try { fn(); pass++; console.log('✅ ' + name); } catch (e) { console.log('❌ ' + name + ': ' + e.message); } };

T('迁移：wx_unionid / avatar 列存在（userCreateWx 可插入）', () => {
  const u = upsertWx({ openid: 'o1', unionid: 'u1', nickname: '小明', avatar: 'http://a/x.png' });
  assert.strictEqual(u.wx_openid, 'o1');
  assert.strictEqual(u.wx_unionid, 'u1');
  assert.strictEqual(u.nickname, '小明');
  assert.strictEqual(u.avatar, 'http://a/x.png');
  assert.ok(u.phone.startsWith('wx') && u.phone.length > 4);   // 合成占位、非真实号
  assert.strictEqual(u.role, 'user');
});
T('unionid 复登：同一 unionid 返回同一账号（不重复建号）', () => {
  const a = upsertWx({ openid: 'o1', unionid: 'u1' });
  const b = upsertWx({ openid: 'o1b', unionid: 'u1' });   // openid 变了也无妨，unionid 统一
  assert.strictEqual(a.id, b.id);
});
T('openid 兜底：无 unionid 时按 openid 匹配/建号', () => {
  const a = upsertWx({ openid: 'noUnion1' });
  const b = upsertWx({ openid: 'noUnion1' });
  assert.strictEqual(a.id, b.id);
  assert.strictEqual(a.wx_unionid, null);
});
T('资料兜底：无昵称时用「微信用户+openid尾4」', () => {
  const u = upsertWx({ openid: 'abcd1234', unionid: 'uNick' });
  assert.strictEqual(u.nickname, '微信用户1234');
});
T('绑定：已有手机号用户可绑微信，之后 unionid 命中该账号（账号统一）', () => {
  const id = crypto.randomUUID();
  q.userCreate.run(id, '13800001111', '谱友1111', now());
  q.userBindWx.run('oBind', 'uBind', id);
  const byU = q.userByUnionid.get('uBind');
  assert.strictEqual(byU.id, id);
  assert.strictEqual(byU.phone, '13800001111');   // 真实手机号保留
  assert.strictEqual(byU.wx_openid, 'oBind');
});
T('userBindWx 用 COALESCE：只传 openid 不清空已有 unionid', () => {
  const id = crypto.randomUUID();
  q.userCreateWx.run(id, 'wxplaceholderXY', 'oC', 'uC', '测试', '', now());
  q.userBindWx.run('oC2', null, id);   // unionid 传 null
  const u = q.userById.get(id);
  assert.strictEqual(u.wx_openid, 'oC2');
  assert.strictEqual(u.wx_unionid, 'uC');   // 未被 null 覆盖
});

T('userSetAvatar：设 data URI / 清空 往返（v58.9 换头像）', () => {
  const id = crypto.randomUUID();
  q.userCreateWx.run(id, 'wxavatartest0001', 'oAv', 'uAv', '头像君', '', now());
  q.userSetAvatar.run('data:image/jpeg;base64,QUJD', id);
  assert.strictEqual(q.userById.get(id).avatar, 'data:image/jpeg;base64,QUJD');
  q.userSetAvatar.run('', id);
  assert.strictEqual(q.userById.get(id).avatar, '');
});

/* v60.8 同秒并列排序回归。
   背景：created_at 是秒级整数，一批管理动作/下单常常全部落在同一秒；
   `ORDER BY created_at DESC LIMIT N` 对并列行的相对顺序在 SQL 里是**未定义**的，
   于是「最近 N 条」会从窗口里随机丢行——CI 快机器上实测把一条 approve 挤出了前 5。
   这两条用例不依赖机器快慢：显式写死同一个 created_at，构造出必然并列的条件，
   所以去掉 db.js 里的 rowid/id tie-breaker 就会红。 */
T('adminLogList：同秒 8 条取前 5 —— 严格按插入倒序，不丢条（v60.8）', () => {
  const admin = crypto.randomUUID();
  q.userCreate.run(admin, '13900002222', '管理员', now());
  const T0 = 1750000000;                        // 写死时间戳：8 条全部同秒
  const acts = ['role', 'grant', 'revoke', 'approve', 'reject', 'grant', 'approve', 'revoke'];
  acts.forEach((a, i) => q.adminLogAdd.run(admin, a, 'tgt' + i, 'd' + i, T0));
  const rows = q.adminLogList.all(5);
  assert.strictEqual(rows.length, 5);
  // 最近 5 条 = 下标 7..3 倒序；target 里带下标，能精确指认「丢了哪条」
  assert.deepStrictEqual(rows.map(r => r.target), ['tgt7', 'tgt6', 'tgt5', 'tgt4', 'tgt3']);
  assert.deepStrictEqual(rows.map(r => r.action), ['revoke', 'approve', 'grant', 'reject', 'approve']);
  // id 严格递减 —— 审计日志的时序保证
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].id > rows[i].id, '审计日志 id 必须严格递减');
});

T('orderByUser：同秒 6 单 —— 订单记录按下单序倒排，不随机丢单（v60.8）', () => {
  const uid = crypto.randomUUID();
  q.userCreate.run(uid, '13900003333', '买家', now());
  const T0 = 1750000100;
  for (let i = 0; i < 6; i++) q.orderCreate.run('od' + i, uid, 'pro', 100 + i, 'admin', null, 'paid', T0, T0);
  const rows = q.orderByUser.all(uid);
  assert.strictEqual(rows.length, 6);
  assert.deepStrictEqual(rows.map(r => r.id), ['od5', 'od4', 'od3', 'od2', 'od1', 'od0']);
});

/* v61.9 官方课程播种：新课补种 / 内容随发版刷新 / 但绝不覆盖管理员的编辑。
   直接复刻 db.js seedCourses 的判定（同一套 q 语句），三种状态各验一次。 */
T('seedCourses：未被改过的官方课随发版刷新内容，被改过的一律不动（v61.9）', () => {
  const { seedCourses } = require('./db');
  const seedList = JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname, 'seed-courses.json'), 'utf8'));
  const seedC = seedList.find(c => c.id === 'course-jianpu-renshi');
  assert.ok(seedList.length >= 3 && seedC, '种子应含 3 门官方课（含《认识简谱》）');
  const jp = q.courseGet.get(seedC.id);
  assert.ok(jp, '启动时应已播种《认识简谱》');
  // ① 播种写入后 updated_at == created_at —— 「没被人改过」的判定依据，破了刷新逻辑就失效
  assert.strictEqual(jp.updated_at, jp.created_at, '播种行的 updated_at 必须等于 created_at');
  const secN = JSON.parse(jp.data).chapters.reduce((a, ch) => a + (ch.sections || []).length, 0);
  assert.ok(secN >= 14, '播种内容应为 2.0 小节结构，实得 ' + secN);

  // ② 把行退回旧版本内容（模拟线上还停在 v61.8）→ 跑真实 seedCourses → 必须被刷新成最新
  const OLD = JSON.stringify({ emoji: '🔢', fam: 'f', chapters: [{ title: '旧章', quiz: [] }] });
  q.courseUpsert.run(jp.id, jp.user_id, jp.title, jp.subtitle, jp.instrument, jp.level,
    jp.weeks, jp.intro, jp.sort, OLD, jp.created_at, jp.created_at);
  seedCourses();
  let row = q.courseGet.get(jp.id);
  assert.strictEqual(row.data, JSON.stringify(seedC.data), '未被改过的官方课应刷新到仓库最新内容');
  assert.strictEqual(row.updated_at, row.created_at, '刷新不得破坏「未被改过」不变量');

  // ③ 管理员改过（updated_at 被抬高）→ 再跑 seedCourses → 人的编辑必须原样留住
  const MINE = JSON.stringify({ emoji: '🔢', fam: 'f', chapters: [{ title: '我改的章', sections: [] }] });
  q.courseUpsert.run(row.id, row.user_id, row.title, row.subtitle, row.instrument, row.level,
    row.weeks, row.intro, row.sort, MINE, row.created_at, row.created_at + 100);
  seedCourses();
  row = q.courseGet.get(jp.id);
  assert.strictEqual(row.data, MINE, '被管理员改过的课程内容绝不能被种子覆盖');

  // ④ 缺课时补种：删掉再跑，应重新插入且状态为已发布
  q.courseDelete.run(seedC.id);
  assert.strictEqual(q.courseGet.get(seedC.id), undefined, '删除后应查不到');
  seedCourses();
  row = q.courseGet.get(seedC.id);
  assert.ok(row && row.status === 'published', '缺失的官方课应被补种并发布');
  assert.strictEqual(row.data, JSON.stringify(seedC.data), '补种内容应与种子一致');
});

/* ---------- v68.2 匿名界面命令 ui_cmd（计划 §5.3）：客户端白名单 + 格式口径与编辑器同一条正则 + 后台查询 ---------- */
T('ui_cmd 在客户端白名单内，服务端格式正则与编辑器 FLOW.track 逐字相同', () => {
  const fs = require('node:fs');
  const src = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
  const ev = /const EVENT_CLIENT = \[([\s\S]*?)\];/.exec(src);
  assert.ok(ev && /'ui_cmd'/.test(ev[1]), 'ui_cmd 不在 EVENT_CLIENT');
  assert.ok(!/EVENT_SERVER_ONLY = new Set\(\[[^\]]*'ui_cmd'/.test(src), 'ui_cmd 不应是服务端专属事件');
  const sre = /const UI_CMD_RE = (\/[^\n]*?\/),/.exec(src);
  const html = fs.readFileSync(path.join(__dirname, '..', 'muse-tab', 'index.html'), 'utf8');
  const ere = /FLOW\.track = \(function\(\)\{\s*const RE = (\/[^\n]*?\/),/.exec(html);
  assert.ok(sre && ere, '读不到两端的格式正则');
  assert.strictEqual(sre[1], ere[1], '服务端与编辑器的 ui_cmd 格式正则不一致');
  assert.strictEqual(sre[1], '/^[a-z][a-z0-9]*(:[a-z0-9:-]+)*$/');
  const re = new RegExp(sre[1].slice(1, -1));
  ['mode:engrave', 'r1:file:new', 'r2:more', 'cmd:go:lay:a4', 'pal:dyn-mf'].forEach(x => assert.ok(re.test(x), x + ' 应合格式'));
  ['《小星星》', 'Mode:Engrave', 'pal:延长号', '1x:a', 'mode:', ''].forEach(x => assert.ok(!re.test(x), x + ' 不应合格式'));
  /* 编辑器真的经 pyqEvent 上报（tv_a7 T1 的「白名单每个事件都有上报点」同一判据） */
  assert.ok(/pyqEvent\('ui_cmd', /.test(html), '编辑器没有 ui_cmd 上报点');
});
T('eventUiCmd7：7 日内用过排版 / 输出的人数（按人去重）＋ 编辑访客；漏斗 eventStatsU 与 eventScan 不含 ui_cmd', () => {
  const t = now(), old = t - 8 * 86400, ADD = (u, a, name, meta, at, landing) => q.eventAddX.run(u, name, meta, at, a, '', landing || '');
  ADD(null, 'anonA', 'ui_cmd', 'mode:engrave', t - 100);
  ADD(null, 'anonA', 'ui_cmd', 'mode:engrave', t - 50);          // 同一人两次：算 1 人
  ADD(null, 'anonB', 'ui_cmd', 'mode:engrave', t - 40);
  ADD('userC', 'anonC', 'ui_cmd', 'mode:engrave', t - 30);       // 登录用户按账号计
  ADD('userC', 'anonC', 'ui_cmd', 'mode:output', t - 20);
  ADD(null, 'anonD', 'ui_cmd', 'pal:fermata', t - 10);           // 非 mode:* 不进「界面」行
  ADD(null, 'anonE', 'ui_cmd', 'mode:output', old);              // 7 日外
  ['anonA', 'anonB', 'anonD'].forEach(a => ADD(null, a, 'visit', '', t - 200, 'zhipu/'));
  ADD('userC', 'anonC', 'visit', '', t - 200, 'zhipu/');
  ADD(null, 'anonF', 'visit', '', t - 200, 'www/kaobian.html');  // 官网访问不算编辑访客
  ADD(null, 'anonG', 'visit', '', old, 'zhipu/');                // 7 日外
  const rows = q.eventUiCmd7.all(t - 7 * 86400, t - 7 * 86400, t - 7 * 86400), by = {};
  rows.forEach(r => { by[r.k] = r.u; });
  /* v68.2 收尾 ENG-6：flow＝7 日内发过任何 ui_cmd 的人（anonA / anonB / userC / anonD；anonE 在 7 日外）——非 mode:* 的 pal:fermata 也算新外壳有操作 */
  assert.deepStrictEqual(by, { 'mode:engrave': 3, 'mode:output': 1, editors: 4, flow: 4 }, JSON.stringify(rows));
  const fl = q.eventStatsU.all(t - 7 * 86400);
  assert.ok(fl.length && !fl.some(r => r.name === 'ui_cmd'), '漏斗里出现了 ui_cmd：' + JSON.stringify(fl));
  assert.ok(fl.some(r => r.name === 'visit' && r.u === 5), '漏斗 visit 人数不对：' + JSON.stringify(fl));
  const sc = q.eventScan.all(t - 21 * 86400);
  assert.ok(sc.length && !sc.some(r => r.name === 'ui_cmd'), 'eventScan 里出现了 ui_cmd');
});

/* v69.3 曲库官方公版谱补种（seedLibrary）：建库即种全 seed-library.json；官方账号、已发布、有发布快照；每首只种一次（重复调用不加、
   删掉的不复活）；只认 lib- 前缀 id；仓库里的 seed-library.json 每首都是能解析的谱面数据且带 CC0 来源 */
T('曲库公版谱：建库补种全部、官方账号发布带快照、再调不重复、删掉不复活', () => {
  const { db, seedLibrary } = require('./db');
  const list = JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname, 'seed-library.json'), 'utf8'));
  assert.ok(list.length >= 10, 'seed-library.json 少于 10 首');
  list.forEach(it => { assert.ok(/^lib-os-lc\d+$/.test(it.id), 'id 不合口径：' + it.id); assert.ok(it.data && Array.isArray(it.data.measures) && it.data.measures.length, it.id + ' 没有小节');
    assert.strictEqual((it.source || {}).license, 'CC0 1.0', it.id + ' 来源许可不是 CC0'); });
  const rows = db.prepare("SELECT id,user_id,status,pub_data IS NOT NULL AS snap FROM scores WHERE id LIKE 'lib-%'").all();
  assert.strictEqual(rows.length, list.length, '建库补种数不对：' + rows.length);
  assert.ok(rows.every(r => r.user_id === 'official0000' && r.status === 'published' && r.snap), '补种的谱不全是官方已发布带快照');
  assert.strictEqual(seedLibrary(list), 0, '再调一次又补种了');
  db.prepare('DELETE FROM scores WHERE id = ?').run(list[0].id);
  assert.strictEqual(seedLibrary(list), 0, '删掉的谱被重新补种');
  assert.strictEqual(seedLibrary([{ id: 'evil-1', title: 'x', data: {} }]), 0, '非 lib- 前缀的 id 也被种了');
  assert.strictEqual(seedLibrary([{ id: 'lib-os-new1', title: '新谱', singer: '某某', data: { v: 3, measures: [{}] } }]), 1, '新 id 没补种');
});

T('曲库公版谱：每首一个事务、id 被别人占用则把占用的谱改到新 id 再种、没人改过的随仓库刷新（发布时间不变）、手工建的不动', () => {
  const { db, seedLibrary } = require('./db');
  const logged = id => !!db.prepare('SELECT 1 FROM seed_log WHERE id = ?').get(id);
  const row = id => db.prepare('SELECT user_id,status,data,pub_data,pub_at,created_at,updated_at FROM scores WHERE id = ?').get(id);
  /* 事务：中途出错（data 缺失 → 绑定失败）整首回滚，seed_log 不留半截；修好后照常补种 */
  assert.strictEqual(seedLibrary([{ id: 'lib-os-tx1', title: '坏' }]), 0, '坏条目被算成补种');
  assert.ok(!logged('lib-os-tx1') && !row('lib-os-tx1'), '出错后 seed_log / 谱留了半截');
  assert.strictEqual(seedLibrary([{ id: 'lib-os-tx1', title: '好', data: { v: 3, measures: [{}] } }]), 1, '修好后没补种');
  /* 占用：别的账号先建了同 id（v69.3 前 PUT 不拦）→ 那份谱连同谱架 / 谱集引用改到新 id（数据不丢），官方谱照常补种 */
  db.prepare("INSERT INTO users(id, phone, nickname, created_at) VALUES('squat001', '13900000001', '抢注', 1)").run();
  db.prepare("INSERT INTO scores(id,user_id,title,data,updated_at,created_at) VALUES('lib-os-sq1','squat001','占位','{\"mine\":1}',1,1)").run();
  db.prepare("INSERT INTO shelf(user_id,score_id,created_at) VALUES('squat001','lib-os-sq1',1)").run();
  db.prepare("INSERT INTO collections(id,user_id,name,created_at) VALUES('csq00001','squat001','我的',1)").run();
  db.prepare("INSERT INTO collection_items(collection_id,score_id,created_at) VALUES('csq00001','lib-os-sq1',1)").run();
  const sq = { id: 'lib-os-sq1', title: '官方', singer: '某某', data: { v: 3, measures: [{}, {}] } };
  assert.strictEqual(seedLibrary([sq]), 1, '被占用的 id 没补种');
  assert.strictEqual(row('lib-os-sq1').user_id, 'official0000', '官方谱没种上');
  const mv = db.prepare("SELECT id,data FROM scores WHERE user_id = 'squat001'").all();
  assert.ok(mv.length === 1 && /^sq[0-9a-f]{12}$/.test(mv[0].id) && mv[0].data === '{"mine":1}', '占用的谱没改到新 id 或数据丢了：' + JSON.stringify(mv));
  assert.ok(db.prepare('SELECT 1 FROM shelf WHERE score_id = ?').get(mv[0].id) && db.prepare('SELECT 1 FROM collection_items WHERE score_id = ?').get(mv[0].id), '谱架 / 谱集引用没跟着改');
  assert.ok(!db.prepare("SELECT 1 FROM shelf WHERE score_id = 'lib-os-sq1'").get(), '谱架还指着官方 id');
  /* 官方账号下手工建的同 id：记为种过、不覆盖，下次启动也不被「刷新」改掉 */
  db.prepare("INSERT INTO scores(id,user_id,title,status,data,updated_at,created_at) VALUES('lib-os-hd1','official0000','手工版','published','{\"hand\":1}',500,500)").run();
  const hd = { id: 'lib-os-hd1', title: '仓库版', singer: '', data: { v: 3, measures: [{}] } };
  assert.strictEqual(seedLibrary([hd]), 0); seedLibrary([hd]);
  assert.strictEqual(row('lib-os-hd1').data, '{"hand":1}', '手工建的同 id 谱被仓库覆盖');
  /* 刷新：没人改过 → 草稿与快照都换成仓库版本、发布时间不变、仍认得出「没被改过」 */
  const v1 = { id: 'lib-os-rf1', title: '刷新', singer: '某某', data: { v: 3, measures: [{}] } };
  seedLibrary([v1]);
  db.prepare("UPDATE scores SET pub_at = 123 WHERE id = 'lib-os-rf1'").run();
  const v2 = { ...v1, data: { v: 3, measures: [{}, {}, {}] } };
  assert.strictEqual(seedLibrary([v2]), 0, '刷新被算成新补种');
  let r = row('lib-os-rf1');
  assert.strictEqual(r.data, JSON.stringify(v2.data), '草稿没刷新');
  assert.strictEqual(r.pub_data, JSON.stringify(v2.data), '发布快照没刷新');
  assert.strictEqual(r.pub_at, 123, '刷新改了发布时间');
  assert.strictEqual(r.updated_at, r.created_at, '刷新后认不出「没被人改过」');
  /* 被人改过（updated_at > created_at）或已下架 → 不动 */
  db.prepare("UPDATE scores SET updated_at = created_at + 5 WHERE id = 'lib-os-rf1'").run();
  seedLibrary([{ ...v1, data: { v: 3, measures: [] } }]);
  assert.strictEqual(row('lib-os-rf1').data, JSON.stringify(v2.data), '改过的谱被仓库覆盖');
  db.prepare("UPDATE scores SET updated_at = created_at, status = 'private' WHERE id = 'lib-os-rf1'").run();
  seedLibrary([{ ...v1, data: { v: 3, measures: [] } }]);
  assert.strictEqual(row('lib-os-rf1').data, JSON.stringify(v2.data), '下架的谱被仓库刷新');
});

setTimeout(() => {
  try { require('node:fs').unlinkSync(process.env.DB_PATH); } catch {}
  console.log('PASS ' + pass + '/' + total);
  process.exit(pass === total ? 0 : 1);
}, 30);
