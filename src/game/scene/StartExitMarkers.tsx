import { useMemo } from 'react'
import * as THREE from 'three'
import { roomToWorld } from '../core/grid'
import { THEMES } from '../core/themes'
import { useGameStore } from '../state/useGameStore'

interface StartExitMarkersProps {
  startRoom: number
  exitRoom: number
  w: number
  h: number
}

const EXIT_PINK = '#f472b6'

/**
 * 起终点地格环（全案 四）
 * 俯瞰视角下 1 秒内定位"我在哪、要去哪"。
 * 环贴地 y=0.035，半径小于 ExitBeacon 的 0.5~0.7 脉冲环，两者不打架。
 * 静态 mesh，不参与逐帧动画，低画质也保留（属于功能标记而非装饰）。
 */
export function StartExitMarkers({ startRoom, exitRoom, w, h }: StartExitMarkersProps) {
  const themeKey = useGameStore((s) => s.theme)
  const theme = THEMES[themeKey] || THEMES.cyber

  const start = useMemo(() => roomToWorld(startRoom, w, h), [startRoom, w, h])
  const exit = useMemo(() => roomToWorld(exitRoom, w, h), [exitRoom, w, h])

  const startColor = useMemo(
    () => new THREE.Color(theme.id === 'light' ? theme.playerGlow : theme.stripColor),
    [theme.id, theme.playerGlow, theme.stripColor],
  )
  const endColor = useMemo(() => new THREE.Color(EXIT_PINK), [])

  return (
    <group>
      {/* 起点：主题色细环 */}
      <mesh position={[start.x, 0.035, start.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.36, 32]} />
        <meshBasicMaterial
          color={startColor}
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* 终点：粉色细环，与信标光柱呼应 */}
      <mesh position={[exit.x, 0.035, exit.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.36, 32]} />
        <meshBasicMaterial
          color={endColor}
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}
