import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { WALL_H, WALL_LOW } from '../core/constants'
import { edgeCount, edgeRooms, roomXY } from '../core/grid'
import { THEMES } from '../core/themes'
import { EdgeVisualState } from '../engine/types'
import { useGameStore } from '../state/useGameStore'

interface MazeWallsProps {
  w: number
  h: number
  getEdgeHeight: (e: number) => number
  getEdgeVisual: (e: number) => EdgeVisualState
}

const COLOR_AMBER = new THREE.Color('#f59e0b')
const COLOR_EMERALD = new THREE.Color('#34d399')
const COLOR_WHITE = new THREE.Color('#ffffff')
const tempPulseColor = new THREE.Color()
const tempStripColor = new THREE.Color()
const tempWallColor = new THREE.Color()

// 墙顶只保留一道细描线：整面发光盖板会让俯视画面变成深蓝/浅蓝拼接的棋盘
const STRIP_LONG = 1.98
const STRIP_THIN = 0.14
const PILLAR_DOT = 0.18

export function MazeWalls({ w, h, getEdgeHeight, getEdgeVisual }: MazeWallsProps) {
  const wallMeshRef = useRef<THREE.InstancedMesh>(null!)
  const stripMeshRef = useRef<THREE.InstancedMesh>(null!)

  const themeKey = useGameStore((s) => s.theme)
  const theme = THEMES[themeKey] || THEMES.cyber
  // 顶条色值适度压制（约 72% 主题色，亮色 85%），避免 toneMapped={false} 产生满屏过曝纯白盖板
  const colorStrip = useMemo(() => {
    const c = new THREE.Color(theme.stripColor)
    return c.multiplyScalar(theme.id === 'light' ? 0.85 : 0.72)
  }, [theme.stripColor, theme.id])
  const colorDot = useMemo(() => colorStrip.clone().multiplyScalar(0.5), [colorStrip])
  const wallColorObj = useMemo(() => new THREE.Color(theme.wallColor), [theme.wallColor])
  // 低墙就是敞开的通道口，颜色必须贴近地面，否则整片地面会被浅色方块填满
  const lowWallColor = useMemo(() => new THREE.Color(theme.tileDefault), [theme.tileDefault])

  const applyWallColor = (idx: number, height: number) => {
    const t = Math.max(0, Math.min(1, (height - WALL_LOW) / (WALL_H - WALL_LOW)))
    tempWallColor.copy(lowWallColor).lerp(wallColorObj, t)
    wallMeshRef.current.setColorAt(idx, tempWallColor)
  }

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const totalEdges = edgeCount(w, h)

  // 实验室模式每次步进都会传入新的回调函数引用。用 ref 持有最新值，
  // 避免把回调写进 effect 依赖后，每帧触发全部实例的矩阵重建。
  const getEdgeHeightRef = useRef(getEdgeHeight)
  getEdgeHeightRef.current = getEdgeHeight

  // 1. 静态柱子与边界块坐标列表
  const { staticBlocks, edgeCoords, totalInstances, staticCount } = useMemo(() => {
    const statics: { x: number; z: number; dot: boolean }[] = []
    const gridW = 2 * w + 1
    const gridH = 2 * h + 1

    for (let j = 0; j < gridH; j++) {
      for (let i = 0; i < gridW; i++) {
        const isPillar = i % 2 === 0 && j % 2 === 0
        const isBoundary = i === 0 || i === gridW - 1 || j === 0 || j === gridH - 1
        if (isPillar || isBoundary) {
          statics.push({
            x: i - w,
            z: j - h,
            dot: isPillar && !isBoundary,
          })
        }
      }
    }

    // 边 e 对应的方块中心坐标 (x, z)；runsX 表示墙体沿 x 轴延伸
    const edges: { x: number; z: number; runsX: boolean }[] = []
    for (let e = 0; e < totalEdges; e++) {
      const [a, b] = edgeRooms(e, w, h)
      const coordA = roomXY(a, w)
      const coordB = roomXY(b, w)
      const blockI = coordA.x + coordB.x + 1
      const blockJ = coordA.y + coordB.y + 1
      edges.push({
        x: blockI - w,
        z: blockJ - h,
        runsX: coordA.x === coordB.x,
      })
    }

    return {
      staticBlocks: statics,
      edgeCoords: edges,
      totalInstances: statics.length + totalEdges,
      staticCount: statics.length,
    }
  }, [w, h, totalEdges])

  // 上一帧高度与视觉状态缓存，仅发生变化时写 instanceMatrix / instanceColor
  const prevHeightsRef = useRef<Float32Array>(new Float32Array(totalEdges))
  const prevVisualsRef = useRef<EdgeVisualState[]>(new Array(totalEdges).fill('idle'))

  // 2. 初始化矩阵与颜色（必须在首渲染前 setColorAt）
  useLayoutEffect(() => {
    if (!wallMeshRef.current || !stripMeshRef.current) return

    // 静态柱子与边界
    for (let i = 0; i < staticCount; i++) {
      const pos = staticBlocks[i]

      // 墙体矩阵
      dummy.position.set(pos.x, WALL_H / 2, pos.z)
      dummy.scale.set(1, WALL_H, 1)
      dummy.updateMatrix()
      wallMeshRef.current.setMatrixAt(i, dummy.matrix)
      wallMeshRef.current.setColorAt(i, wallColorObj)

      // 顶条：柱心只留一个节点，边界交给连续霓虹边框
      if (pos.dot) {
        dummy.position.set(pos.x, WALL_H + 0.033, pos.z)
        dummy.scale.set(PILLAR_DOT, 1, PILLAR_DOT)
        dummy.updateMatrix()
        stripMeshRef.current.setMatrixAt(i, dummy.matrix)
        stripMeshRef.current.setColorAt(i, colorDot)
      } else {
        dummy.position.set(pos.x, 0, pos.z)
        dummy.scale.set(0, 0, 0)
        dummy.updateMatrix()
        stripMeshRef.current.setMatrixAt(i, dummy.matrix)
        stripMeshRef.current.setColorAt(i, colorStrip)
      }
    }

    // 动态边墙
    for (let e = 0; e < totalEdges; e++) {
      const idx = staticCount + e
      const pos = edgeCoords[e]
      const height = getEdgeHeightRef.current(e)

      prevHeightsRef.current[e] = height
      prevVisualsRef.current[e] = 'idle'

      // 墙体
      dummy.position.set(pos.x, height / 2, pos.z)
      dummy.scale.set(1, height, 1)
      dummy.updateMatrix()
      wallMeshRef.current.setMatrixAt(idx, dummy.matrix)
      applyWallColor(idx, height)

      // 顶条：沿墙体延伸方向的一条细霓虹描线
      const isUp = height > WALL_LOW + 0.02
      if (isUp) {
        const heightRatio = Math.max(0, Math.min(1, (height - WALL_LOW) / (WALL_H - WALL_LOW)))
        dummy.position.set(pos.x, height + 0.03, pos.z)
        dummy.scale.set(
          pos.runsX ? STRIP_LONG : STRIP_THIN,
          Math.max(0.1, heightRatio),
          pos.runsX ? STRIP_THIN : STRIP_LONG,
        )
        dummy.updateMatrix()
        stripMeshRef.current.setMatrixAt(idx, dummy.matrix)
        tempStripColor.copy(colorStrip).multiplyScalar(0.3 + 0.7 * heightRatio)
        stripMeshRef.current.setColorAt(idx, tempStripColor)
      } else {
        dummy.position.set(pos.x, 0, pos.z)
        dummy.scale.set(0, 0, 0)
        dummy.updateMatrix()
        stripMeshRef.current.setMatrixAt(idx, dummy.matrix)
        stripMeshRef.current.setColorAt(idx, colorStrip)
      }
    }

    wallMeshRef.current.instanceMatrix.needsUpdate = true
    stripMeshRef.current.instanceMatrix.needsUpdate = true
    if (wallMeshRef.current.instanceColor) {
      wallMeshRef.current.instanceColor.needsUpdate = true
    }
    if (stripMeshRef.current.instanceColor) {
      stripMeshRef.current.instanceColor.needsUpdate = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staticBlocks, edgeCoords, staticCount, totalEdges, dummy, colorStrip, colorDot, wallColorObj, lowWallColor])

  // 主题切换时实时刷新墙顶霓虹条色彩
  useEffect(() => {
    if (!stripMeshRef.current) return
    for (let i = 0; i < staticCount; i++) {
      stripMeshRef.current.setColorAt(i, staticBlocks[i].dot ? colorDot : colorStrip)
    }
    for (let i = staticCount; i < totalInstances; i++) {
      stripMeshRef.current.setColorAt(i, colorStrip)
    }
    if (stripMeshRef.current.instanceColor) {
      stripMeshRef.current.instanceColor.needsUpdate = true
    }
  }, [colorStrip, colorDot, staticBlocks, staticCount, totalInstances])

  // 主题切换时刷新墙体实例色：低墙保持贴地暗色，高墙回到墙体色
  useEffect(() => {
    if (!wallMeshRef.current) return
    for (let i = 0; i < staticCount; i++) {
      wallMeshRef.current.setColorAt(i, wallColorObj)
    }
    for (let e = 0; e < totalEdges; e++) {
      applyWallColor(staticCount + e, getEdgeHeightRef.current(e))
    }
    if (wallMeshRef.current.instanceColor) {
      wallMeshRef.current.instanceColor.needsUpdate = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallColorObj, lowWallColor, staticCount, totalEdges])

  // 3. 逐帧按需更新动态边
  useFrame(({ clock }) => {
    if (!wallMeshRef.current || !stripMeshRef.current) return

    let matrixNeedsUpdate = false
    let colorNeedsUpdate = false
    let wallColorNeedsUpdate = false
    const time = clock.getElapsedTime()

    for (let e = 0; e < totalEdges; e++) {
      const currentHeight = getEdgeHeight(e)
      const currentVisual = getEdgeVisual(e)
      const prevH = prevHeightsRef.current[e]
      const prevV = prevVisualsRef.current[e]

      const isWarnClose = currentVisual === 'warn-close'
      const isWarnOpen = currentVisual === 'warn-open'

      // 处于警告闪烁状态时，每帧均需更新脉冲颜色/起伏
      const needsColorPulse = isWarnClose || isWarnOpen
      const heightChanged = Math.abs(currentHeight - prevH) > 0.001
      const visualChanged = currentVisual !== prevV

      if (heightChanged || visualChanged || needsColorPulse) {
        matrixNeedsUpdate = true
        colorNeedsUpdate = true

        const idx = staticCount + e
        const pos = edgeCoords[e]

        // 墙体变换
        dummy.position.set(pos.x, currentHeight / 2, pos.z)
        dummy.scale.set(1, currentHeight, 1)
        dummy.updateMatrix()
        wallMeshRef.current.setMatrixAt(idx, dummy.matrix)
        if (heightChanged) {
          applyWallColor(idx, currentHeight)
          wallColorNeedsUpdate = true
        }

        // 顶条变换：细线沿墙延伸，随高度与警告状态平滑响应
        const isUp = currentHeight > WALL_LOW + 0.02 || isWarnOpen || isWarnClose
        if (isUp) {
          const heightRatio = Math.max(0, Math.min(1, (currentHeight - WALL_LOW) / (WALL_H - WALL_LOW)))
          dummy.position.set(pos.x, currentHeight + 0.03, pos.z)
          dummy.scale.set(
            pos.runsX ? STRIP_LONG : STRIP_THIN,
            isWarnOpen || isWarnClose ? 1 : Math.max(0.1, heightRatio),
            pos.runsX ? STRIP_THIN : STRIP_LONG,
          )
        } else {
          dummy.position.set(pos.x, 0, pos.z)
          dummy.scale.set(0, 0, 0)
        }
        dummy.updateMatrix()
        stripMeshRef.current.setMatrixAt(idx, dummy.matrix)

        // 颜色计算
        if (isWarnClose) {
          // 4 Hz 亮度脉冲
          const pulse = (Math.sin(time * 4 * 2 * Math.PI) + 1) / 2
          tempPulseColor.copy(COLOR_AMBER).lerp(COLOR_WHITE, pulse * 0.4)
          stripMeshRef.current.setColorAt(idx, tempPulseColor)
        } else if (isWarnOpen) {
          // 8 Hz 翡翠绿白交替闪烁（开路提示：绿白闪烁，与琥珀封路预警形成双色语法）
          const flash = Math.sin(time * 8 * 2 * Math.PI) > 0
          stripMeshRef.current.setColorAt(idx, flash ? COLOR_WHITE : COLOR_EMERALD)
        } else {
          // 常态：升起为主题霓虹灯带，亮度随升降高度平滑衰减
          const heightRatio = Math.max(0, Math.min(1, (currentHeight - WALL_LOW) / (WALL_H - WALL_LOW)))
          tempStripColor.copy(colorStrip).multiplyScalar(0.3 + 0.7 * heightRatio)
          stripMeshRef.current.setColorAt(idx, tempStripColor)
        }

        prevHeightsRef.current[e] = currentHeight
        prevVisualsRef.current[e] = currentVisual
      }
    }

    if (matrixNeedsUpdate) {
      wallMeshRef.current.instanceMatrix.needsUpdate = true
      stripMeshRef.current.instanceMatrix.needsUpdate = true
    }
    if (wallColorNeedsUpdate && wallMeshRef.current.instanceColor) {
      wallMeshRef.current.instanceColor.needsUpdate = true
    }
    if (colorNeedsUpdate && stripMeshRef.current.instanceColor) {
      stripMeshRef.current.instanceColor.needsUpdate = true
    }
  })

  return (
    <group>
      {/* 墙体 InstancedMesh */}
      <instancedMesh
        ref={wallMeshRef}
        args={[undefined, undefined, totalInstances]}
        castShadow
        receiveShadow
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        {/* 材质基色为白：最终颜色由实例色决定，低墙才能单独压暗贴地 */}
        <meshStandardMaterial
          color="#ffffff"
          metalness={theme.wallMetalness}
          roughness={theme.wallRoughness}
          envMapIntensity={0.7}
        />
      </instancedMesh>

      {/* 墙顶霓虹描线 InstancedMesh：细线贴合金属顶面，只有柱心保留节点 */}
      <instancedMesh
        ref={stripMeshRef}
        args={[undefined, undefined, totalInstances]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 0.06, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      {/* 外圈立体霓虹边框：采用 3D 实心长方体闭环，彻底根除 2D 薄面片与深度缓冲冲突导致的走样闪烁 */}
      <group position={[0, WALL_H + 0.035, 0]}>
        {/* 北边条 */}
        <mesh position={[0, 0, -h]}>
          <boxGeometry args={[2 * w + 1, 0.04, STRIP_THIN]} />
          <meshBasicMaterial color={colorStrip} toneMapped={false} />
        </mesh>
        {/* 南边条 */}
        <mesh position={[0, 0, h]}>
          <boxGeometry args={[2 * w + 1, 0.04, STRIP_THIN]} />
          <meshBasicMaterial color={colorStrip} toneMapped={false} />
        </mesh>
        {/* 西边条 */}
        <mesh position={[-w, 0, 0]}>
          <boxGeometry args={[STRIP_THIN, 0.04, 2 * h + 1]} />
          <meshBasicMaterial color={colorStrip} toneMapped={false} />
        </mesh>
        {/* 东边条 */}
        <mesh position={[w, 0, 0]}>
          <boxGeometry args={[STRIP_THIN, 0.04, 2 * h + 1]} />
          <meshBasicMaterial color={colorStrip} toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}
