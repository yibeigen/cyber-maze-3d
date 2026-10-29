import { describe, it, expect } from 'vitest'
import {
  Dir,
  edgeBetween,
  edgeCount,
  edgeRooms,
  isSpanningTree,
  neighbor,
  roomId,
  roomToWorld,
  roomXY,
  screenToWorldDir,
} from '../grid'

describe('grid.ts: Coordinates, Edges and Invariants', () => {
  const w = 9
  const h = 9

  it('roomId and roomXY should be mutually inverse', () => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const id = roomId(x, y, w)
        const coords = roomXY(id, w)
        expect(coords.x).toBe(x)
        expect(coords.y).toBe(y)
      }
    }
  })

  it('edgeCount should equal h*(w-1) + w*(h-1)', () => {
    expect(edgeCount(w, h)).toBe(h * (w - 1) + w * (h - 1))
    expect(edgeCount(9, 9)).toBe(9 * 8 + 9 * 8) // 144
    expect(edgeCount(15, 15)).toBe(15 * 14 + 15 * 14) // 420
    expect(edgeCount(21, 21)).toBe(21 * 20 + 21 * 20) // 840
  })

  it('edgeRooms should return valid [a, b] with a < b and edgeBetween(a, b) === e', () => {
    const totalEdges = edgeCount(w, h)
    for (let e = 0; e < totalEdges; e++) {
      const [a, b] = edgeRooms(e, w, h)
      expect(a).toBeLessThan(b)
      expect(a).toBeGreaterThanOrEqual(0)
      expect(b).toBeLessThan(w * h)

      const foundE = edgeBetween(a, b, w, h)
      expect(foundE).toBe(e)
      // Reverse check
      expect(edgeBetween(b, a, w, h)).toBe(e)
    }
  })

  it('neighbor should return correct room and edge in all 4 directions', () => {
    // Center room (4, 4)
    const center = roomId(4, 4, w)

    const n = neighbor(center, 0, w, h)
    expect(n).not.toBeNull()
    expect(n?.room).toBe(roomId(4, 3, w))
    expect(edgeBetween(center, n!.room, w, h)).toBe(n?.edge)

    const e = neighbor(center, 1, w, h)
    expect(e).not.toBeNull()
    expect(e?.room).toBe(roomId(5, 4, w))
    expect(edgeBetween(center, e!.room, w, h)).toBe(e?.edge)

    const s = neighbor(center, 2, w, h)
    expect(s).not.toBeNull()
    expect(s?.room).toBe(roomId(4, 5, w))
    expect(edgeBetween(center, s!.room, w, h)).toBe(s?.edge)

    const west = neighbor(center, 3, w, h)
    expect(west).not.toBeNull()
    expect(west?.room).toBe(roomId(3, 4, w))
    expect(edgeBetween(center, west!.room, w, h)).toBe(west?.edge)

    // Corner rooms boundary checks
    const topLeft = roomId(0, 0, w)
    expect(neighbor(topLeft, 0, w, h)).toBeNull() // N boundary
    expect(neighbor(topLeft, 3, w, h)).toBeNull() // W boundary

    const bottomRight = roomId(w - 1, h - 1, w)
    expect(neighbor(bottomRight, 1, w, h)).toBeNull() // E boundary
    expect(neighbor(bottomRight, 2, w, h)).toBeNull() // S boundary
  })

  it('roomToWorld should center maze at origin', () => {
    // w=9: x in [0, 8], worldX = 2x + 1 - 9 = 2x - 8
    // x=0 -> -8, x=4 -> 0, x=8 -> +8
    const center = roomToWorld(roomId(4, 4, 9), 9, 9)
    expect(center.x).toBe(0)
    expect(center.z).toBe(0)

    const tl = roomToWorld(roomId(0, 0, 9), 9, 9)
    expect(tl.x).toBe(-8)
    expect(tl.z).toBe(-8)

    const br = roomToWorld(roomId(8, 8, 9), 9, 9)
    expect(br.x).toBe(8)
    expect(br.z).toBe(8)
  })

  it('screenToWorldDir should match spec 6.6 for all 16 combinations', () => {
    // 0: N (-z), 1: E (+x), 2: S (+z), 3: W (-x)
    // k = 0: yaw=0 (camera at +z looking at -z), screen up is N (0)
    expect(screenToWorldDir(0, 0)).toBe(0)
    expect(screenToWorldDir(1, 0)).toBe(1)
    expect(screenToWorldDir(2, 0)).toBe(2)
    expect(screenToWorldDir(3, 0)).toBe(3)

    // k = 1: camera at -x looking at +x.
    // Screen Up is +x (E, 1); Screen Right is +z (S, 2); Screen Down is -x (W, 3); Screen Left is -z (N, 0)
    expect(screenToWorldDir(0, 1)).toBe(1)
    expect(screenToWorldDir(1, 1)).toBe(2)
    expect(screenToWorldDir(2, 1)).toBe(3)
    expect(screenToWorldDir(3, 1)).toBe(0)

    // k = 2: camera at -z looking at +z.
    // Screen Up is +z (S, 2); Screen Right is -x (W, 3); Screen Down is -z (N, 0); Screen Left is +x (E, 1)
    expect(screenToWorldDir(0, 2)).toBe(2)
    expect(screenToWorldDir(1, 2)).toBe(3)
    expect(screenToWorldDir(2, 2)).toBe(0)
    expect(screenToWorldDir(3, 2)).toBe(1)

    // k = 3: camera at +x looking at -x.
    // Screen Up is -x (W, 3); Screen Right is -z (N, 0); Screen Down is +x (E, 1); Screen Left is +z (S, 2)
    expect(screenToWorldDir(0, 3)).toBe(3)
    expect(screenToWorldDir(1, 3)).toBe(0)
    expect(screenToWorldDir(2, 3)).toBe(1)
    expect(screenToWorldDir(3, 3)).toBe(2)
  })

  it('isSpanningTree should correctly identify valid and invalid trees', () => {
    const emptyOpen = new Uint8Array(edgeCount(3, 3))
    expect(isSpanningTree({ w: 3, h: 3, open: emptyOpen })).toBe(false)

    // Full 1s (cycle and too many edges)
    const fullOpen = new Uint8Array(edgeCount(3, 3)).fill(1)
    expect(isSpanningTree({ w: 3, h: 3, open: fullOpen })).toBe(false)
  })
})
