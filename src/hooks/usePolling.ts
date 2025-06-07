import { useEffect, useRef } from "react"

interface UsePollingOptions {
  callback: () => void
  interval: number
  runImmediately?: boolean 
}

export const usePolling = ({
  callback,
  interval,
  runImmediately = true,     // to debug add setTimeout here like setTimeout(() => savedCallback.current(), 2000)
}: UsePollingOptions) => {
  const savedCallback = useRef<() => void>()
  // store interval ref
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  
  useEffect(() => {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] [usePolling] Effect running`, { interval, runImmediately })

    // clear existing interval before creating new one
    if (intervalRef.current) {
      console.log(`[${timestamp}] [usePolling] Clearing existing interval`)
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // validate interval is positive
    if (!interval || interval <= 0) {
      console.log(`[${timestamp}] [usePolling] Invalid interval`)
      return undefined
    }

    if (runImmediately && savedCallback.current) {
      console.log(`[${timestamp}] [usePolling] Running immediately`)
      savedCallback.current()
    }

    // set the polling interval
    console.log(`[${timestamp}] [usePolling] Setting up interval`)
    intervalRef.current = setInterval(() => {
      const tickTimestamp = new Date().toISOString()
      console.log(`[${tickTimestamp}] [usePolling] Interval tick`)
      if (savedCallback.current) {
        savedCallback.current()
      }
    }, interval)

    // cleanup function to clear interval when effect reruns or unmounts
    return () => {
      const cleanupTimestamp = new Date().toISOString()
      console.log(`[${cleanupTimestamp}] [usePolling] Cleanup running`)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [interval, runImmediately])

  return null
}
