'use strict';
/* v62.5 A1a 谱面数据服务端校验——口径「拒绝危险，不拒绝陌生」（与编辑器 normalizeSongFields 同一张字段表）：
   ① 已知数值字段：数字须有限；字符串须能转成有限数字（旧版本偶有 "90" 这类数字串，放行，编辑器载入时再规范化）；
   ② 已知短码字段（SD_CODE：技法/升降/和弦名…）不得含尖括号（dyn 的楔形 '<'/'>' 例外）；③ 自由文本（曲名/歌词…）不限字符——输出点转义；
   ④ 未知字段与新可选字段一律透传，服务端不因编辑器新增字段而拒收或剥离数据。返回首个违规位置供提示。 */
const SD_NUM = new Set(['v', 'beats', 'unit', 'tempo', 'capo', 'lyricLines', 'dur', 'deg', 'oct', 's', 'f', 'volta', 'simile', 'tup', 'mi', 'ci', 'vi', 'li', 'si', 'q']);
const SD_FREE = new Set(['title', 'singer', 'lyricist', 'composer', 'maker', 'lyrics', 'label', 'anno', 'text', 'name', 'tabVoices', 'voxVoices', 'intro', 'desc', 'note', 'tempoTerm', 'author']);
const SD_KEEP = { dyn: new Set(['<', '>']) };
/* 已知短码字段（数据模型 §3.1 + 渲染裸拼点审计）：合法取值不含尖括号。只在这些字段里拒收 <>，
   未知字段透传——编辑器以后新增的可选字段不会因为服务端没登记而被拒（编辑器载入时另有 normalizeSongFields 兜底）。 */
const SD_CODE = new Set(['acc', 'bAmt', 'chord', 'dyn', 'inst', 'key', 'keyTo', 'orn', 'strum', 'tech', 'voxNotations', 'artic', 'ped', 'fing', 'clef', 'ott', 'trem', 'perc', 'texId', 'tabNota', 'rhFing', 'lhF', 'mode']);
function scoreDataDanger(v, key, path, depth) {
  if (depth > 40) return path + '（嵌套过深）';
  if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) { const r = scoreDataDanger(v[i], key, path + '[' + i + ']', depth + 1); if (r) return r; } return null; }
  if (v && typeof v === 'object') {
    for (const k of Object.keys(v)) {
      if (/[<>]/.test(k)) return path + '.' + k.replace(/[<>]/g, '').slice(0, 20) + '（键名含尖括号）';
      const r = scoreDataDanger(v[k], k, path + '.' + k, depth + 1); if (r) return r;
    }
    return null;
  }
  if (typeof v === 'number') return (key && SD_NUM.has(key) && !Number.isFinite(v)) ? path + '（不是有效数字）' : null;
  if (typeof v === 'string') {
    if (key && SD_NUM.has(key)) return Number.isFinite(Number(v)) ? null : path + '（应为数字）';
    if (key && SD_KEEP[key] && SD_KEEP[key].has(v)) return null;
    if (key && SD_CODE.has(key)) return /[<>]/.test(v) ? path + '（含非法字符）' : null;
    return null;                                   // 自由文本与未知字段：不限字符
  }
  return null;
}

module.exports = { scoreDataDanger, SD_NUM, SD_FREE, SD_KEEP, SD_CODE };
