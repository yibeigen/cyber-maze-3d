import { Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { roomToWorld } from '../core/grid'
import { THEMES } from '../core/themes'
import { GameEngine } from '../engine/GameEngine'
import { useGameStore } from '../state/useGameStore'

interface ScanPathProps {
  /** 直接传引擎：路径是引擎内部状态，靠 props 下发会因为父组件不重渲染而永远是 null */
  engine?: GameEngine
  /** 静态路径（实验室模式使用） */
  path?: number[] | null
  w: number
  h: number
}

export function ScanPath({ engine, path: staticPath, w, h }: ScanPathProps) {
  const lineRef = useRef<any>(null)
  const glowRef = useRef<any>(null)
  const [path, setPath] = useState<number[] | null>(staticPath ?? null)
  const lastPathRef = useRef<number[] | null>(staticPath ?? null)

  const themeKey = useGameStore((s) => s.theme)
  const theme = THEMES[themeKey] || THEMES.cyber
  const accentColor = theme.stripColor

  useFrame((_, delta) => {
    // 引擎驱动：只在路径引用变化时更新 React 状态，避免逐帧重渲染
    if (engine) {
      const cur = engine.currentScanPath
      if (cur !== lastPathRef.current) {
        lastPathRef.current = cur
        setPath(cur)
      }
    }

    if (lineRef.current?.material) {
      // 沿路径方向推进流动虚线
      lineRef.current.material.dashOffset -= delta * 3.2
    }
    if (glowRef.current?.material) {
      glowRef.current.material.dashOffset -= delta * 3.2
    }
  })

  const points = useMemo(() => {
    if (!path || path.length < 2) return null
    return path.map((r) => {
      const pos = roomToWorld(r, w, h)
      return new THREE.Vector3(pos.x, 0.12, pos.z)
    })
  }, [path, w, h])

  if (!points) return null

  return (
    <group>
      {/* 1. 外层全息能量光晕底道 */}
      <Line
        ref={glowRef}
        points={points}
        color={accentColor}
        lineWidth={11}
        transparent
        opacity={theme.id === 'light' ? 0.2 : 0.3}
      />

      {/* 2. 核心高亮定向脉冲流光线 */}
      <Line
        ref={lineRef}
        points={points}
        color={theme.id === 'light' ? '#0369a1' : '#ffffff'}
        lineWidth={3.8}
        transparent
        opacity={0.95}
        dashed
        dashScale={1.6}
        dashSize={0.6}
        gapSize={0.25}
      />
    </group>
  )
}
