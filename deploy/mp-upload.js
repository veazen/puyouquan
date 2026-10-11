#!/usr/bin/env node
/* v66.7 小程序自动上传（miniprogram-ci，对应开发者工具的「上传」）
   用法：MP_UPLOAD_KEY="<代码上传密钥全文>" node deploy/mp-upload.js [--dry]
   - 版本号与备注取自 deploy/mp-release.json（小程序版本线 1.1.x，与仓库 vXX 不同步，对照表见 miniprogram/README.md）
   - --dry：只编译出代码包（检查能否编译、看包内文件与大小），不上传；编译也要向微信服务器取项目属性，同样需要密钥
   - 上传成功后，新版本出现在 mp.weixin.qq.com「管理 → 版本管理 → 开发版本」（上传者显示为 ci 机器人 1），
     负责人只需在网页后台点「提交审核」，审核通过后点「发布」
   - 密钥只从环境变量读（GitHub 仓库 secret MP_UPLOAD_KEY），写进临时文件用完即删，绝不落仓库、不打印 */
const fs = require('fs'), os = require('os'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const MP = path.join(ROOT, 'miniprogram');
const dry = process.argv.includes('--dry');
const rel = JSON.parse(fs.readFileSync(path.join(__dirname, 'mp-release.json'), 'utf8'));
const cfg = JSON.parse(fs.readFileSync(path.join(MP, 'project.config.json'), 'utf8'));
if (!/^\d+\.\d+\.\d+$/.test(rel.version || '')) { console.error('mp-release.json 的 version 须为 x.y.z，现为：' + rel.version); process.exit(1); }
let ci;
try { ci = require('miniprogram-ci'); } catch (e) { console.error('缺少依赖 miniprogram-ci（CI 里会先 npm i）'); process.exit(1); }
const key = (process.env.MP_UPLOAD_KEY || '').trim();
if (!key) { console.error('未提供 MP_UPLOAD_KEY（仓库 Settings → Secrets → Actions 里添加，内容为小程序后台下载的代码上传密钥全文）'); process.exit(1); }
const keyPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mpk-')), 'private.key');
fs.writeFileSync(keyPath, key + '\n', { mode: 0o600 });
(async () => {
  try {
    const project = new ci.Project({
      appid: cfg.appid, type: 'miniProgram', projectPath: MP, privateKeyPath: keyPath,
      ignores: ['node_modules/**/*', 'README.md', 'project.private.config.json'],
    });
    const opt = { project, version: rel.version, desc: (rel.desc || '') + (rel.repo ? '（仓库 ' + rel.repo + '）' : ''), setting: { useProjectConfig: true }, robot: 1 };
    if (dry) {
      const out = path.join(os.tmpdir(), 'mp-compiled.zip');
      const res = await ci.getCompiledResult(opt, out);
      const files = Object.keys(res || {});
      const size = files.reduce((a, f) => a + Buffer.byteLength(res[f]), 0);
      console.log('编译通过：' + files.length + ' 个文件，共 ' + (size / 1024).toFixed(1) + ' KB → ' + out);
      console.log(files.sort().join('\n'));
    } else {
      const res = await ci.upload(opt);
      console.log('上传成功：版本 ' + rel.version + '，' + JSON.stringify(res && res.subPackageInfo || res));
    }
  } catch (e) {
    const msg = String(e && (e.message || e));
    console.error('失败：' + msg);
    if (/ip|白名单|whitelist/i.test(msg)) console.error('提示：小程序后台「开发 → 开发管理 → 开发设置 → 小程序代码上传」里，把 IP 白名单关闭（不限制 IP），或加入运行上传的机器 IP');
    if (/key|签名|sign|privatekey/i.test(msg)) console.error('提示：检查仓库 secret MP_UPLOAD_KEY 是否为完整的密钥文件内容（含 -----BEGIN / -----END 两行），且未在后台被重置');
    process.exitCode = 1;
  } finally { try { fs.rmSync(path.dirname(keyPath), { recursive: true, force: true }); } catch (_) {} }
})();
