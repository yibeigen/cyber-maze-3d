import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { roomToWorld } from '../core/grid'
import { THEMES } from '../core/themes'
import { GameEngine } from '../engine/GameEngine'
import { useGameStore } from '../state/useGameStore'

function ShiftWave({ engine }: { engine: GameEngine }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null!)
  const eventRef = useRef<'warn' | 'motion' | null>(null)
  const startRef = useRef(0)
  const originRef = useRef({ x: 0, z: 0 })
  const reducedMotion = useGameStore((s) => s.reducedMotion)
  const theme = THEMES[useGameStore((s) => s.theme)]

  useEffect(() => engine.on((event) => {
    if (event.type === 'shiftWarn') {
      originRef.current = roomToWorld(event.origin, engine.maze.w, engine.maze.h)
      eventRef.current = 'warn'
      startRef.current = -1
    } else if (event.type === 'shiftMotion') {
      eventRef.current = 'motion'
      startRef.current = -1
    } else if (event.type === 'shiftEnd' || event.type === 'shiftSkipped') {
      eventRef.current = null
      if (meshRef.current) meshRef.current.visible = false
    }
  }), [engine])

  useFrame(({ clock }) => {
    if (!meshRef.current || !materialRef.current) return
    const event = eventRef.current
    if (!event) {
      meshRef.current.visible = false
      return
    }
    meshRef.current.position.set(originRef.current.x, 0.055, originRef.current.z)
    if (reducedMotion) {
      meshRef.current.visible = event === 'warn'
      materialRef.current.opacity = 0.25
      return
    }
    const now = clock.getElapsedTime()
    if (startRef.current < 0) startRef.current = now
    const elapsed = now - startRef.current
    meshRef.current.visible = true

    if (event === 'warn') {
      const pulse = 0.9 + Math.sin(elapsed * 12) * 0.12
      meshRef.current.scale.setScalar(pulse)
      materialRef.current.opacity = 0.28 + Math.sin(elapsed * 12) * 0.12
    } else {
      const progress = Math.min(1, elapsed / 0.9)
      const radius = Math.max(2, (engine.cfg.campaign?.shiftRadius ?? 4) * 2)
      meshRef.current.scale.setScalar(0.3 + progress * radius)
      materialRef.current.opacity = (1 - progress) * 0.65
      if (progress >= 1) eventRef.current = null
    }
  })

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.86, 1, 64]} />
      <meshBasicMaterial ref={materialRef} color={theme.stripColor} transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </mesh>
  )
}

function WinWave({ engine }: { engine: GameEngine }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null!)
  const startRef = useRef<number | null>(null)
  const phase = useGameStore((s) => s.phase)
  const reducedMotion = useGameStore((s) => s.reducedMotion)
  const exit = roomToWorld(engine.maze.exit, engine.maze.w, engine.maze.h)

  useFrame(({ clock }) => {
    if (!meshRef.current || !materialRef.current) return
    if (phase !== 'won') {
      startRef.current = null
      meshRef.current.visible = false
      return
    }
    const now = clock.getElapsedTime()
    if (startRef.current === null) startRef.current = now
    const progress = reducedMotion ? 0.4 : Math.min(1, (now - startRef.current) / 1.1)
    meshRef.current.visible = true
    meshRef.current.scale.setScalar(0.4 + progress * Math.max(engine.maze.w, engine.maze.h) * 1.5)
    materialRef.current.opacity = (1 - progress) * 0.75
  })

  return (
    <mesh ref={meshRef} position={[exit.x, 0.065, exit.z]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.88, 1, 64]} />
      <meshBasicMaterial ref={materialRef} color="#fbbf24" transparent side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </mesh>
  )
}

export function GameEffects({ engine }: { engine: GameEngine }) {
  return <><ShiftWave engine={engine} /><WinWave engine={engine} /></>
}
