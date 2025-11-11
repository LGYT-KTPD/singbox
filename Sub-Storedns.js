// Sub-Store artifact script for sing-box (safe-all-only)

const _typeRaw = String(($arguments.type || '1')).toLowerCase().trim();
const _nameRaw  = ($arguments.name || 'singbox').trim();
const isCollection = /^1$|col|collection/.test(_typeRaw);

const COMPAT = { tag: 'COMPATIBLE', type: 'direct' };

let cfg = JSON.parse($files[0]);

// 1) 拉取并合并节点
const names = _nameRaw.split(/[,\|\s]+/).filter(Boolean);
let nodes = [];
for (const n of names) {
  let part = await produceArtifact({
    name: n,
    type: isCollection ? 'collection' : 'subscription',
    platform: 'sing-box',
    produceType: 'internal',
  });
  if ((!part || part.length === 0) && isCollection) {
    part = await produceArtifact({
      name: n,
      type: 'subscription',
      platform: 'sing-box',
      produceType: 'internal',
    });
  }
  if (Array.isArray(part) && part.length) nodes.push(...part);
}

// 2) 去重（by tag）
const seen = new Set();
nodes = nodes.filter(p => {
  const key = p.tag || JSON.stringify(p);
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

if (nodes.length === 0) {
  throw new Error('No nodes produced: check your collection/subscription name(s).');
}

// 3) 注入节点
cfg.outbounds.push(...nodes);

// 4) 找到 all / all-auto，灌入 tags；为空则挂直连兜底
const allSel = cfg.outbounds.find(o => o.tag === 'all' && o.type === 'selector');
const allAuto = cfg.outbounds.find(o => o.tag === 'all-auto' && o.type === 'urltest');

const tags = nodes.map(p => p.tag);

function ensureCompat(out) {
  if (Array.isArray(out.outbounds) && out.outbounds.length === 0) {
    if (!cfg.outbounds.find(o => o.tag === COMPAT.tag)) {
      cfg.outbounds.push(COMPAT);
    }
    out.outbounds.push(COMPAT.tag);
  }
}

if (allSel) {
  allSel.outbounds = Array.isArray(allSel.outbounds) ? allSel.outbounds : [];
  allSel.outbounds.push(...tags);
  ensureCompat(allSel);
}

if (allAuto) {
  allAuto.outbounds = Array.isArray(allAuto.outbounds) ? allAuto.outbounds : [];
  allAuto.outbounds.push(...tags);
  ensureCompat(allAuto);
}

// 5) 结束
$content = JSON.stringify(cfg, null, 2);
