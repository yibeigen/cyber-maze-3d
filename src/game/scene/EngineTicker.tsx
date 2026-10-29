import { useFrame } from '@react-three/fiber'
import { GameEngine } from '../engine/GameEngine'

interface EngineTickerProps {
  engine: GameEngine
}

/**
 * 场景内唯一调用 engine.tick(delta) 的组件。
 * priority = -1 确保它在任何相机 rig 或场景读取组件之前执行。
 */
export function EngineTicker({ engine }: EngineTickerProps) {
  useFrame((_, delta) => {
    engine.tick(delta)
  }, -1)

  return null
}
