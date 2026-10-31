import { useEffect, useRef } from 'react'
import { controller } from '../controller'
import { Dir, screenToWorldDir } from '../core/grid'
import { translate } from '../i18n/store'
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
          if (result === 'busy') store.showToast(translate('toast.scanBusy'), 'warn')
          if (result === 'no-charges') store.showToast(translate('toast.scanEmpty'))
          break
        }
        case 'KeyG': {
          const result = engine.forceShift()
          if (result === 'busy') store.showToast(translate('toast.forceBusy'), 'warn')
          if (result === 'no-charges') store.showToast(translate('toast.forceEmpty'))
          if (result === 'not-allowed') store.showToast(translate('toast.forceNotAllowed'))
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
          store.showToast(store.cameraMode === 'third' ? translate('toast.cameraFirst') : translate('toast.cameraThird'))
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
          store.showToast(store.soundEnabled ? translate('toast.soundOff') : translate('toast.soundOn'))
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
