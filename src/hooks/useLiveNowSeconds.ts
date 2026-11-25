import { useEffect, useState } from "react"

const DEFAULT_TICK_MS = 1_000

export const useLiveNowSeconds = (
  enabled: boolean,
  intervalMs: number = DEFAULT_TICK_MS,
): number => {
  const [tickNowSec, setTickNowSec] = useState(() => Date.now() / 1000)

  useEffect(() => {
    if (!enabled) return undefined
    setTickNowSec(Date.now() / 1000)
    const id = setInterval(() => setTickNowSec(Date.now() / 1000), intervalMs)
    return () => clearInterval(id)
  }, [enabled, intervalMs])

  return enabled ? tickNowSec : Date.now() / 1000
}
