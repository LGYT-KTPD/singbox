// Sub-Store artifact script for sing-box
// 默认：type=1（collection），name=singbox
// 也支持 name 传多个（逗号/竖线/空格分隔），会合并并按 tag 去重

const _typeRaw = String(($arguments.type || '1')).toLowerCase().trim();  // 加分号
const _nameRaw = ($arguments.name || 'singbox').trim();  // 加分号
const isCollection = /^1$|col|collection/.test(_typeRaw);

// 允许 name 传多个：SSRDOG,MMyun  或  SSRDOG|MMyun  或  "SSRDOG MMyun"
const names = _nameRaw.split(/[,\|\s]+/).filter(Boolean);

const compatible_outbound = { tag: 'COMPATIBLE', type: 'direct' };

let compatible = false;
let config = JSON.parse($files[0]);

// 拉取并合并 proxies（支持多个名称）
let proxies = [];
for (const n of names) {
  // 按传入类型生成；若没找到可选再尝试另一种（提高容错）
  let part = await produceArtifact({
    name: n,
    type: isCollection ? 'collection' : 'subscription',
    platform: 'sing-box',
    produceType: 'internal',
  });
  if ((!part || part.length === 0) && isCollection) {
    // 兜底再试试 subscription
    part = await produceArtifact({
      name: n,
      type: 'subscription',
      platform: 'sing-box',
      produceType: 'internal',
    });
  }
  if (Array.isArray(part) && part.length) proxies.push(...part);
}

// 按 tag 去重（保留首个）
const seen = new Set();
proxies = proxies.filter(p => {
  const key = p.tag || JSON.stringify(p);
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

// 注入到现有 outbounds
config.outbounds.push(...proxies);

// 区域分组自动填充
config.outbounds.forEach(i => {
  if (['all', 'all-auto'].includes(i.tag)) {
    i.outbounds = i.outbounds || [];
    i.outbounds.push(...getTags(proxies));
  }
  if (['hk', 'hk-auto'].includes(i.tag)) {
    i.outbounds = i.outbounds || [];
    i.outbounds.push(...getTags(proxies, /港|hk|hongkong|hong kong|🇭🇰/i));
  }
  if (['tw', 'tw-auto'].includes(i.tag)) {
    i.outbounds = i.outbounds || [];
    i.outbounds.push(...getTags(proxies, /台|tw|taiwan|🇹🇼/i));
  }
  if (['jp', 'jp-auto'].includes(i.tag)) {
    i.outbounds = i.outbounds || [];
    i.outbounds.push(...getTags(proxies, /日本|jp|japan|🇯🇵/i));
  }
  if (['sg', 'sg-auto'].includes(i.tag)) {
    i.outbounds = i.outbounds || [];
    i.outbounds.push(...getTags(proxies, /^(?!.*(?:us)).*(新|sg|singapore|🇸🇬)/i));
  }
  if (['us', 'us-auto'].includes(i.tag)) {
    i.outbounds = i.outbounds || [];
    i.outbounds.push(...getTags(proxies, /美|us|unitedstates|united states|🇺🇸/i));
  }
});

// 若某个分组是空数组，自动挂一个直连兜底
config.outbounds.forEach(outbound => {
  if (Array.isArray(outbound.outbounds) && outbound.outbounds.length === 0) {
    if (!compatible) {
      config.outbounds.push(compatible_outbound);
      compatible = true;
    }
    outbound.outbounds.push(compatible_outbound.tag);
  }
});

// 添加禁止IPv6流量的规则
const ipv6RejectRule = {
  "ip_version": 6,
  "action": "reject"
};

// 将 IPv6 拒绝规则加入到配置中
config.route.rules.push(ipv6RejectRule);

// 更新配置并输出
$content = JSON.stringify(config, null, 2);

// 获取 tags
function getTags(list, regex) {
  const arr = regex ? list.filter(p => regex.test(p.tag)) : list;
  return arr.map(p => p.tag);
}
