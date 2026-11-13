import { describe, expect, it } from 'vitest'
import { isForcedLandscape, screenToLocalCoords } from '../orientationHelper'

describe('orientationHelper', () => {
  it('correctly identifies forced landscape when mode is landscape and screen is portrait', () => {
    expect(isForcedLandscape('landscape', 390, 844)).toBe(true)
    expect(isForcedLandscape('portrait', 390, 844)).toBe(false)
    expect(isForcedLandscape('landscape', 844, 390)).toBe(false)
    expect(isForcedLandscape('portrait', 844, 390)).toBe(false)
  })

  it('keeps screen coordinates unchanged when not forced landscape', () => {
    const coords = screenToLocalCoords(150, 200, false, 390, 844)
    expect(coords).toEqual({ x: 150, y: 200 })
  })

  it('rotates screen coordinates correctly under 90deg forced landscape', () => {
    // 视口尺寸 400x800，中心 (200, 400)
    // 旋转后横屏容器尺寸 800x400
    const w = 400
    const h = 800

    // 屏幕中心 (200, 400) 应该映射到容器中心 (400, 200)
    const center = screenToLocalCoords(200, 400, true, w, h)
    expect(center).toEqual({ x: 400, y: 200 })

    // 屏幕 (400, 0) 是用户旋转视角下的左上角 (0, 0)
    const topLeft = screenToLocalCoords(400, 0, true, w, h)
    expect(topLeft).toEqual({ x: 0, y: 0 })

    // 屏幕 (0, 800) 是用户旋转视角下的右下角 (800, 400)
    const bottomRight = screenToLocalCoords(0, 800, true, w, h)
    expect(bottomRight).toEqual({ x: 800, y: 400 })

    // 在用户视野中向右拖动 50px：物理屏幕 Y 增加 50px
    const p1 = screenToLocalCoords(200, 400, true, w, h)
    const p2 = screenToLocalCoords(200, 450, true, w, h)
    expect(p2.x - p1.x).toBe(50)
    expect(p2.y - p1.y).toBe(0)

    // 在用户视野中向上拖动 30px：物理屏幕 X 增加 30px
    const p3 = screenToLocalCoords(230, 400, true, w, h)
    expect(p3.x - p1.x).toBe(0)
    expect(p3.y - p1.y).toBe(-30) // 向上为 local Y 减小（符合标准屏幕坐标）
  })
})

