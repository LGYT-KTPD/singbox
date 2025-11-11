// Sub-Store artifact script for sing-box (minimal, no region deps)
// args: type=1|collection|subscription, name=<collection or sub name>

const _typeRaw = String(($arguments.type || '1')).toLowerCase().trim();
const _nameRaw = ($arguments.name || 'singbox').trim();
const isCollection = /^1$|col|collection/.test(_typeRaw);

// 支持逗号/竖线/空格分隔的多个名称
const names = _nameRaw.split(/[,\|\s]+/).filter(Boolean);

const COMP = { tag: 'COMPATIBLE', type: 'direct' };

let config = JSON.parse($files[0]);

// 拉取并合并 proxies
let proxies = [];
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
  if (Array.isArray(part) && part.length) proxies.push(...part);
}

// 去重（按 tag）
const seen = new Set();
proxies = proxies.filter(p => {
  const key = p.tag || JSON.stringify(p);
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

// 确保存在 all-auto 与 direct
function ensureOutbound(tag, def) {
  if (!config.outbounds) config.outbounds = [];
  if (!config.outbounds.find(o => o.tag === tag)) {
    config.outbounds.push(Object.assign({ tag }, def || {}));
  }
}
ensureOutbound('direct', { type: 'direct' });
ensureOutbound('all-auto', {
  type: 'urltest',
  outbounds: [],
  url: 'https://www.gstatic.com/generate_204',
  interval: '1m',
  tolerance: 50
});

// 注入节点
config.outbounds.push(...proxies);

// 给 all-auto 填入节点标签
const allAuto = config.outbounds.find(o => o.tag === 'all-auto');
allAuto.outbounds = allAuto.outbounds || [];
allAuto.outbounds.push(...proxies.map(p => p.tag));

// 若没有任何节点，挂直连兜底，避免空组导致启动失败
if (allAuto.outbounds.length === 0) {
  if (!config.outbounds.find(o => o.tag === COMP.tag)) {
    config.outbounds.push(COMP);
  }
  allAuto.outbounds.push(COMP.tag);
}

// 同时确保 proxy 只依赖 all-auto 与 direct（如果存在）
const proxy = config.outbounds.find(o => o.tag === 'proxy');
if (proxy && proxy.type === 'selector') {
  const safeList = ['all-auto', 'direct'];
  proxy.outbounds = safeList.filter(t => config.outbounds.find(o => o.tag === t));
  proxy.default = proxy.outbounds[0] || 'direct';
}

$content = JSON.stringify(config, null, 2);
