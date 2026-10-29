import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { SIZE_CONFIGS, WALL_H, WALL_LOW } from '../core/constants'
import { roomToWorld } from '../core/grid'
import { createLabGenModel, createLabSolveModel, LAB_TILE_COLORS } from '../lab/labModel'
import { useGameStore } from '../state/useGameStore'
import { ExitBeacon } from './ExitBeacon'
import { FloorTiles } from './FloorTiles'
import { MazeWalls } from './MazeWalls'
import { ScanPath } from './ScanPath'
import { useStudioEnvironment } from './useStudioEnvironment'

// 地砖颜色与面板图例共用 labModel 里同一份色值，改一处两端同步
const COLOR_CYAN_ACTIVE = new THREE.Color(LAB_TILE_COLORS.active)
const COLOR_PURPLE_FRONTIER = new THREE.Color(LAB_TILE_COLORS.frontier)
const COLOR_TEAL_EXPANDED = new THREE.Color(LAB_TILE_COLORS.visited)
const COLOR_GOLD_PATH = new THREE.Color(LAB_TILE_COLORS.path)
const COLOR_DEFAULT = new THREE.Color(LAB_TILE_COLORS.default)

export function LabScene() {
  useStudioEnvironment()
  const lab = useGameStore((s) => s.lab)
  const setLabStepIndex = useGameStore((s) => s.setLabStepIndex)
  const setLabIsPlaying = useGameStore((s) => s.setLabIsPlaying)

  const { genAlgo, solveAlgo, size, seed, phase, stepIndex, isPlaying, speed } = lab
  const { w, h } = SIZE_CONFIGS[size]

  const { camera } = useThree()
  const controlsRef = useRef<any>(null)

  // 1. 建立生成与求解计算模型
  const genModel = useMemo(() => {
    return createLabGenModel(w, h, genAlgo, seed)
  }, [w, h, genAlgo, seed])

  const solveModel = useMemo(() => {
    return createLabSolveModel(w, h, solveAlgo, genModel.open, genModel.start, genModel.exit)
  }, [w, h, solveAlgo, genModel])

  // 2. 初始相机俯瞰视角定位（依据迷宫尺寸自适应）
  useEffect(() => {
    const extent = Math.max(2 * w + 1, 2 * h + 1)
    camera.position.set(0, extent * 1.15, extent * 0.85)
    camera.lookAt(0, 0, 0)
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0)
      controlsRef.current.update()
    }
  }, [w, h, camera])

  // 3. 动画播放步进循环（60 events/s * speed）
  const stepAccRef = useRef(0)
  useFrame((_, delta) => {
    if (!isPlaying) {
      stepAccRef.current = 0
      return
    }

    const totalSteps = phase === 'generate' ? genModel.totalSteps : solveModel.totalSteps
    stepAccRef.current += delta * 60 * speed

    if (stepAccRef.current >= 1) {
      const advance = Math.floor(stepAccRef.current)
      stepAccRef.current -= advance
      const nextIdx = Math.min(totalSteps, stepIndex + advance)

      if (nextIdx >= totalSteps) {
        setLabIsPlaying(false)
        setLabStepIndex(totalSteps)
      } else {
        setLabStepIndex(nextIdx)
      }
    }
  })

  // 4. 边墙高度回调
  const getEdgeHeight = (e: number): number => {
    if (phase === 'generate') {
      return genModel.getEdgeHeight(e, stepIndex)
    } else {
      return genModel.open[e] === 1 ? WALL_LOW : WALL_H
    }
  }

  const getEdgeVisual = (): 'idle' => 'idle'

  // 5. 地砖状态颜色回调
  const getTileColor = (room: number): THREE.Color => {
    if (phase === 'generate') {
      const state = genModel.getRoomTileState(room, stepIndex)
      switch (state) {
        case 'active':
          return COLOR_CYAN_ACTIVE
        case 'frontier':
          return COLOR_PURPLE_FRONTIER
        case 'visited':
          return COLOR_TEAL_EXPANDED
        default:
          return COLOR_DEFAULT
      }
    } else {
      const state = solveModel.getRoomTileState(room, stepIndex)
      switch (state) {
        case 'path':
          return COLOR_GOLD_PATH
        case 'frontier':
          return COLOR_PURPLE_FRONTIER
        case 'expanded':
          return COLOR_TEAL_EXPANDED
        default:
          return COLOR_DEFAULT
      }
    }
  }

  // 起点中心坐标
  const startPos = roomToWorld(genModel.start, w, h)

  return (
    <>
      {/* 自由环绕查看控制器 */}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minDistance={5}
        maxDistance={80}
      />

      {/* 场景光照 */}
      <hemisphereLight args={['#1e293b', '#020617', 0.8]} />
      <directionalLight position={[15, 30, 20]} intensity={1.2} />

      {/* 迷宫墙体（基于当前 stepIndex 动态计算高度） */}
      <MazeWalls
        key={`walls-${size}-${seed}-${genAlgo}`}
        w={w}
        h={h}
        getEdgeHeight={getEdgeHeight}
        getEdgeVisual={getEdgeVisual}
      />

      {/* 地面方砖（颜色由当前 stepIndex 的状态驱动） */}
      <FloorTiles
        key={`floor-${size}-${seed}-${genAlgo}`}
        w={w}
        h={h}
        getTileColor={getTileColor}
        colorVersion={stepIndex + (phase === 'generate' ? 0 : 100000)}
      />

      {/* 出口光柱标示 */}
      <ExitBeacon w={w} h={h} exitRoom={genModel.exit} />

      {/* 起点全息光环标记 */}
      <group position={[startPos.x, 0.05, startPos.z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.45, 32]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.85} side={THREE.DoubleSide} />
        </mesh>
        <pointLight color="#22d3ee" intensity={0.6} distance={2.5} />
      </group>

      {/* 求解阶段且到达终点时呈现黄金路径线 */}
      {phase === 'solve' && solveModel.isPathVisible(stepIndex) && (
        <ScanPath path={solveModel.path} w={w} h={h} />
      )}
    </>
  )
}
