import { PerformanceMonitor } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { ReactNode, useEffect, useState } from 'react'
import { THEMES } from '../core/themes'
import { useGameStore } from '../state/useGameStore'

interface GameCanvasProps {
  children: ReactNode
}

function checkWebGLSupport(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const canvas = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    )
  } catch (e) {
    return false
  }
}

export function GameCanvas({ children }: GameCanvasProps) {
  // 首帧就判掉 WebGL 支持，避免先挂载 Canvas 再报错
  const [hasWebGL] = useState(() => checkWebGLSupport())
  const [contextLost, setContextLost] = useState(false)

  const quality = useGameStore((s) => s.quality)

  // 自动降级只作用于本次会话，不写回用户设置：
  // 否则一次偶发掉帧会把"自动"永久锁成"低画质"，用户再也回不去。
  const [autoDowngraded, setAutoDowngraded] = useState(false)
  useEffect(() => {
    setAutoDowngraded(false)
  }, [quality])

  const isLowQuality = quality === 'low' || autoDowngraded
  const isAutoQuality = quality === 'auto' && !autoDowngraded

  if (!hasWebGL) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-sunken p-6 text-center font-sans text-ink">
        <div className="max-w-md space-y-4 rounded-xl border border-warn/30 bg-surface p-6">
          <div className="text-lg font-bold text-warn">⚠️ WebGL 不可用</div>
          <p className="text-sm text-ink-dim">
            当前浏览器环境无法启用硬件加速 WebGL 渲染，请尝试开启浏览器硬件加速或更换现代浏览器。
          </p>
        </div>
      </div>
    )
  }

  if (contextLost) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-sunken p-6 text-center font-sans text-ink">
        <div className="max-w-md space-y-4 rounded-xl border border-warn/40 bg-surface p-6">
          <div className="text-lg font-bold text-warn">⚠️ 渲染器已中断</div>
          <p className="text-sm text-ink-dim">WebGL 上下文丢失，请重新加载页面。</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-cyber-accent px-5 py-2.5 text-sm font-semibold text-accent-ink transition-all hover:brightness-110 active:scale-[0.98]"
          >
            重新加载
          </button>
        </div>
      </div>
    )
  }

  const themeKey = useGameStore((s) => s.theme)
  const theme = THEMES[themeKey] || THEMES.cyber

  return (
    <div
      className="w-full h-full relative touch-none select-none overflow-hidden transition-colors duration-500"
      style={{ backgroundColor: theme.bgCanvas }}
    >
      <Canvas
        camera={{ position: [0, 20, 10], fov: 45, near: 0.08, far: 200 }}
        shadows={!isLowQuality}
        dpr={isLowQuality ? 1 : [1, 2]}
        gl={{
          antialias: !isLowQuality,
          powerPreference: 'high-performance',
          alpha: false,
        }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault()
            setContextLost(true)
          })
        }}
      >
        <color attach="background" args={[theme.bgCanvas]} />
        {isAutoQuality && (
          <PerformanceMonitor
            onDecline={() => {
              // 仅本次会话降级，刷新或重新选择画质即可恢复
              setAutoDowngraded(true)
            }}
          />
        )}
        {children}
      </Canvas>
    </div>
  )
}
