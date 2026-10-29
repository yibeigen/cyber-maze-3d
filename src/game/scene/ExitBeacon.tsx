import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { roomToWorld } from '../core/grid'
import { GameEngine } from '../engine/GameEngine'
import { useGameStore } from '../state/useGameStore'

interface ExitBeaconProps {
  engine?: GameEngine
  exitRoom?: number
  w?: number
  h?: number
}

export function ExitBeacon({ engine, exitRoom, w, h }: ExitBeaconProps) {
  const coords = roomToWorld(exitRoom ?? engine!.maze.exit, w ?? engine!.maze.w, h ?? engine!.maze.h)
  const ringRef = useRef<THREE.Mesh>(null!)
  const beaconRef = useRef<THREE.Mesh>(null!)
  const coreRef = useRef<THREE.Mesh>(null!)
  const particlesRef = useRef<THREE.Points>(null!)
  const winStartRef = useRef<number | null>(null)
  const phase = useGameStore((s) => s.phase)
  const cameraMode = useGameStore((s) => s.cameraMode)
  const quality = useGameStore((s) => s.quality)
  const reducedMotion = useGameStore((s) => s.reducedMotion)
  const height = cameraMode === 'first' ? 7.5 : 3.2

  const particlePositions = useMemo(() => {
    const positions = new Float32Array(20 * 3)
    for (let i = 0; i < 20; i++) {
      const angle = i * 2.39996
      const radius = 0.45 + (i % 5) * 0.09
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = 0.2 + (i % 10) * 0.27
      positions[i * 3 + 2] = Math.sin(angle) * radius
    }
    return positions
  }, [])

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime()
    if (phase === 'won') {
      if (winStartRef.current === null) winStartRef.current = time
    } else {
      winStartRef.current = null
    }
    const winProgress = winStartRef.current === null ? 0 : reducedMotion ? 0.35 : Math.min(1, (time - winStartRef.current) / 0.85)
    const near = engine ? engine.remainingDistance >= 0 && engine.remainingDistance <= 5 : false
    const frequency = near ? 7 : 3
    const pulse = Math.sin(time * frequency)

    if (ringRef.current) {
      const scale = 1 + pulse * 0.1 + winProgress * 2.2
      ringRef.current.scale.set(scale, scale, 1)
      const material = ringRef.current.material as THREE.MeshBasicMaterial
      material.opacity = 0.7 + winProgress * 0.25
    }
    if (beaconRef.current) {
      beaconRef.current.scale.set(1 + winProgress * 1.8, 1 + winProgress * 0.35, 1 + winProgress * 1.8)
      const material = beaconRef.current.material as THREE.MeshBasicMaterial
      material.opacity = Math.min(0.95, 0.35 + pulse * 0.12 + winProgress * 0.45)
    }
    if (coreRef.current) {
      coreRef.current.scale.y = 1 + winProgress * 0.7
      coreRef.current.position.y = height / 2 * (1 + winProgress * 0.7)
    }
    if (particlesRef.current) {
      particlesRef.current.rotation.y = reducedMotion ? 0 : time * 0.18
      particlesRef.current.position.y = reducedMotion ? 0 : (time * 0.12) % 0.5
    }
  })

  return (
    <group position={[coords.x, 0, coords.z]}>
      <mesh ref={beaconRef} position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.4, 0.6, height, 32, 1, true]} />
        <meshBasicMaterial color="#e879f9" transparent opacity={0.4} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={coreRef} position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.08, 0.08, height, 16]} />
        <meshBasicMaterial color="#f472b6" transparent opacity={0.8} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <mesh ref={ringRef} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.7, 32]} />
        <meshBasicMaterial color="#e879f9" side={THREE.DoubleSide} transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      {quality !== 'low' && (
        <points ref={particlesRef}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[particlePositions, 3]} />
          </bufferGeometry>
          <pointsMaterial color="#f0abfc" size={0.065} transparent opacity={0.75} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </points>
      )}
    </group>
  )
}
