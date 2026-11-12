type DuckListener = (ducked: boolean) => void

let activeDucks = 0
const listeners = new Set<DuckListener>()

function notifyListeners() {
  const ducked = activeDucks > 0
  for (const listener of listeners) listener(ducked)
}

/** Subscribe to one-shot effects that temporarily silence background music. */
export function subscribeToMusicDucking(listener: DuckListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Acquire a mute lease. Music returns only after every active lease is released. */
export function acquireMusicDuck(): () => void {
  activeDucks += 1
  notifyListeners()

  let released = false
  return () => {
    if (released) return
    released = true
    activeDucks = Math.max(0, activeDucks - 1)
    notifyListeners()
  }
}
