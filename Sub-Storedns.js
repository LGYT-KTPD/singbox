// Sub-Store artifact script for sing-box
// 默认：type=1（collection），name=singbox
// 也支持 name 传多个（逗号/竖线/空格分隔），会合并并按 tag 去重

const _typeRaw = String(($arguments.type || '1')).toLowerCase().trim()
const _nameRaw = ($arguments.name || 'singbox').trim()
const isCollection = /^1$|col|collection/.test(_typeRaw)

// 允许 name 传多个：SSRDOG,MMyun  或  SSRDOG|MMyun  或  "SSRDOG MMyun"
const names = _nameRaw.split(/[,\|\s]+/).filter(Boolean)

const compatible_outbound = { tag: 'COMPATIBLE', type: 'direct' }

let compatible = false
let config = JSON.parse($files[0])

// 拉取并合并 proxies（支持多个名称）
let proxies = []
for (const n of names) {
  // 按传入类型生成；若没找到可选再尝试另一种（提高容错）
  let part = await produceArtifact({
    name: n,
    type: isCollection ? 'collection' : 'subscription',
    platform: 'sing-box',
    produceType: 'internal',
  })
  if ((!part || part.length === 0) && isCollection) {
    // 兜底再试试 subscription
    part = await produceArtifact({
      name: n,
      type: 'subscription',
      platform: 'sing-box',
      produceType: 'internal',
    })
  }
  if (Array.isArray(part) && part.length) proxies.push(...part)
}

// 按 tag 去重（保留首个）
const seen = new Set()
proxies = proxies.filter(p => {
  const key = p.tag || JSON.stringify(p)
  if (seen.has(key)) return false
  seen.add(key)
  return true
})

// 注入到现有 outbounds
config.outbounds.push(...proxies)

// 区域分组自动填充
config.outbound
