import { useFrame, useThree } from '@react-three/fiber'
import { easing } from 'maath'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { DIR_DELTA, Dir } from '../core/grid'
import { GameEngine } from '../engine/GameEngine'
import { useGameStore } from '../state/useGameStore'

export function CameraRig({ engine }: { engine: GameEngine }) {
  const { camera, viewport } = useThree()
  const yawStep = useGameStore((s) => s.yawStep)
  const isSurveying = useGameStore((s) => s.isSurveying)
  const phase = useGameStore((s) => s.phase)
  const reducedMotion = useGameStore((s) => s.reducedMotion)
  const cameraMode = useGameStore((s) => s.cameraMode)

  const currentLookAtRef = useRef(new THREE.Vector3())
  const targetCamPosRef = useRef(new THREE.Vector3(0, 20, 10))
  const targetLookAtRef = useRef(new THREE.Vector3())
  const revealStartRef = useRef<number | null>(null)
  const shakeStartRef = useRef<number | null>(null)

  useEffect(() => engine.on((event) => {
    if (event.type === 'shiftMotion') shakeStartRef.current = -1
  }), [engine])

  const { w, h } = engine.maze
  const extent = Math.max(2 * w + 1, 2 * h + 1)
  const followDist = 9 + Math.max(w, h) * 0.35

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime()
    if (phase === 'revealing') {
      if (revealStartRef.current === null) revealStartRef.current = time
    } else {
      revealStartRef.current = null
    }

    const isPortrait = viewport.aspect < 1
    const showOverview = isSurveying || phase === 'revealing' || phase === 'ready' || phase === 'won'
    const firstPerson = cameraMode === 'first' && !showOverview
    const perspective = camera as THREE.PerspectiveCamera
    const targetFov = firstPerson ? 70 : 45
    perspective.fov = reducedMotion ? targetFov : THREE.MathUtils.damp(perspective.fov, targetFov, 12, delta)
    perspective.updateProjectionMatrix()

    if (showOverview) {
      const fovRad = 45 * Math.PI / 360
      const aspect = Math.max(viewport.aspect, 0.3)
      const verticalNeed = extent / 2 / Math.tan(fovRad)
      const horizontalNeed = verticalNeed / aspect
      let camH = Math.max(verticalNeed, horizontalNeed) * 1.08

      if (!reducedMotion && revealStartRef.current !== null) {
        const progress = Math.min(1, Math.max(0, (time - revealStartRef.current) / 1.2))
        camH *= 1 + 0.45 * (1 - Math.pow(1 - progress, 3))
      } else if (!reducedMotion && phase === 'won') {
        camH *= 1.12
      }

      targetCamPosRef.current.set(0, camH, camH * Math.tan(10 * Math.PI / 180))
      targetLookAtRef.current.set(0, 0, 0)
      easing.damp3(camera.position, targetCamPosRef.current, 0.35, delta)
      easing.damp3(currentLookAtRef.current, targetLookAtRef.current, 0.35, delta)
    } else if (firstPerson) {
      const player = engine.getPlayerVisual()
      const forward = DIR_DELTA[yawStep as Dir]
      targetCamPosRef.current.set(player.x, 0.65, player.z)
      targetLookAtRef.current.set(player.x + forward.dx * 4, 0.58, player.z + forward.dy * 4)
      easing.damp3(camera.position, targetCamPosRef.current, 0.08, delta)
      easing.damp3(currentLookAtRef.current, targetLookAtRef.current, 0.14, delta)
    } else {
      const player = engine.getPlayerVisual()
      const actualFollowDist = followDist * (isPortrait ? 0.95 : 1.1)
      let camHeight = actualFollowDist * Math.sin(58 * Math.PI / 180)
      let horizDist = actualFollowDist * Math.cos(58 * Math.PI / 180)
      if (isPortrait) {
        camHeight *= 1.12
        horizDist *= 1.12
      }

      const forward = DIR_DELTA[yawStep as Dir]
      targetCamPosRef.current.set(player.x - forward.dx * horizDist, camHeight, player.z - forward.dy * horizDist)
      targetLookAtRef.current.set(player.x + forward.dx * 1.4, 0, player.z + forward.dy * 1.4)
      easing.damp3(camera.position, targetCamPosRef.current, 0.25, delta)
      easing.damp3(currentLookAtRef.current, targetLookAtRef.current, 0.25, delta)
    }

    if (shakeStartRef.current !== null) {
      if (shakeStartRef.current < 0) shakeStartRef.current = time
      const progress = (time - shakeStartRef.current) / 0.35
      if (progress >= 1 || reducedMotion || firstPerson) {
        shakeStartRef.current = null
      } else {
        const strength = (1 - progress) * 0.05
        camera.position.x += Math.sin(time * 97) * strength
        camera.position.z += Math.cos(time * 83) * strength
      }
    }

    camera.lookAt(currentLookAtRef.current)
  })

  return null
}
