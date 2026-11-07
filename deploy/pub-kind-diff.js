#!/usr/bin/env node
'use strict';
/* v70.5 已发布谱分类对拍（规格 docs/spec-2026-11-v705.md §10.3 Z、§13；恢复演练 docs/runbook-restore-drill.md §4b）。
   用新旧两份统一谱名表（各自目录里的 kindname.js＋scoredata.js）对全部已发布谱各跑一次 viewOf / pubNameOf / pubKindOf，逐首比 JSON：
   v70.5 新增的 SD_NUM 三键（voxLayer / hid / lay）会改变 viewOf 的清洗结果，结构上「没有 voxLayer ＝ 原样」之外再实跑一次。
   只读：不写库、不写仓库；输出只有计数与谱 id（不输出谱面内容——id 不是敏感信息，谱面内容不进聊天 / 工单）。
   用法：
     node deploy/pub-kind-diff.js <快照.db> <旧目录> <新目录>                 # 恢复演练快照副本（node:sqlite，只读打开）
     node deploy/pub-kind-diff.js --api <站点根，如 https://api.puyouquan.com> <旧目录> <新目录> [--save <目录>]
       公开接口：/pub/sitemap.xml 取全部 id，再逐首 GET /api/pub/scores/<id>（公开数据，不需要凭据；注意：每取一首该谱浏览数 +1）。
       --save＝把取到的谱存成 <目录>/<id>.json 便于复跑（只落在给定目录，如会话 scratchpad，不进仓库）；
     node deploy/pub-kind-diff.js --dir <目录> <旧目录> <新目录>               # 复跑 --save 存下的 *.json
   旧目录＝线上现用的 api/（或 git show <基线>:api/kindname.js / scoredata.js 落的临时目录）；新目录＝待发版提交的同名两份。
   退出码：不同 0 首＝0；有不同＝1；参数 / 读取错误＝2 */
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const die = (msg) => { console.error(msg); process.exit(2); };
const flag = (k) => { const i = argv.indexOf(k); if (i < 0) return null; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const api = flag('--api'), dir = flag('--dir'), save = flag('--save');
const [srcArg, oldDir, newDir] = api || dir ? [null, argv[0], argv[1]] : argv;
if (!oldDir || !newDir) die('用法见文件头注释：node deploy/pub-kind-diff.js <快照.db>|--api <站点>|--dir <目录> <旧目录> <新目录>');
const load = (d) => {
  const p = path.resolve(d, 'kindname.js');
  if (!fs.existsSync(p) || !fs.existsSync(path.resolve(d, 'scoredata.js'))) die('目录里要有 kindname.js 与 scoredata.js：' + d);
  return require(p);
};
const KO = load(oldDir), KN = load(newDir);
if (KO === KN) die('新旧两份是同一个模块（目录相同？）');

/* 逐首：viewOf（清洗＋规整后的观看页谱）/ pubNameOf（谱名）/ pubKindOf（谱类 type、typeLabel、谱种、分面）；各自兜底，抛错记成 ERR */
const sig = (K, d) => {
  const one = (fn) => { try { return JSON.stringify(fn()); } catch (e) { return 'ERR:' + (e && e.message || e); } };
  return { view: one(() => K.viewOf(JSON.parse(JSON.stringify(d)))), name: one(() => K.pubNameOf(JSON.parse(JSON.stringify(d)))), kind: one(() => K.pubKindOf(JSON.parse(JSON.stringify(d)))) };
};

async function rowsOf() {
  if (dir) {
    return fs.readdirSync(dir).filter((f) => /\.json$/.test(f)).sort().map((f) => {
      const id = f.replace(/\.json$/, ''); let data = null; try { data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (_) { data = undefined; }
      return { id, data };
    });
  }
  if (api) {
    const base = api.replace(/\/+$/, '');
    const get = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(r.status + ' ' + u); return r; };
    const xml = await (await get(base + '/pub/sitemap.xml')).text();
    const ids = [...new Set([...xml.matchAll(/\/pub\/([A-Za-z0-9_-]+)<\/loc>/g)].map((m) => m[1]))];
    const out = [];
    if (save) fs.mkdirSync(save, { recursive: true });
    for (const id of ids) {
      let data;
      try { const j = await (await get(base + '/api/pub/scores/' + encodeURIComponent(id))).json(); data = j && j.score ? j.score.data : undefined; }
      catch (e) { console.error('取不到 ' + id + '：' + (e && e.message || e)); data = undefined; }
      if (save && data !== undefined) fs.writeFileSync(path.join(save, id + '.json'), JSON.stringify(data));
      out.push({ id, data });
    }
    return out;
  }
  let DatabaseSync; try { ({ DatabaseSync } = require('node:sqlite')); } catch (_) { die('当前 node 没有 node:sqlite（需 Node 22.5+）'); }
  if (!fs.existsSync(srcArg)) die('快照不存在：' + srcArg);
  const db = new DatabaseSync(srcArg, { readOnly: true });
  try {
    return db.prepare("SELECT id, pub_data AS data FROM scores WHERE status = 'published' AND pub_data IS NOT NULL ORDER BY id").all()
      .map((r) => { let data; try { data = JSON.parse(r.data); } catch (_) { data = undefined; } return { id: r.id, data }; });
  } finally { db.close(); }
}

(async () => {
  const rows = await rowsOf();
  const diff = { view: [], name: [], kind: [] }, unreadable = [];
  for (const r of rows) {
    if (r.data === undefined) { unreadable.push(r.id); continue; }
    const a = sig(KO, r.data), b = sig(KN, r.data);
    for (const k of ['view', 'name', 'kind']) if (a[k] !== b[k]) diff[k].push(r.id);
  }
  const any = new Set([...diff.view, ...diff.name, ...diff.kind]);
  console.log('已发布 ' + rows.length + ' 首，viewOf / pubNameOf / pubKindOf 不同 ' + any.size + ' 首' + (unreadable.length ? '（读不到 / 解析失败 ' + unreadable.length + ' 首，未计入）' : ''));
  for (const k of ['view', 'name', 'kind']) if (diff[k].length) console.log('  ' + ({ view: 'viewOf', name: 'pubNameOf', kind: 'pubKindOf' })[k] + ' 不同：' + diff[k].join(' '));
  if (unreadable.length) console.log('  读不到：' + unreadable.join(' '));
  process.exit(any.size ? 1 : 0);
})().catch((e) => die('对拍失败：' + (e && e.message || e)));
