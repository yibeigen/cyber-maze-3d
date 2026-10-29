/**
 * cyrb53 字符串哈希，输出截断为 32 位无符号整数
 */
export function hashString(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c64e6d ^ seed
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)) >>> 0
}

/**
 * 确定性伪随机数生成器 Mulberry32，产出 [0, 1) 的浮点数
 */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 返回 [0, n) 范围内的随机整数
 */
export function randInt(rng: () => number, n: number): number {
  return Math.floor(rng() * n)
}

/**
 * 从数组中随机选取一项
 */
export function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[randInt(rng, arr.length)]
}

/**
 * 格式化并验证种子字符串（<= 32 个字符，去除首尾空白）
 */
export function sanitizeSeed(seed: string): string {
  const trimmed = seed.trim().slice(0, 32)
  if (!trimmed) {
    return randomSeed()
  }
  return trimmed
}

/**
 * 随机流隔离生成器
 * seed|tag|sub 组成独立 hash，互不影响
 */
export function rngFor(seed: string, tag: string, sub: string | number = ''): () => number {
  const sanitized = sanitizeSeed(seed)
  const key = `${sanitized}|${tag}|${sub}`
  const hash = hashString(key)
  return mulberry32(hash)
}

/**
 * 使用 crypto 生成 6 位 base36 随机种子
 */
export function randomSeed(): string {
  const arr = new Uint32Array(1)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr)
  } else {
    arr[0] = Math.floor(Math.random() * 0xffffffff)
  }
  return (arr[0] % 2176782336) // 36^6
    .toString(36)
    .padStart(6, '0')
}

/** 同一 UTC 日期的全球每日挑战种子。 */
export function dailySeed(d: Date = new Date()): string {
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `daily-${year}-${month}-${day}`
}

/**
 * 对迷宫 open 状态进行 FNV-1a 计算，取 6 位十六进制指纹
 */
export function mazeFingerprint(open: Uint8Array): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < open.length; i++) {
    hash ^= open[i]
    hash = Math.imul(hash, 0x01000193)
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0')
  return hex.slice(0, 6)
}
