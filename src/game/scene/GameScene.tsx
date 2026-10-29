import { useMemo } from 'react'
import { THEMES } from '../core/themes'
import { GameEngine } from '../engine/GameEngine'
import { useGameStore } from '../state/useGameStore'
import { CameraRig } from './CameraRig'
import { EngineTicker } from './EngineTicker'
import { ExitBeacon } from './ExitBeacon'
import { FloorTiles } from './FloorTiles'
import { GameEffects } from './GameEffects'
import { MazeWalls } from './MazeWalls'
import { Player } from './Player'
import { ScanPath } from './ScanPath'
import { StartExitMarkers } from './StartExitMarkers'
import { useStudioEnvironment } from './useStudioEnvironment'

interface GameSceneProps {
  engine: GameEngine
}

export function GameScene({ engine }: GameSceneProps) {
  // 摄影棚环境反射：让墙体 PBR 材质真正显色（此前无 envMap，金属墙全黑）
  useStudioEnvironment()
  const quality = useGameStore((s) => s.quality)
  const isHighQuality = quality === 'high' || quality === 'auto'
  const maze = engine.maze

  const themeKey = useGameStore((s) => s.theme)
  const theme = THEMES[themeKey] || THEMES.cyber

  const phase = useGameStore((s) => s.phase)
  const isSurveying = useGameStore((s) => s.isSurveying)

  const shadowFrustum = useMemo(() => {
    return Math.max(maze.w, maze.h) * 2 + 6
  }, [maze.w, maze.h])

  // 雾效必须严格置于视距外（> 相机与迷宫实际最大距离），只用于无边界远景平滑过渡进背景色，
  // 绝不能在游玩主视野内起雾，否则手机竖屏相机与小迷宫（如 5×5、7×7）会被浓雾彻底吞没（亮色白茫茫一片、紫色全黑看不到路）。
  const fogRange = useMemo<[number, number]>(() => {
    const span = Math.max(maze.w, maze.h)
    const overview =
      isSurveying || phase === 'ready' || phase === 'revealing' || phase === 'won'
    if (overview) return [1000, 1001]
    const near = Math.max(45, span * 4.5)
    const far = Math.max(90, span * 9)
    return [near, far]
  }, [maze.w, maze.h, isSurveying, phase])

  return (
    <>
      {/* 场景氛围雾效 */}
      <fog attach="fog" args={[theme.fogColor, fogRange[0], fogRange[1]]} />

      {/* 1. 引擎 Tick 驱动器（置于最前保证优先级 -1 并在组件之前执行） */}
      <EngineTicker engine={engine} />

      {/* 2. 智能跟随/俯瞰相机 */}
      <CameraRig engine={engine} />

      {/* 3. 环境光照系统：降低环境散射光比，凸显方向光阴影与实体明暗交界线 */}
      <hemisphereLight
        color={theme.lightHemiSky}
        groundColor={theme.lightHemiGround}
        intensity={theme.id === 'light' ? 0.45 : 0.35}
      />
      <directionalLight
        position={[18, 30, 22]}
        color={theme.lightDirColor}
        intensity={theme.lightDirIntensity}
        castShadow={isHighQuality}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={80}
        shadow-camera-left={-shadowFrustum}
        shadow-camera-right={shadowFrustum}
        shadow-camera-top={shadowFrustum}
        shadow-camera-bottom={-shadowFrustum}
        shadow-bias={-0.0001}
        shadow-normalBias={0.02}
      />
      {/* 轮廓勾边逆光：从主光相对反侧打入，不投阴影，勾勒墙体外缘 */}
      <directionalLight
        position={[-18, 22, -20]}
        color={theme.stripColor}
        intensity={theme.id === 'light' ? 0.35 : 0.48}
        castShadow={false}
      />

      {/* 4. 迷宫核心 3D 实体 */}
      <MazeWalls
        w={maze.w}
        h={maze.h}
        getEdgeHeight={(e) => engine.getEdgeHeight(e)}
        getEdgeVisual={(e) => engine.getEdgeVisual(e)}
      />

      <FloorTiles w={maze.w} h={maze.h} engine={engine} />

      <StartExitMarkers startRoom={maze.start} exitRoom={maze.exit} w={maze.w} h={maze.h} />

      <Player engine={engine} />

      <ExitBeacon engine={engine} />

      <ScanPath engine={engine} w={maze.w} h={maze.h} />
      <GameEffects engine={engine} />
    </>
  )
}
