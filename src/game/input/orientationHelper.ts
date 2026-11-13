import { ScreenOrientationMode } from '../state/persistence'

/**
 * 判断当前是否处于强制 CSS 90 度旋转的横屏模式
 * （即用户偏好横屏，但物理屏幕/视口仍为竖屏时触发）
 */
export function isForcedLandscape(
  mode: ScreenOrientationMode,
  viewportW: number,
  viewportH: number
): boolean {
  return mode === 'landscape' && viewportW < viewportH
}

/**
 * 将屏幕像素坐标映射到应用容器的局部坐标系。
 * 在强制横屏旋转 90 度时，屏幕 X/Y 轴与容器局部 X/Y 轴正交互换。
 */
export function screenToLocalCoords(
  clientX: number,
  clientY: number,
  forcedLandscape: boolean,
  viewportW: number,
  viewportH: number
): { x: number; y: number } {
  if (!forcedLandscape) {
    return { x: clientX, y: clientY }
  }
  const cx = (viewportW || 1) / 2
  const cy = (viewportH || 1) / 2
  const dx = clientX - cx
  const dy = clientY - cy

  // 顺时针旋转 90 度逆映射公式：
  // 旋转后容器宽为 viewportH，高为 viewportW
  return {
    x: dy + (viewportH || 1) / 2,
    y: -dx + (viewportW || 1) / 2,
  }
}
