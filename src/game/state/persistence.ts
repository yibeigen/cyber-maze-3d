import { CAMPAIGN_LEVELS, MazeSize } from '../core/constants'
import { sanitizeSeed } from '../core/rng'

// 内存降级存储（当 localStorage 不可用或抛出异常时）
const memoryStore = new Map<string, string>()

export function getStorageItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key)
    }
  } catch (err) {
    // 降级使用内存存储
  }
  return memoryStore.get(key) ?? null
}

export function setStorageItem(key: string, val: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, val)
      return
    }
  } catch (err) {
    // 降级使用内存存储
  }
  memoryStore.set(key, val)
}

/**
 * 最佳成绩键格式：ckl:best:${size}:${shifting ? 1 : 0}:${seed}
 */
export function getBestTime(size: MazeSize, shifting: boolean, seed: string, scope = 'free'): number | null {
  const cleanSeed = sanitizeSeed(seed)
  const key = scope === 'free'
    ? `ckl:best:${size}:${shifting ? 1 : 0}:${cleanSeed}`
    : `ckl:best:${scope}:${size}:${shifting ? 1 : 0}:${cleanSeed}`
  const val = getStorageItem(key)
  if (!val) return null
  const num = parseFloat(val)
  return isNaN(num) ? null : num
}

export function saveBestTime(
  size: MazeSize,
  shifting: boolean,
  seed: string,
  timeMs: number,
  scope = 'free',
): boolean {
  const cleanSeed = sanitizeSeed(seed)
  const key = scope === 'free'
    ? `ckl:best:${size}:${shifting ? 1 : 0}:${cleanSeed}`
    : `ckl:best:${scope}:${size}:${shifting ? 1 : 0}:${cleanSeed}`
  const prev = getBestTime(size, shifting, seed, scope)
  const isNewRecord = prev === null || timeMs < prev
  if (isNewRecord) {
    setStorageItem(key, timeMs.toString())
  }
  return isNewRecord
}

/**
 * 音效设置持久化
 */
export function getStoredSoundEnabled(): boolean {
  const val = getStorageItem('ckl:settings:sound')
  if (val === null) return true // 默认开启
  return val === '1'
}

export function saveStoredSoundEnabled(enabled: boolean): void {
  setStorageItem('ckl:settings:sound', enabled ? '1' : '0')
}

/**
 * 画质设置持久化
 */
export type QualitySetting = 'auto' | 'high' | 'low'

export function getStoredQuality(): QualitySetting {
  const val = getStorageItem('ckl:settings:quality')
  if (val === 'high' || val === 'low' || val === 'auto') {
    return val
  }
  return 'auto'
}

export function saveStoredQuality(quality: QualitySetting): void {
  setStorageItem('ckl:settings:quality', quality)
}

/**
 * 视觉主题持久化
 */
export type VisualTheme = 'cyber' | 'aurora' | 'light'

export function getStoredTheme(): VisualTheme {
  const val = getStorageItem('ckl:settings:theme')
  if (val === 'cyber' || val === 'aurora' || val === 'light') {
    return val
  }
  return 'light'
}

export function saveStoredTheme(theme: VisualTheme): void {
  setStorageItem('ckl:settings:theme', theme)
}

/**
 * 解析 URL 参数
 */
export interface UrlParams {
  size?: MazeSize
  shifting?: boolean
  seed?: string
  level?: number
}

export function parseUrlParams(): UrlParams {
  if (typeof window === 'undefined' || !window.location.search) {
    return {}
  }

  const query = new URLSearchParams(window.location.search)
  const result: UrlParams = {}

  const size = query.get('size')
  if (size === 's' || size === 'm' || size === 'l') {
    result.size = size
  }

  const shift = query.get('shift')
  if (shift === '1' || shift === 'true') {
    result.shifting = true
  } else if (shift === '0' || shift === 'false') {
    result.shifting = false
  }

  const seed = query.get('seed')
  if (seed) {
    result.seed = sanitizeSeed(seed)
  }

  const level = Number(query.get('level'))
  if (Number.isInteger(level) && level >= 1 && level <= CAMPAIGN_LEVELS.length) {
    result.level = level
  }

  return result
}

/**
 * 构建分享链接
 */
export function buildShareUrl(size: MazeSize, shifting: boolean, seed: string, levelId?: number): string {
  if (typeof window === 'undefined') return ''
  const url = new URL(window.location.href)
  url.searchParams.set('size', size)
  url.searchParams.set('shift', shifting ? '1' : '0')
  url.searchParams.set('seed', sanitizeSeed(seed))
  if (levelId) url.searchParams.set('level', String(levelId))
  else url.searchParams.delete('level')
  return url.toString()
}

/**
 * 复制文本到剪贴板，支持降级
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch (err) {
    // 降级处理
  }

  try {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-9999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    const successful = document.execCommand('copy')
    document.body.removeChild(textArea)
    return successful
  } catch (err) {
    return false
  }
}

const KEY_ONBOARDED = 'ckl:onboarded'

export function hasCompletedOnboarding(): boolean {
  return getStorageItem(KEY_ONBOARDED) === '1'
}

export function setOnboardingCompleted(): void {
  setStorageItem(KEY_ONBOARDED, '1')
}

const KEY_LAB_ONBOARDED = 'ckl:lab-onboarded'

export function hasLabOnboarding(): boolean {
  return getStorageItem(KEY_LAB_ONBOARDED) === '1'
}

export function setLabOnboardingCompleted(): void {
  setStorageItem(KEY_LAB_ONBOARDED, '1')
}

export interface CampaignProgress {
  unlocked: number
  stars: Record<number, number>
}

const KEY_CAMPAIGN = 'ckl:campaign:v1'

export function getCampaignProgress(): CampaignProgress {
  try {
    const value = JSON.parse(getStorageItem(KEY_CAMPAIGN) ?? '{}')
    return {
      unlocked: Math.min(CAMPAIGN_LEVELS.length, Math.max(1, Number(value.unlocked) || 1)),
      stars: value.stars && typeof value.stars === 'object' ? value.stars : {},
    }
  } catch {
    return { unlocked: 1, stars: {} }
  }
}

export function saveCampaignResult(levelId: number, stars: number): CampaignProgress {
  const progress = getCampaignProgress()
  progress.stars[levelId] = Math.max(progress.stars[levelId] ?? 0, stars)
  progress.unlocked = Math.max(progress.unlocked, Math.min(CAMPAIGN_LEVELS.length, levelId + 1))
  setStorageItem(KEY_CAMPAIGN, JSON.stringify(progress))
  return progress
}

export type CameraMode = 'third' | 'first'

export function getStoredCameraMode(): CameraMode {
  return getStorageItem('ckl:settings:camera') === 'first' ? 'first' : 'third'
}

export function saveStoredCameraMode(mode: CameraMode): void {
  setStorageItem('ckl:settings:camera', mode)
}
