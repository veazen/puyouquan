'use strict';
/* v70.6 对拍快照（集成）：tv_v706eng / tv_v706input / tv_v706int 要和 v70.5（7af5743）比的那几处，CI 浅克隆取不到 7af5743 时改读仓库里的快照。
   tests/fixtures/v706_ref_snap.json＝{ ref, note, <套件段>: {...} }，各套件只写自己那一段（node tv_v706xxx.js --write-snap，用 git show 7af5743 的页面现场生成）。
   取得到基线页时照旧现场比（快照不参与）；取不到时比快照——快照里存的是基线页的输出摘要（sha1 / 几何子集 / 文本），样本谱也一并存进去，
   这样以后导入代码有意改了，快照对拍照样只比「同一份谱在两版上的谱面」。deploy.yml 不必补取 7af5743。 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const FILE = path.join(__dirname, 'fixtures', 'v706_ref_snap.json');
const REF = '7af5743';
const H1 = s => crypto.createHash('sha1').update(String(s)).digest('hex');
const loadAll = () => { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (_) { return {}; } };
const section = k => loadAll()[k] || null;
const save = (k, v) => {
  const all = loadAll();
  all.ref = REF;
  all.note = 'v70.6 对拍快照：git show ' + REF + ':muse-tab/index.html 页面的输出摘要；各段由对应套件 --write-snap 生成（CI 取不到基线提交时读这里）';
  all[k] = v;
  const keys = ['ref', 'note'].concat(Object.keys(all).filter(x => x !== 'ref' && x !== 'note').sort());
  fs.writeFileSync(FILE, JSON.stringify(Object.fromEntries(keys.map(x => [x, all[x]])), null, 1) + '\n');
};
module.exports = { FILE, REF, H1, section, save };
