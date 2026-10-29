import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment'

/**
 * 共享摄影棚环境反射（PBR 显色的前提）。
 *
 * 根因记录：Standard/Physical 材质的金属度越高，漫反射越少，颜色主要来自
 * 环境反射。此前场景只有 hemisphere + directional 两盏灯、没有任何环境贴图，
 * 墙体 metalness 0.6 时无论 wallColor 提多亮都渲染成黑色。
 *
 * 这里用 three 内置 RoomEnvironment 离线生成 PMREM 环境贴图：
 * - 不下载任何 HDRI，零网络依赖、零新增资源文件；
 * - 每个 Canvas 只生成一次，组件卸载时释放 GPU 纹理；
 * - three r160 没有 scene.environmentIntensity，反射强度在各材质的
 *   envMapIntensity 上单独控制（见 MazeWalls / FloorTiles）。
 */
export function useStudioEnvironment() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const room = new RoomEnvironment(gl)
    const envMap = pmrem.fromScene(room, 0.04).texture
    scene.environment = envMap

    return () => {
      scene.environment = null
      envMap.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])
}
