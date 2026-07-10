import { useEffect, useState } from "react"

export const useNow = (intervalMs = 60_000) => {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now())
    }, intervalMs)

    return () => window.clearInterval(interval)
  }, [intervalMs])

  return now
}
