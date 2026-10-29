import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { PLAYER_RADIUS } from '../core/constants'
import { THEMES } from '../core/themes'
import { GameEngine } from '../engine/GameEngine'
import { useGameStore } from '../state/useGameStore'

interface PlayerProps {
  engine: GameEngine
}

export function Player({ engine }: PlayerProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const ballMeshRef = useRef<THREE.Mesh>(null!)
  const prevPosRef = useRef({ x: 0, z: 0, init: false })
  const targetScale = useRef(new THREE.Vector3(1, 1, 1))

  const quality = useGameStore((s) => s.quality)
  const isHighQuality = quality === 'high' || quality === 'auto'
  const themeKey = useGameStore((s) => s.theme)
  const theme = THEMES[themeKey] || THEMES.cyber
  const cameraMode = useGameStore((s) => s.cameraMode)
  const phase = useGameStore((s) => s.phase)
  const isSurveying = useGameStore((s) => s.isSurveying)
  const hideBody = cameraMode === 'first' && !isSurveying && phase === 'playing'

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const vis = engine.getPlayerVisual()
    // 角色中心高度设在 PLAYER_RADIUS + 0.05
    groupRef.current.position.set(vis.x, PLAYER_RADIUS + 0.05, vis.z)

    if (!prevPosRef.current.init) {
      prevPosRef.current = { x: vis.x, z: vis.z, init: true }
      return
    }

    const dx = vis.x - prevPosRef.current.x
    const dz = vis.z - prevPosRef.current.z
    const dist = Math.hypot(dx, dz)

    if (dist > 0.0001 && ballMeshRef.current) {
      // 1. 物理滚动：沿位移方向自然滚动（角速度 = 位移 / 半径）
      ballMeshRef.current.rotation.z -= dx / PLAYER_RADIUS
      ballMeshRef.current.rotation.x += dz / PLAYER_RADIUS

      // 2. 运动挤压回弹（Squash & Stretch）
      const stretch = Math.min(0.12, dist * 2.8)
      ballMeshRef.current.scale.set(1 + stretch * 0.4, 1 - stretch * 0.5, 1 + stretch * 0.4)
    } else if (ballMeshRef.current) {
      // 静止时平滑回弹至标准球形
      ballMeshRef.current.scale.lerp(targetScale.current, delta * 14)
    }

    prevPosRef.current.x = vis.x
    prevPosRef.current.z = vis.z
  })

  return (
    <group ref={groupRef}>
      {/* 玩家小球：光润能量琉璃球，适度柔和自发光，不再过曝刺眼 */}
      <mesh ref={ballMeshRef} castShadow={isHighQuality} visible={!hideBody}>
        <sphereGeometry args={[PLAYER_RADIUS, 32, 32]} />
        <meshStandardMaterial
          color={theme.id === 'light' ? '#38bdf8' : '#ffffff'}
          emissive={theme.playerGlow}
          emissiveIntensity={theme.id === 'light' ? 0.75 : 0.85}
          roughness={0.12}
          metalness={0.7}
        />
      </mesh>

      {/* 随行全息点光源：适度柔和照明，给墙体提供柔美反光而不过曝泛白 */}
      <pointLight
        color={theme.playerGlow}
        intensity={1.8}
        distance={5.5}
        decay={1.8}
        castShadow={false}
      />

      {/* 脚下地砖方框指示底座：严格限制在地砖方框内部（0.82×0.82），绝不超出方框边缘 */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -PLAYER_RADIUS - 0.025, 0]}
      >
        <planeGeometry args={[0.82, 0.82]} />
        <meshBasicMaterial
          color={theme.playerGlow}
          transparent
          opacity={theme.id === 'light' ? 0.22 : 0.18}
          blending={theme.id === 'light' ? THREE.NormalBlending : THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
