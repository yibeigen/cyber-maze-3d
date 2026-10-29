import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { roomToWorld } from '../core/grid'
import { THEMES } from '../core/themes'
import { GameEngine } from '../engine/GameEngine'
import { useGameStore } from '../state/useGameStore'

interface FloorTilesProps {
  w: number
  h: number
  engine?: GameEngine
  getTileColor?: (room: number) => THREE.Color | null
  colorVersion?: number
}

const COLOR_TEAL_BRIGHT = new THREE.Color('#2dd4bf')
// 泛洪收敛色不能太暗，否则搜索结束后整片区域会重新变成黑色，玩家看不出算法探索过哪里
const COLOR_TEAL_DARK = new THREE.Color('#155e75')
const tempScanColor = new THREE.Color()
const tempBaseColor = new THREE.Color()

export function FloorTiles({
  w,
  h,
  engine,
  getTileColor,
  colorVersion,
}: FloorTilesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const totalRooms = w * h

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const prevFloodingRef = useRef(false)
  const prevVisitCountRef = useRef(1)
  const prevColorVersionRef = useRef<number | undefined>(undefined)

  const themeKey = useGameStore((s) => s.theme)
  const theme = THEMES[themeKey] || THEMES.cyber
  const defaultTileColor = useMemo(() => new THREE.Color(theme.tileDefault), [theme.tileDefault])
  const visitedTileColor = useMemo(
    () => new THREE.Color(theme.id === 'light' ? '#38bdf8' : theme.playerGlow),
    [theme.playerGlow, theme.id],
  )

  const getBaseColor = (room: number) => {
    if (getTileColor) return getTileColor(room) ?? defaultTileColor
    const age = engine?.getRoomVisitAge(room) ?? Infinity
    if (!Number.isFinite(age)) return defaultTileColor
    // 足迹平滑淡出：浅色模式下呈现透亮全息天蓝，暗色模式下呈现荧光青蓝
    const fade = Math.max(0, 1 - age / 18)
    const strength = (theme.id === 'light' ? 0.65 : 0.5) * fade * fade
    return tempBaseColor.copy(defaultTileColor).lerp(visitedTileColor, strength)
  }

  const applyBaseColors = () => {
    if (!meshRef.current) return
    for (let r = 0; r < totalRooms; r++) {
      meshRef.current.setColorAt(r, getBaseColor(r))
    }
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
  }

  useLayoutEffect(() => {
    if (!meshRef.current) return

    for (let r = 0; r < totalRooms; r++) {
      const pos = roomToWorld(r, w, h)
      dummy.position.set(pos.x, 0.01, pos.z)
      dummy.scale.set(0.96, 0.02, 0.96)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(r, dummy.matrix)
      meshRef.current.setColorAt(r, getBaseColor(r))
    }

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h, totalRooms, dummy, defaultTileColor])

  useEffect(() => {
    applyBaseColors()
  }, [defaultTileColor])

  // 扫描泛洪与实验室地砖状态色彩更新
  useFrame(() => {
    if (!meshRef.current) return

    // 实验室外部自定义着色逻辑
    if (getTileColor) {
      if (colorVersion !== prevColorVersionRef.current) {
        prevColorVersionRef.current = colorVersion
        for (let r = 0; r < totalRooms; r++) {
          const c = getTileColor(r) ?? defaultTileColor
          meshRef.current.setColorAt(r, c)
        }
        if (meshRef.current.instanceColor) {
          meshRef.current.instanceColor.needsUpdate = true
        }
      }
      return
    }

    // 游戏主模式扫描泛洪渐变
    if (engine) {
      const isFlooding = engine.hasActiveScanFlood
      const visitCount = engine.visitedHistory.length
      if (visitCount !== prevVisitCountRef.current) {
        prevVisitCountRef.current = visitCount
        if (!isFlooding) applyBaseColors()
      }

      if (isFlooding) {
        prevFloodingRef.current = true
        let updated = false

        for (let r = 0; r < totalRooms; r++) {
          const p = engine.getRoomScanProgress(r)
          if (p !== null) {
            tempScanColor.copy(COLOR_TEAL_BRIGHT).lerp(COLOR_TEAL_DARK, p)
            meshRef.current.setColorAt(r, tempScanColor)
            updated = true
          }
        }

        if (updated && meshRef.current.instanceColor) {
          meshRef.current.instanceColor.needsUpdate = true
        }
      } else if (prevFloodingRef.current) {
        prevFloodingRef.current = false
        applyBaseColors()
      }
    }
  })

  return (
    <group>
      {/* 底部无缝延展基底平面：纯净高级科技展台底座，彻底根除迷宫外部多余网格细线在走动时的摩尔纹与高频走样闪烁 */}
      <mesh position={[0, -0.015, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial color={theme.groundColor} roughness={0.95} metalness={0.05} />
      </mesh>

      {/* 房间地砖 InstancedMesh */}
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, totalRooms]}
        receiveShadow
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        {/*
         * 材质基色必须是白色：InstancedMesh 的最终颜色 = 材质 color × 实例 color。
         * 之前这里用 tileDefault（接近黑），把扫描泛洪和实验室状态的实例色一起压暗，
         * 导致这两个核心视觉反馈几乎不可见。
         */}
        <meshStandardMaterial
          color="#ffffff"
          roughness={theme.id === 'light' ? 0.3 : 0.6}
          metalness={theme.id === 'light' ? 0.1 : 0.3}
        />
      </instancedMesh>
    </group>
  )
}
