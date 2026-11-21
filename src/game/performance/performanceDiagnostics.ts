export type PerformanceMarkName =
  | 'home-rendered'
  | 'game-start-requested'
  | 'asset-preparation-started'
  | 'asset-preparation-finished'
  | 'phaser-boot-started'
  | 'scene-create-started'
  | 'scene-create-finished'
  | 'world-ready'
  | 'first-interaction-received'
  | 'dialogue-module-ready'
  | 'dialogue-mounted'

export type PerformanceMeasure = {
  name: string
  durationMs: number
}

export type PerformanceWorkSample = {
  kind: 'tileset-extrusion' | 'npc-pathfinding'
  durationMs: number
}

export type PerformanceSnapshot = {
  enabled: boolean
  marks: PerformanceMarkName[]
  measures: PerformanceMeasure[]
  frameSamples: number[]
  workSamples: PerformanceWorkSample[]
  longFrameCount: number
}

const MARK_PREFIX = 'dsa-quest:'
const MAX_MEASURES = 60
const MAX_FRAME_SAMPLES = 120
const MAX_WORK_SAMPLES = 80
const LONG_FRAME_THRESHOLD_MS = 50

const markTimes = new Map<PerformanceMarkName, number>()
const measures: PerformanceMeasure[] = []
const frameSamples: number[] = []
const workSamples: PerformanceWorkSample[] = []
let longFrameCount = 0

function isEnabled(): boolean {
  return import.meta.env.DEV ||
    import.meta.env.VITE_ENABLE_PREVIEW_PERFORMANCE_DIAGNOSTICS === 'true'
}

export function markPerformance(name: PerformanceMarkName): void {
  if (!isEnabled() || typeof performance === 'undefined') return
  const now = performance.now()
  markTimes.set(name, now)
  try {
    performance.mark(`${MARK_PREFIX}${name}`)
  } catch {
    // Diagnostics must never interfere with the game loop.
  }
}

export function measurePerformance(
  name: string,
  start: PerformanceMarkName,
  end: PerformanceMarkName,
): number | null {
  if (!isEnabled() || typeof performance === 'undefined') return null
  const startTime = markTimes.get(start)
  const endTime = markTimes.get(end)
  if (startTime === undefined || endTime === undefined || endTime < startTime) return null

  const durationMs = endTime - startTime
  measures.push({ name, durationMs })
  if (measures.length > MAX_MEASURES) measures.shift()
  try {
    performance.measure(
      `${MARK_PREFIX}${name}`,
      `${MARK_PREFIX}${start}`,
      `${MARK_PREFIX}${end}`,
    )
  } catch {
    // The in-memory duration remains available even if the Performance API
    // has already cleared one of the browser marks.
  }
  return durationMs
}

export function recordFrame(deltaMs: number): void {
  if (!isEnabled() || !Number.isFinite(deltaMs) || deltaMs < 0) return
  frameSamples.push(deltaMs)
  if (frameSamples.length > MAX_FRAME_SAMPLES) frameSamples.shift()
  if (deltaMs >= LONG_FRAME_THRESHOLD_MS) longFrameCount += 1
}

export function recordWorkDuration(kind: PerformanceWorkSample['kind'], durationMs: number): void {
  if (!isEnabled() || !Number.isFinite(durationMs) || durationMs < 0) return
  workSamples.push({ kind, durationMs })
  if (workSamples.length > MAX_WORK_SAMPLES) workSamples.shift()
}

export function getPerformanceSnapshot(): PerformanceSnapshot {
  return {
    enabled: isEnabled(),
    marks: [...markTimes.keys()],
    measures: measures.map((measure) => ({ ...measure })),
    frameSamples: [...frameSamples],
    workSamples: workSamples.map((sample) => ({ ...sample })),
    longFrameCount,
  }
}

/** Test isolation only; this function is tree-shaken from production entry paths. */
export function resetPerformanceDiagnosticsForTests(): void {
  markTimes.clear()
  measures.length = 0
  frameSamples.length = 0
  workSamples.length = 0
  longFrameCount = 0
  if (typeof performance !== 'undefined') {
    try {
      performance.clearMarks(MARK_PREFIX)
      performance.clearMeasures(MARK_PREFIX)
    } catch {
      // Clearing diagnostics is best-effort.
    }
  }
}
