import { useEffect, useRef } from 'react'
import { controller } from '../controller'
import { Dir, screenToWorldDir } from '../core/grid'
import { CameraMode } from '../state/persistence'
import { useGameStore } from '../state/useGameStore'

const KEY_TO_SCREEN_DIR: Record<string, Dir> = {
  KeyW: 0,
  ArrowUp: 0,
  KeyD: 1,
  ArrowRight: 1,
  KeyS: 2,
  ArrowDown: 2,
  KeyA: 3,
  ArrowLeft: 3,
}

function movementDir(code: string, mode: CameraMode): Dir | null {
  if (mode === 'first') {
    if (code === 'KeyQ') return 3
    if (code === 'KeyE') return 1
    if (code === 'KeyA' || code === 'ArrowLeft' || code === 'KeyD' || code === 'ArrowRight') return null
  }
  return KEY_TO_SCREEN_DIR[code] ?? null
}

export function useKeyboardInput(): void {
  const heldCodesRef = useRef<string[]>([])

  useEffect(() => {
    const clearMovement = () => {
      heldCodesRef.current = []
      controller.getEngine()?.clearInput()
    }

    const turn = (dir: 1 | -1) => {
      clearMovement()
      useGameStore.getState().rotateYaw(dir)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return

      const store = useGameStore.getState()
      if (store.currentPage !== 'game') return
      const engine = controller.getEngine()
      if (!engine) return

      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault()

      if (engine.phase === 'revealing' && (movementDir(e.code, store.cameraMode) !== null || e.code === 'Space' || e.code === 'Enter')) {
        engine.skipReveal()
        return
      }

      if (store.cameraMode === 'first' && !e.repeat) {
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') return turn(-1)
        if (e.code === 'KeyD' || e.code === 'ArrowRight') return turn(1)
      }

      const screenDir = movementDir(e.code, store.cameraMode)
      if (screenDir !== null) {
        if (!heldCodesRef.current.includes(e.code)) heldCodesRef.current.push(e.code)
        const worldDir = screenToWorldDir(screenDir, store.yawStep)
        engine.tap(worldDir)
        engine.setHeld(worldDir)
        return
      }

      if (e.repeat) return

      switch (e.code) {
        case 'Space':
          store.setSurveying(true)
          engine.setSurvey(true)
          break
        case 'KeyF': {
          const result = engine.scan()
          if (result === 'busy') store.showToast('变形或扫描进行中，稍后再试', 'warn')
          if (result === 'no-charges') store.showToast('本局扫描已用完')
          break
        }
        case 'KeyG': {
          const result = engine.forceShift()
          if (result === 'busy') store.showToast('变形进行中，稍等一下', 'warn')
          if (result === 'no-charges') store.showToast('主动重构次数已用完')
          if (result === 'not-allowed') store.showToast('静态迷宫无法主动重构')
          break
        }
        case 'KeyQ':
          if (store.cameraMode === 'third') turn(-1)
          break
        case 'KeyE':
          if (store.cameraMode === 'third') turn(1)
          break
        case 'KeyV':
          clearMovement()
          store.toggleCameraMode()
          store.showToast(store.cameraMode === 'third' ? '第一人称 · WASD 移动，A/D 转向' : '已切换第三人称')
          break
        case 'KeyH':
          store.toggleCinematic()
          break
        case 'Escape':
          if (store.cinematic) store.setCinematic(false)
          else if (engine.phase === 'playing' || engine.phase === 'ready') engine.pause()
          else if (engine.phase === 'paused') engine.resume()
          break
        case 'KeyP':
          if (engine.phase === 'playing' || engine.phase === 'ready') engine.pause()
          else if (engine.phase === 'paused') engine.resume()
          break
        case 'KeyR':
          clearMovement()
          controller.restart()
          break
        case 'KeyN':
          clearMovement()
          controller.newMaze()
          break
        case 'KeyM':
          store.setSoundEnabled(!store.soundEnabled)
          store.showToast(store.soundEnabled ? '音效已关闭' : '音效已开启')
          break
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const store = useGameStore.getState()
      if (store.currentPage !== 'game') return
      const engine = controller.getEngine()
      if (!engine) return

      heldCodesRef.current = heldCodesRef.current.filter((code) => code !== e.code)
      const lastCode = heldCodesRef.current.at(-1)
      const lastDir = lastCode ? movementDir(lastCode, store.cameraMode) : null
      engine.setHeld(lastDir === null ? null : screenToWorldDir(lastDir, store.yawStep))

      if (e.code === 'Space') {
        store.setSurveying(false)
        engine.setSurvey(false)
      }
    }

    const handleWindowBlur = () => {
      clearMovement()
      const engine = controller.getEngine()
      if (engine) {
        engine.setSurvey(false)
        if (engine.phase === 'playing') engine.pause()
      }
      useGameStore.getState().setSurveying(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleWindowBlur)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleWindowBlur)
    }
  }, [])
}
