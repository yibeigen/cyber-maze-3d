import { ContactShadows } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { WALL_H, WALL_LOW } from '../core/constants'
import { generate } from '../core/generate'
import { edgeRooms, roomXY } from '../core/grid'
import { rngFor } from '../core/rng'
import { THEMES } from '../core/themes'
import { useGameStore } from '../state/useGameStore'
import { FloorTiles } from './FloorTiles'
import { MazeWalls } from './MazeWalls'
import { useStudioEnvironment } from './useStudioEnvironment'

export function TitleScene() {
  useStudioEnvironment()
  const w = 15
  const h = 15
  const reducedMotion = useGameStore((s) => s.reducedMotion)
  const themeKey = useGameStore((s) => s.theme)
  const theme = THEMES[themeKey] || THEMES.cyber
  const timeRef = useRef(0)

  // 使用固定种子 'title' 生成中尺寸迷宫
  const { open } = useMemo(() => {
    const rng = rngFor('title', 'gen', 'm')
    return generate('dfs', w, h, rng)
  }, [])

  // 预计算每条边到迷宫中心的欧几里得距离
  const edgeDists = useMemo(() => {
    const dists = new Float32Array(open.length)
    for (let e = 0; e < open.length; e++) {
      const [a, b] = edgeRooms(e, w, h)
      const coordA = roomXY(a, w)
      const coordB = roomXY(b, w)
      const x = coordA.x + coordB.x + 1 - w
      const z = coordA.y + coordB.y + 1 - h
      dists[e] = Math.sqrt(x * x + z * z)
    }
    return dists
  }, [open.length])

  // 待机轻微波纹动画（6.7）
  const getEdgeHeight = (e: number): number => {
    const base = open[e] === 1 ? WALL_LOW : WALL_H
    if (reducedMotion) return base

    const dist = edgeDists[e]
    // 振幅 0.15，周期 4 s 的从中心向外扩散波纹
    const wave = Math.sin((timeRef.current * 2 * Math.PI) / 4 - dist * 0.35) * 0.15
    return Math.max(0.04, base + wave)
  }

  const getEdgeVisual = (): 'idle' => 'idle'

  useFrame((state, delta) => {
    timeRef.current += delta
    // 相机缓慢环绕：拉到能看见整座迷宫的距离，标题区与右下控制台各占一角
    const t = state.clock.getElapsedTime() * 0.08
    state.camera.position.set(32 * Math.cos(t), 24, 32 * Math.sin(t))
    state.camera.lookAt(0, 0, 0)
  })

  return (
    <>
      <fog attach="fog" args={[theme.fogColor, 18, 62]} />
      <hemisphereLight
        color={theme.lightHemiSky}
        groundColor={theme.lightHemiGround}
        intensity={(theme.id === 'light' ? 0.45 : 0.35) * 0.8}
      />
      <directionalLight
        position={[15, 25, 20]}
        color={theme.lightDirColor}
        intensity={theme.lightDirIntensity * 0.8}
      />
      <directionalLight
        position={[-15, 18, -18]}
        color={theme.stripColor}
        intensity={0.4}
        castShadow={false}
      />

      <ContactShadows
        position={[0, 0.005, 0]}
        scale={Math.max(w, h) * 2 + 6}
        resolution={512}
        blur={2.2}
        opacity={theme.id === 'light' ? 0.35 : 0.6}
        far={2.0}
        color="#000000"
        frames={Infinity}
      />

      <MazeWalls
        w={w}
        h={h}
        getEdgeHeight={getEdgeHeight}
        getEdgeVisual={getEdgeVisual}
      />
      <FloorTiles w={w} h={h} />
    </>
  )
}
