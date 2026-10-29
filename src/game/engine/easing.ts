export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

/**
 * easeOutBack: 升起墙体（overshoot 1.2）
 */
export function easeOutBack(p: number, s = 1.2): number {
  const t = p - 1
  return t * t * ((s + 1) * t + s) + 1
}

/**
 * easeInCubic: 落下墙体
 */
export function easeInCubic(p: number): number {
  return p * p * p
}

/**
 * easeInOutQuad: 平滑插值
 */
export function easeInOutQuad(p: number): number {
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
}
