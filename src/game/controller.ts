import { sfx } from './audio/sfx'
import { CAMPAIGN_LEVELS, GameMode, getCampaignLevel, MazeSize } from './core/constants'
import { dailySeed, randomSeed, sanitizeSeed } from './core/rng'
import { GameEngine } from './engine/GameEngine'
import { RunConfig } from './engine/types'
import { translate } from './i18n/store'
import { useGameStore } from './state/useGameStore'

let runIdCounter = 0

class GameController {
  private engine: GameEngine | null = null
  private unbindEvents: (() => void) | null = null
  private bumpTimes: number[] = []

  getEngine(): GameEngine | null {
    return this.engine
  }

  startRun(params?: {
    seed?: string
    size?: MazeSize
    shifting?: boolean
    reducedMotion?: boolean
    mode?: GameMode
    levelId?: number
  }): void {
    const store = useGameStore.getState()
    const campaignLevel = params?.levelId ? getCampaignLevel(params.levelId) : null
    const seed = sanitizeSeed(campaignLevel?.seed ?? params?.seed ?? store.seedInput)
    const size = params?.size ?? (campaignLevel ? (campaignLevel.w <= 9 ? 's' : campaignLevel.w <= 15 ? 'm' : 'l') : store.size)
    const shifting = campaignLevel?.shifting ?? params?.shifting ?? store.shifting
    const mode = campaignLevel ? 'campaign' : params?.mode ?? 'free'
    const reducedMotion = params?.reducedMotion ?? store.reducedMotion

    // 1. 解绑旧引擎
    if (this.unbindEvents) {
      this.unbindEvents()
      this.unbindEvents = null
    }

    // 2. 创建新局
    const runId = ++runIdCounter
    this.bumpTimes = []
    const cfg: RunConfig = {
      seed,
      size,
      shifting,
      mode,
      campaign: campaignLevel ?? undefined,
      reducedMotion,
      runId,
    }

    const newEngine = new GameEngine(cfg)
    this.engine = newEngine

    // 3. 绑定引擎离散事件到 UI 状态投影与音频
    this.unbindEvents = newEngine.on((ev) => {
      if (ev.runId !== runId) return // 忽略过往旧局事件

      switch (ev.type) {
        case 'phase':
          store._syncEnginePhase(ev.phase)
          break
        case 'moveStart':
          sfx.playMoveStart()
          break
        case 'moveEnd':
          store._syncEngineMoves(ev.moves)
          break
        case 'bump': {
          sfx.playBump()
          const now = performance.now()
          this.bumpTimes = this.bumpTimes.filter((time) => now - time < 3000)
          this.bumpTimes.push(now)
          if (this.bumpTimes.length === 2 && newEngine.forceChargesRemaining > 0) {
            store.showToast(translate('toast.blockedHint'), 'info')
          }
          break
        }
        case 'shiftWarn':
          sfx.playShiftWarn()
          break
        case 'shiftMotion':
          sfx.playShiftMotion()
          break
        case 'shiftEnd':
          store._syncEngineShifts(ev.shiftsDone)
          break
        case 'forceShiftUsed':
          store._syncEngineForce(ev.chargesRemaining)
          break
        case 'scanStart':
          sfx.playScanStart()
          store._syncEngineScans(ev.chargesRemaining)
          break
        case 'won':
          sfx.playWon()
          store._syncEngineWon({
            elapsed: ev.elapsed,
            moves: ev.moves,
            scansUsed: ev.scansUsed,
            shiftsDone: ev.shiftsDone,
            optimalMoves: ev.optimalMoves,
          })
          break
      }
    })

    // 4. 同步初始投影
    store._syncEngineRun({
      runId,
      phase: newEngine.phase,
      seed,
      size,
      shifting,
      mode,
      campaignLevel,
      scansRemaining: newEngine.scanChargesRemaining,
      forceCharges: newEngine.forceChargesRemaining,
    })

    store.setPage('game')
    sfx.init()
  }

  startCampaign(levelId: number): void {
    this.startRun({ levelId })
  }

  startDaily(): void {
    this.startRun({ seed: dailySeed(), size: 'm', shifting: true, mode: 'daily' })
  }

  nextLevel(): void {
    const levelId = useGameStore.getState().activeLevel?.id
    if (levelId && levelId < CAMPAIGN_LEVELS.length) this.startCampaign(levelId + 1)
  }

  restart(): void {
    const store = useGameStore.getState()
    this.startRun({
      seed: store.activeSeed,
      size: store.size,
      shifting: store.shifting,
      mode: store.mode,
      levelId: store.activeLevel?.id,
    })
  }

  newMaze(): void {
    const store = useGameStore.getState()
    const newSeed = randomSeed()
    store.setSeedInput(newSeed)
    this.startRun({
      seed: newSeed,
      size: store.size,
      shifting: store.shifting,
      mode: 'free',
    })
  }

  toMenu(): void {
    if (this.unbindEvents) {
      this.unbindEvents()
      this.unbindEvents = null
    }
    this.engine = null
    useGameStore.getState().setPage('title')
  }

  toLab(): void {
    if (this.unbindEvents) {
      this.unbindEvents()
      this.unbindEvents = null
    }
    this.engine = null
    useGameStore.getState().setPage('lab')
    sfx.init()
  }
}

export const controller = new GameController()
