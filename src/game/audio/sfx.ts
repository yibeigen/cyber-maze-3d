import { useGameStore } from '../state/useGameStore'

class SoundManager {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private initialized: boolean = false

  init(): void {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {})
      }
      return
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return

      this.ctx = new AudioCtx()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = 0.4
      this.masterGain.connect(this.ctx.destination)

      this.initialized = true

      // 监听页面可见性以暂停/恢复音频上下文
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return
        if (document.hidden) {
          this.ctx.suspend().catch(() => {})
        } else {
          this.ctx.resume().catch(() => {})
        }
      })

      // 监听用户首次交互以在 iOS/现代浏览器无缝解锁 AudioContext
      if (typeof window !== 'undefined') {
        const unlock = () => {
          if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {})
          }
          window.removeEventListener('pointerdown', unlock)
          window.removeEventListener('keydown', unlock)
        }
        window.addEventListener('pointerdown', unlock, { passive: true })
        window.addEventListener('keydown', unlock, { passive: true })
      }
    } catch (e) {
      // 浏览器环境不支持或阻止时静默处理
    }
  }

  private isEnabled(): boolean {
    return useGameStore.getState().soundEnabled
  }

  playMoveStart(): void {
    if (!this.isEnabled()) return
    this.init()
    if (!this.ctx || !this.masterGain) return

    try {
      const now = this.ctx.currentTime
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(900, now)
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.04)

      gain.gain.setValueAtTime(0.08, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04)

      osc.connect(gain)
      gain.connect(this.masterGain)

      osc.start(now)
      osc.stop(now + 0.045)
    } catch (e) {}
  }

  playBump(): void {
    if (!this.isEnabled()) return
    this.init()
    if (!this.ctx || !this.masterGain) return

    try {
      const now = this.ctx.currentTime
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(140, now)
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.12)

      gain.gain.setValueAtTime(0.25, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)

      osc.connect(gain)
      gain.connect(this.masterGain)

      osc.start(now)
      osc.stop(now + 0.13)
    } catch (e) {}
  }

  playShiftWarn(): void {
    if (!this.isEnabled()) return
    this.init()
    if (!this.ctx || !this.masterGain) return

    try {
      const now = this.ctx.currentTime
      const playPulse = (startTime: number) => {
        if (!this.ctx || !this.masterGain) return
        const osc = this.ctx.createOscillator()
        const filter = this.ctx.createBiquadFilter()
        const gain = this.ctx.createGain()

        osc.type = 'square'
        osc.frequency.setValueAtTime(440, startTime)

        filter.type = 'lowpass'
        filter.frequency.setValueAtTime(800, startTime)

        gain.gain.setValueAtTime(0.18, startTime)
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18)

        osc.connect(filter)
        filter.connect(gain)
        gain.connect(this.masterGain)

        osc.start(startTime)
        osc.stop(startTime + 0.2)
      }

      playPulse(now)
      playPulse(now + 0.3)
    } catch (e) {}
  }

  playShiftMotion(): void {
    if (!this.isEnabled()) return
    this.init()
    if (!this.ctx || !this.masterGain) return

    try {
      const now = this.ctx.currentTime

      // 1. 低频隆隆轰鸣
      const osc = this.ctx.createOscillator()
      const rumbleGain = this.ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(65, now)
      osc.frequency.linearRampToValueAtTime(45, now + 0.6)

      rumbleGain.gain.setValueAtTime(0.12, now)
      rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6)

      osc.connect(rumbleGain)
      rumbleGain.connect(this.masterGain)
      osc.start(now)
      osc.stop(now + 0.62)

      // 2. 带通白噪声（液压机械质感）
      const bufferSize = this.ctx.sampleRate * 0.6
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
      const output = noiseBuffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1
      }

      const whiteNoise = this.ctx.createBufferSource()
      whiteNoise.buffer = noiseBuffer

      const filter = this.ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(500, now)
      filter.Q.setValueAtTime(3.0, now)

      const noiseGain = this.ctx.createGain()
      noiseGain.gain.setValueAtTime(0.15, now)
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6)

      whiteNoise.connect(filter)
      filter.connect(noiseGain)
      noiseGain.connect(this.masterGain)

      whiteNoise.start(now)
      whiteNoise.stop(now + 0.62)
    } catch (e) {}
  }

  playScanStart(): void {
    if (!this.isEnabled()) return
    this.init()
    if (!this.ctx || !this.masterGain) return

    try {
      const now = this.ctx.currentTime
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(300, now)
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.8)

      gain.gain.setValueAtTime(0.2, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8)

      osc.connect(gain)
      gain.connect(this.masterGain)

      osc.start(now)
      osc.stop(now + 0.82)
    } catch (e) {}
  }

  playWon(): void {
    if (!this.isEnabled()) return
    this.init()
    if (!this.ctx || !this.masterGain) return

    try {
      const now = this.ctx.currentTime
      const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99] // C4, E4, G4, C5, E5, G5

      notes.forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return
        const noteTime = now + idx * 0.08
        const osc = this.ctx.createOscillator()
        const gain = this.ctx.createGain()

        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, noteTime)

        gain.gain.setValueAtTime(0.2, noteTime)
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.25)

        osc.connect(gain)
        gain.connect(this.masterGain)

        osc.start(noteTime)
        osc.stop(noteTime + 0.26)
      })
    } catch (e) {}
  }
}

export const sfx = new SoundManager()
